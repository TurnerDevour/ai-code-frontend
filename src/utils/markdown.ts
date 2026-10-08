import MarkdownIt from 'markdown-it'
import hljs from 'highlight.js/lib/core'
import css from 'highlight.js/lib/languages/css'
import javascript from 'highlight.js/lib/languages/javascript'
import xml from 'highlight.js/lib/languages/xml'
import 'highlight.js/styles/github.css'
import { normalizeCodeFences } from './codeFence'

// 只注册用到的语言，避免把 highlight.js 全量语言包打进产物
// （xml 已覆盖 html/xhtml/svg 别名，javascript 已覆盖 js/jsx 别名）
hljs.registerLanguage('xml', xml)
hljs.registerLanguage('css', css)
hljs.registerLanguage('javascript', javascript)

const markdown = new MarkdownIt({
  // 不解析原始 HTML：AI 输出里的标签按纯文本展示，避免注入风险
  html: false,
  linkify: true,
  // 单个换行也换行，更贴合流式对话的观感
  breaks: true,
  highlight: (code, lang) => {
    if (!lang || !hljs.getLanguage(lang)) {
      // 返回空串表示交给 markdown-it 默认转义渲染
      return ''
    }
    try {
      const { value } = hljs.highlight(code, { language: lang, ignoreIllegals: true })
      return `<pre class="hljs"><code class="language-${lang}">${value}</code></pre>`
    } catch {
      return ''
    }
  },
})

// 文档里的链接统一新窗口打开，避免在对话页里被跳走
const defaultLinkOpen = markdown.renderer.rules.link_open
markdown.renderer.rules.link_open = (tokens, idx, options, env, self) => {
  tokens[idx].attrSet('target', '_blank')
  tokens[idx].attrSet('rel', 'noopener noreferrer')
  return defaultLinkOpen
    ? defaultLinkOpen(tokens, idx, options, env, self)
    : self.renderToken(tokens, idx, options)
}

/**
 * 渲染前先规整代码围栏：模型偶尔把语言标签和代码写在同一行，按 CommonMark 整行都算 info string，
 * 代码体变空 → 出现「空白代码块」（详见 utils/codeFence.ts）。
 */
export const renderMarkdown = (content?: string) =>
  markdown.render(normalizeCodeFences(content ?? ''))
