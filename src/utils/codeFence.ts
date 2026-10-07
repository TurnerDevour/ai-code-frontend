/**
 * 代码围栏（```）容错处理。
 *
 * 背景（实测）：模型在推理/续写时偶尔会把开栏和第一行代码粘在同一行，例如
 *
 *     ```jsconst line = new THREE.LineLoop(geo, mat)
 *     ```
 *
 * 按 CommonMark 规则，开栏之后的<b>整行</b>都是 info string（语言标签），因此代码体变成空，
 * 页面上只剩一个空白代码块——用户看到的就是「LineLoop 那段内容是空白的」，而周围内容都正常。
 * 这类粘连属于模型输出的格式瑕疵（同一批输出里还会出现 `animationIdonMounted` 这种语句粘连），
 * 无法靠提示词稳定约束，因此在渲染前做一次容错：把语言标签裁出来，剩余内容换到下一行，
 * 保证代码内容一个字都不丢。
 *
 * 刻意保持"保守"：只处理"内容与语言标签之间没有换行"这一种明确异常，
 * 正常的围栏（含 `title=xxx`、`{1,3}` 这类 info string 属性）原样保留。
 */

/**
 * 已知语言标签（按长度从长到短匹配，保证 python 不会被认成 py、javascript 不会被认成 java）
 * 覆盖 highlight.js 已注册的 xml/css/javascript 及其别名，再补上常见的生成语言
 */
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

/** 单个标识符形态的语言标签 */
const LANGUAGE_PATTERN = /^[A-Za-z][A-Za-z0-9+#._-]*$/

/** 切分结果 */
export interface SplitFenceInfo {
  /** 语言标签（可能为空串，表示语言未知） */
  lang: string
  /** 应当换到下一行的代码内容 */
  code: string
}

/** 是否是已知语言（大小写不敏感） */
const isKnownLanguage = (lang: string): boolean => KNOWN_LANGUAGES.includes(lang.toLowerCase())

/**
 * 取出"已知语言"里最长的一个前缀
 *
 * `jsconst line = 1` 要能切成 `js` + `const line = 1`，因此这里按长度倒序找前缀。
 */
const longestKnownLanguagePrefix = (text: string): string => {
  const lower = text.toLowerCase()
  for (const lang of KNOWN_LANGUAGES) {
    if (lower.startsWith(lang)) {
      return text.slice(0, lang.length)
    }
  }
  return ''
}

/**
 * 单字母语言（c / r）只有在后面跟着非标识符字符时才算命中
 *
 * 否则 `configs = []` 这种内容会被当成 "c" + "onfigs = []"，把语言标签认错。
 */
const isAcceptableGluedMatch = (lang: string, combined: string): boolean => {
  if (lang.length >= 2) {
    return true
  }
  const next = combined.charAt(lang.length)
  return next !== '' && !/[A-Za-z0-9_$]/.test(next)
}

/** 判断内容是否像 info string 的属性（`title=app.js`、`{1,3}`），这类内容不能当代码搬走 */
const looksLikeFenceAttribute = (text: string): boolean =>
  /^[A-Za-z_][\w-]*=/.test(text) || text.startsWith('{')

/** 是否以空白开头 */
const startsWithWhitespace = (text: string): boolean => /^[ \t]/.test(text)

/**
 * 把"语言标签 + 同一行内容"拆成语言与代码
 *
 * @param info 语言标签解析结果（` ```jsconst x` 里是 `jsconst`）
 * @param rest 同一行剩下的内容（` ```jsconst x` 里是 `const x`）
 * @returns 需要拆开时返回语言与代码；判断为正常 info string 时返回 null（调用方保持原样）
 */
export const splitFenceInfo = (info: string, rest: string): SplitFenceInfo | null => {
  const combined = `${info}${rest}`
  if (!combined) {
    return null
  }
  // 1）语言标签与内容之间连分隔符都没有：`jsconst x = 1`
  const glued = longestKnownLanguagePrefix(combined)
  if (glued && glued.length < combined.length && isAcceptableGluedMatch(glued, combined)) {
    const code = combined.slice(glued.length)
    // 走到这里 code 一定非空；以空白开头说明其实是 `js title=app.js` 这类 info string，
    // 交给第 2 条分支按属性规则判断
    if (!startsWithWhitespace(code) && !looksLikeFenceAttribute(code)) {
      return { lang: glued, code }
    }
  }
  // 2）语言标签后跟空白再接代码：`js const x = 1`
  //    只在"首词是已知语言"且"剩余部分不像属性"时才切，避免误伤 `js title=app.js`
  const spaced = /^([A-Za-z][A-Za-z0-9+#._-]*)[ \t]+([\s\S]+)$/.exec(combined)
  if (spaced && isKnownLanguage(spaced[1]) && !looksLikeFenceAttribute(spaced[2])) {
    return { lang: spaced[1], code: spaced[2] }
  }
  // 3）未知语言且内容紧贴在标签后面：`svelte<div>`
  //    首个标识符整体当语言，内容原样换行——仍然不丢代码。
  //    要求"紧贴"（rest 不以空白开头），否则 ` ```My Title` 这种正常 info string 会被切开
  if (info && LANGUAGE_PATTERN.test(info) && rest && !startsWithWhitespace(rest)) {
    return { lang: info, code: rest }
  }
  return null
}

/**
 * 规整内容里的代码围栏：把"粘在同一行的语言标签与代码"拆开
 *
 * @param content Markdown 原文
 * @returns 规整后的 Markdown 原文（没有粘连时原样返回）
 */
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
