// DSH css modules 转换（gen-styles 与 build 插件共用）：
// 把 `.module.css` 的局部类名重写为 `dshmd_<file>_<local>`，`:global(...)` 内部保持原样。
// 注入 shadow DOM 时 `:global()` 不是合法伪类，输出时直接剥壳只留内部选择器。

const PREFIX = 'dshmd_'

export function localName(fileBase, name) {
  return `${PREFIX}${fileBase}_${name}`
}

/**
 * @param {string} css module css 源文本
 * @param {string} fileBase 文件名去扩展名（basenames 全局唯一，无需路径）
 * @returns {{ css: string, exports: Record<string, string> }} 重写后的 css 与 类名映射
 */
export function transformModuleCss(css, fileBase) {
  const globals = []
  let text = css.replace(/:global\(([^()]*)\)/g, (_, inner) => {
    globals.push(inner)
    return `\u0000G${globals.length - 1}\u0000`
  })
  const exports = {}
  text = text.replace(/\.([A-Za-z_][A-Za-z0-9_-]*)/g, (_, name) => {
    exports[name] = localName(fileBase, name)
    return `.${PREFIX}${fileBase}_${name}`
  })
  text = text.replace(/\u0000G(\d+)\u0000/g, (_, i) => globals[+i])
  return { css: text, exports }
}

/**
 * 主题 token 表（design-platform.css / shiki.css）的 shadow DOM 适配：
 * - `body {` / `:root {` → `:host {`（token 挂到 host，var() 链在同作用域内解析；
 *   :root 在 shadow tree 中不匹配任何元素，必须一并改写）
 * - 暗色块选择器换成永不匹配的 `:host([data-ds-dark-theme])`（面板仅浅色）
 * @param {string} css
 */
export function adaptTokenSheet(css) {
  return css
    .replace(/(^|\n)(\s*)body(\s*\{)/g, '$1$2:host$3')
    .replace(/(^|\n)(\s*):root(\s*\{)/g, '$1$2:host$3')
    .replace(/body\[data-ds-dark-theme\]/g, ':host([data-ds-dark-theme])')
}
