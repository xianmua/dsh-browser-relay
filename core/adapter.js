// DSH 渲染适配层：把 ui-primitives 的 MarkdownText（mdast + shiki + KaTeX 管线）
// 挂到面板 DOM。样式整体注入 shadow root；```dsh-ui 围栏从 md 源切分后交还调用方
// （loader 的 buildGenuiFrame）渲染 sandbox iframe。

import { createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { MarkdownText } from './ui-primitives/markdown/MarkdownText.tsx'
import { DSH_STYLES_CSS } from './styles.generated.js'

// 引用必须稳定：labels 换身份会丢弃 MarkdownText 的流式渲染缓存
export const MD_LABELS = {
  code: { copyLabel: "复制", copiedLabel: "已复制" },
  footnotes: "脚注",
}

let injected = false
/** 把 DSH 全量样式注入 shadow root（每个宿主页只做一次） */
export function injectDshStyles(shadow) {
  if (injected) return
  injected = true
  const style = document.createElement("style")
  style.textContent = DSH_STYLES_CSS
  shadow.appendChild(style)
}

/**
 * 把 ```dsh-ui 围栏从 markdown 源文本切分出来。
 * @param {string} text
 * @returns {Array<{ kind: "md" | "genui", text: string }>} genui 段的 text 是围栏内 JSON 源
 */
export function splitFences(text) {
  const src = String(text)
  const lines = src.split("\n")
  const out = []
  let md = [] // 当前 md 段累积的行
  let i = 0
  const pushMd = () => {
    if (md.length) out.push({ kind: "md", text: md.join("\n") })
    md = []
  }
  while (i < lines.length) {
    const m = lines[i].match(/^(\s*)(`{3,})[ \t]*dsh-ui\b[^\n]*$/)
    if (m) {
      pushMd()
      const openMark = m[2]
      let close = -1
      for (let j = i + 1; j < lines.length; j++) {
        if (new RegExp("^" + openMark + "+$").test(lines[j].trim())) { close = j; break }
      }
      const body = close === -1 ? lines.slice(i + 1) : lines.slice(i + 1, close)
      out.push({ kind: "genui", text: body.join("\n") })
      if (close === -1) i = lines.length
      else i = close + 1
    } else {
      md.push(lines[i])
      i++
    }
  }
  pushMd()
  return out
}

const roots = new WeakMap()

/**
 * 用 DSH 渲染管线把 markdown 渲染进 el（每个步骤元素一次性渲染；
 * 重复调用会先卸载重建）。```dsh-ui 围栏段交给 onFence(specText)，
 * 返回的节点直接插入文档流，返回 undefined 时跳过。
 * 样式自动注入 el 所在的 shadow root（core 独立产物按需加载，注入点由本函数托管）。
 * @param {HTMLElement} el
 * @param {string} text
 * @param {((specText: string) => Node | undefined) | undefined} onFence
 */
export function renderDshMd(el, text, onFence) {
  const rootNode = el.getRootNode?.()
  if (rootNode && rootNode.host) injectDshStyles(rootNode)
  const prev = roots.get(el)
  if (prev) {
    for (const r of prev) r.unmount()
    el.replaceChildren()
  }
  const created = []
  for (const seg of splitFences(text)) {
    if (seg.kind === "genui") {
      const node = onFence?.(seg.text)
      if (node) el.appendChild(node)
      else {
        // 残缺/流式中的 spec 或无 onFence：按普通围栏代码块回退
        const pre = document.createElement("pre")
        const code = document.createElement("code")
        code.className = "language-dsh-ui"
        code.textContent = seg.text
        pre.appendChild(code)
        el.appendChild(pre)
      }
    } else if (seg.text.trim()) {
      const box = document.createElement("div")
      const root = createRoot(box)
      root.render(createElement(MarkdownText, { text: seg.text, labels: MD_LABELS }))
      created.push(root)
      el.appendChild(box)
    }
  }
  roots.set(el, created)
  return created
}

/** 卸载 el 上挂的 React root（新会话清空消息区时调用，避免 root 泄漏） */
export function unmountDshRd(el) {
  const prev = roots.get(el)
  if (!prev) return
  for (const r of prev) r.unmount()
  roots.delete(el)
}
