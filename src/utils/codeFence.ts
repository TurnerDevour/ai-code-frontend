/**
 * 代码围栏（```）容错。
 *
 * 模型偶尔把开栏和第一行代码粘在同一行，例如：
 *
 *     ```jsconst line = new THREE.LineLoop(geo, mat)
 *
 * 按 CommonMark 规则，开栏之后的整行都算 info string（语言标签），代码体变空，
 * 页面上只剩一个空白代码块。这类粘连是模型输出的格式瑕疵，提示词约束不住，
 * 所以渲染前做一次容错：裁出语言标签、剩余内容换到下一行，保证代码一个字都不丢。
 * 只处理"标签与内容之间没有换行"这一种异常，正常围栏（含 `title=xxx`、`{1,3}` 属性）原样保留。
 */

/** 已知语言标签，按长度倒序保证 python 不会被认成 py、javascript 不会被认成 java */
const KNOWN_LANGUAGES = [
  'javascript', 'typescript', 'plaintext', 'powershell', 'markdown', 'dockerfile',
  'objectivec', 'protobuf', 'terraform', 'stylus', 'graphql', 'postgres', 'haskell',
  'clojure', 'fortran', 'pascal', 'groovy', 'gradle', 'matlab', 'erlang', 'scheme',
  'python', 'kotlin', 'golang', 'csharp', 'swift', 'scala', 'elixir', 'svelte',
  'angular', 'nginx', 'apache', 'mysql', 'shell', 'scss', 'sass', 'less',
  'xhtml', 'html', 'http', 'diff', 'patch', 'wasm', 'proto', 'props', 'bash', 'zsh',
  'ruby', 'rust', 'java', 'json', 'yaml', 'toml', 'text', 'txt', 'php',
  'cpp', 'c++', 'css', 'xml', 'svg', 'vue', 'jsx', 'tsx', 'mdx', 'csv', 'env',
  'ini', 'log', 'yml', 'htm', 'sql', 'ts', 'js', 'go', 'rs', 'kt', 'py',
  'rb', 'sh', 'cs', 'md', 'ex', 'hs', 'r', 'c',
].sort((a, b) => b.length - a.length)

/** 围栏行：缩进 + 围栏符 + 语言标签（可空）+ 同一行剩余内容 */
const FENCE_LINE_PATTERN = /^(\s*)(`{3,}|~{3,})([^\s`~]*)(.*)$/

const LANGUAGE_PATTERN = /^[A-Za-z][A-Za-z0-9+#._-]*$/

export interface SplitFenceInfo {
  /** 语言标签，空串表示未知 */
  lang: string
  code: string
}

const isKnownLanguage = (lang: string): boolean => KNOWN_LANGUAGES.includes(lang.toLowerCase())

/** 取"已知语言"里最长的前缀：`jsconst line = 1` 要能切成 `js` + `const line = 1`（依赖上面的长度倒序） */
const longestKnownLanguagePrefix = (text: string): string => {
  const lower = text.toLowerCase()
  for (const lang of KNOWN_LANGUAGES) {
    if (lower.startsWith(lang)) {
      return text.slice(0, lang.length)
    }
  }
  return ''
}

/** 单字母语言（c / r）后面必须跟非标识符字符，否则 `configs = []` 会被切成 `c` + `onfigs = []` */
const isAcceptableGluedMatch = (lang: string, combined: string): boolean => {
  if (lang.length >= 2) {
    return true
  }
  const next = combined.charAt(lang.length)
  return next !== '' && !/[A-Za-z0-9_$]/.test(next)
}

/** info string 属性（`title=app.js`、`{1,3}`）不能当代码搬走 */
const looksLikeFenceAttribute = (text: string): boolean =>
  /^[A-Za-z_][\w-]*=/.test(text) || text.startsWith('{')

const startsWithWhitespace = (text: string): boolean => /^[ \t]/.test(text)

/** 拆开"语言标签 + 同一行内容"：需要拆时返回语言与代码，属正常 info string 则返回 null（调用方保持原样） */
export const splitFenceInfo = (info: string, rest: string): SplitFenceInfo | null => {
  const combined = `${info}${rest}`
  if (!combined) {
    return null
  }
  // 1）语言标签与内容之间连分隔符都没有：`jsconst x = 1`
  const glued = longestKnownLanguagePrefix(combined)
  if (glued && glued.length < combined.length && isAcceptableGluedMatch(glued, combined)) {
    const code = combined.slice(glued.length)
    // 以空白开头说明其实是 `js title=app.js` 这类 info string，交给下面的属性规则判断
    if (!startsWithWhitespace(code) && !looksLikeFenceAttribute(code)) {
      return { lang: glued, code }
    }
  }
  // 2）标签后跟空白再接代码：`js const x = 1`；只在首词是已知语言且剩余不像属性时才切，避免误伤 `js title=app.js`
  const spaced = /^([A-Za-z][A-Za-z0-9+#._-]*)[ \t]+([\s\S]+)$/.exec(combined)
  if (spaced && isKnownLanguage(spaced[1]) && !looksLikeFenceAttribute(spaced[2])) {
    return { lang: spaced[1], code: spaced[2] }
  }
  // 3）未知语言且内容紧贴标签：`svelte<div>`；要求 rest 不以空白开头，否则 ` ```My Title` 这类正常 info string 会被切开
  if (info && LANGUAGE_PATTERN.test(info) && rest && !startsWithWhitespace(rest)) {
    return { lang: info, code: rest }
  }
  return null
}

/** 规整内容里的代码围栏：把粘在同一行的语言标签与代码拆开（无粘连时原样返回） */
export const normalizeCodeFences = (content: string): string => {
  if (!content || (!content.includes('```') && !content.includes('~~~'))) {
    return content
  }
  return content
    .split('\n')
    .map((line) => {
      const match = FENCE_LINE_PATTERN.exec(line.replace(/\r$/, ''))
      if (!match) {
        return line
      }
      const [, indent, fence, info, rest] = match
      // 语言标签后没有内容 = 正常的开栏或闭栏
      if (!rest) {
        return line
      }
      const split = splitFenceInfo(info, rest)
      if (!split) {
        return line
      }
      return `${indent}${fence}${split.lang}\n${split.code}`
    })
    .join('\n')
}
