// 生成 styles.generated.js：把 DSH 渲染所需的全部 css（katex + 主题 token + shiki token +
// 全部 module css 重写版）合成一份文本，运行时整体注入 shadow root。
// 每次 ui-primitives 源码或主题 css 变更后需重跑：node core/gen-styles.mjs
// build.mjs 已在构建前自动执行，无需手动跑。

import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { transformModuleCss, adaptTokenSheet } from './css-transform.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, '..') // 项目根
const PRIM = join(HERE, 'ui-primitives')

/** 递归收集目录下所有 *.module.css */
function moduleCssFiles(dir) {
  const out = []
  for (const name of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, name.name)
    if (name.isDirectory()) out.push(...moduleCssFiles(p))
    else if (name.name.endsWith('.module.css')) out.push(p)
  }
  return out
}

const parts = []

// 1. katex（数学公式排版；fonts 的 url() 在 shadow DOM 里会静默失败，接受字体降级）
parts.push('/* --- katex --- */')
parts.push(readFileSync(join(ROOT, 'node_modules', 'katex', 'dist', 'katex.min.css'), 'utf8'))

// 2. DSH 基础 token + 主题 token + shiki token（body/:root 选择器改 :host，暗色块剔除）
parts.push('/* --- DSH base tokens (base.css) --- */')
parts.push(adaptTokenSheet(readFileSync(join(HERE, 'base.css'), 'utf8')))
parts.push('/* --- DSH theme tokens (design-platform.css) --- */')
parts.push(adaptTokenSheet(readFileSync(join(HERE, 'theme.css'), 'utf8')))
parts.push('/* --- shiki token sheet --- */')
parts.push(adaptTokenSheet(readFileSync(join(HERE, 'shiki.css'), 'utf8')))

// 3. 全部 module css（实际仅 markdown 子树 4 个会被 import，多注入的无害）
parts.push('/* --- ui-primitives css modules (class names rewritten) --- */')
for (const file of moduleCssFiles(PRIM)) {
  const base = file.replace(/\\/g, '/').split('/').pop().replace(/\.module\.css$/, '')
  const { css } = transformModuleCss(readFileSync(file, 'utf8'), base)
  parts.push(`/* ${base} */\n${css}`)
}

const cssText = parts.join('\n')
const js = `// 由 gen-styles.mjs 生成，勿手改。DSH 渲染全量样式（katex + 主题 + shiki + module css）。
export const DSH_STYLES_CSS = ${JSON.stringify(cssText)};
`
writeFileSync(join(HERE, 'styles.generated.js'), js)
console.log(`gen-styles: ${(cssText.length / 1024).toFixed(1)}kb css -> styles.generated.js`)
