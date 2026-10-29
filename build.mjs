// 双产物构建（esbuild JS API）：
//   page.js  (IS_EXT=false) → panel/dsh-assistant.min.js    页面版免装接入
//   ext.js   (IS_EXT=true)  → extension/content/loader.js   扩展版 content script
// 另出渲染核心独立产物（react+shiki+katex+ui-primitives，运行时按需加载）：
//   core-entry.js (esm)     → panel/dsh-md-core.js（全量语法）
//                             extension/core/dsh-md-core.js（裁剪懒加载语法）
// 支持 core/ 下 tsx/ts 与 css modules（类名重写为 dshmd_<file>_<local>）。
// 构建前先跑 gen-styles.mjs 生成样式。

import { build } from 'esbuild'
import { readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { transformModuleCss } from './core/css-transform.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const { version } = JSON.parse(readFileSync(join(HERE, 'package.json'), 'utf8'))

spawnSync(process.execPath, [join(HERE, 'core/gen-styles.mjs')], { stdio: 'inherit' })

/** css modules → 默认导出类名映射对象（类名全局重写，样式文本由 styles.generated.js 注入） */
const cssModulesPlugin = {
  name: 'dshmd-css-modules',
  setup(b) {
    b.onLoad({ filter: /\.module\.css$/ }, async (args) => {
      const base = args.path.replace(/\\/g, '/').split('/').pop().replace(/\.module\.css$/, '')
      const { exports } = transformModuleCss(readFileSync(args.path, 'utf8'), base)
      return { contents: `export default ${JSON.stringify(exports)}`, loader: 'js' }
    })
    // katex css 由 styles.generated.js 统一注入，避免 esbuild 吐独立 css 文件
    b.onLoad({ filter: /katex\.min\.css$/ }, async () => ({ contents: '', loader: 'js' }))
  },
}

const common = {
  bundle: true,
  minify: true,
  format: 'iife',
  target: ['es2020'],
  jsx: 'automatic',
  jsxImportSource: 'react',
  define: {
    'process.env.NODE_ENV': '"production"',
    __DSHMD_LAZY_LANGS__: 'true',
    __PANEL_VERSION__: JSON.stringify(version), // 面板设置里亮出版本号，排查「改动没生效」
  },
  alias: {
    // micromark-extension-math 自带了一份不同版本的 katex，统一到同一份避免双倍体积
    katex: join(HERE, 'node_modules/katex'),
  },
  plugins: [cssModulesPlugin],
  logLevel: 'info',
}

// 渲染核心独立产物：esm、自包含，loader.js 运行时动态加载
await build({
  ...common,
  entryPoints: [join(HERE, 'core/core-entry.js')],
  format: 'esm',
  outfile: join(HERE, 'panel/dsh-md-core.js'),
})
await build({
  ...common,
  entryPoints: [join(HERE, 'core/core-entry.js')],
  format: 'esm',
  define: { ...common.define, __DSHMD_LAZY_LANGS__: 'false' }, // 扩展版每页注入场景，裁懒加载语法
  outfile: join(HERE, 'extension/core/dsh-md-core.js'),
})

await build({
  ...common,
  entryPoints: [join(HERE, 'web-panel/src/page.js')],
  define: { ...common.define, IS_EXT: 'false' },
  globalName: 'DshAssistant',
  outfile: join(HERE, 'panel/dsh-assistant.min.js'),
})

await build({
  ...common,
  entryPoints: [join(HERE, 'web-panel/src/ext.js')],
  define: { ...common.define, IS_EXT: 'true', __DSHMD_LAZY_LANGS__: 'false' }, // content script 每页注入，裁掉懒加载语法控体积
  outfile: join(HERE, 'extension/content/loader.js'),
})
