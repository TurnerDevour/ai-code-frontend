/**
 * 可视化编辑（点选预览页元素）相关工具
 *
 * 生成的网站不带编辑器逻辑，因此由主站把编辑脚本注入预览 iframe 的文档（要求同源，才能拿到
 * contentDocument）：脚本负责悬浮高亮与点击选中，通过 postMessage 与主站互传选中信息和
 * 「开启 / 关闭编辑模式」「清除选中」指令。不同源时无法注入，走 onUnavailable 回调通知调用方降级。
 */

/** 主站与预览页约定的消息来源标识，避免误处理其它窗口的消息 */
const VISUAL_EDITOR_SOURCE = 'ai-code-visual-editor'

/** 注入脚本的 script 标签 id（同一份文档只注入一次） */
const SCRIPT_ELEMENT_ID = 'ai-code-visual-editor-script'

/** 预览文档上挂载编辑脚本 api 的属性名（判断「这份文档」是否已安装，window 会被复用不可靠） */
const VISUAL_EDITOR_HOST_KEY = '__AI_CODE_VISUAL_EDITOR__'

/** 主站 -> 预览页的指令类型 */
const OUTBOUND_TYPE = {
  /** 开启编辑模式 */
  ENABLE: 'enable',
  /** 关闭编辑模式（同时清除已选中的元素） */
  DISABLE: 'disable',
  /** 仅清除已选中的元素，保留编辑模式 */
  CLEAR: 'clear',
} as const

/** 预览页 -> 主站的消息类型 */
const INBOUND_TYPE = {
  /** 编辑脚本就绪（注入成功） */
  READY: 'ready',
  /** 用户选中了某个元素 */
  SELECT: 'select',
  /** 编辑模式指令的执行回执 */
  ENABLED: 'enabled',
} as const

/** 等待预览页回执的超时时间：超时说明编辑脚本没跑起来，需要提示用户 */
const ACK_TIMEOUT = 600

/** 预览页中被选中的元素信息（由 iframe 内的编辑脚本采集后回传） */
export interface VisualEditorElement {
  /** 标签名，小写，如 button */
  tagName: string
  /** 元素 id，没有则为空串 */
  id: string
  /** 元素 class 原始字符串 */
  className: string
  /** 由祖先链拼出的选择器，如 #app > .header > button.btn */
  selector: string
  /** 元素文本（空白已折叠并截断） */
  text: string
  /** outerHTML 摘要（已截断） */
  html: string
}

/** 预览页回传的消息体 */
interface VisualEditorMessage {
  source?: string
  type?: string
  element?: Partial<VisualEditorElement>
  /** 回执里带的编辑模式状态 */
  enabled?: boolean
}

/** 可视化编辑无法开启的原因 */
export type VisualEditorFailureReason =
  /** 预览 iframe 还没挂载 */
  | 'no-iframe'
  /** 预览页与主站不同源，无法注入编辑脚本 */
  | 'cross-origin'
  /** 预览文档还没准备好（还在加载） */
  | 'not-ready'
  /** 脚本已插入但没执行（如被预览页的 CSP 拦截） */
  | 'blocked'
  /** 指令下发后预览页没有回执，说明编辑脚本没跑起来 */
  | 'no-ack'

/** 把失败原因转成给用户看的提示文案 */
export const describeVisualEditorFailure = (reason: VisualEditorFailureReason) => {
  if (reason === 'cross-origin') {
    return '预览页面与当前站点不同源，无法开启可视化编辑'
  }
  if (reason === 'blocked') {
    return '预览页面阻止了编辑脚本执行，无法开启可视化编辑'
  }
  if (reason === 'no-iframe' || reason === 'not-ready') {
    return '预览页面还没有加载完成，请点击「刷新预览」后重试'
  }
  return '编辑脚本没有生效，请点击「刷新预览」后重试'
}

/** 创建可视化编辑器时可选的业务回调 */
interface VisualEditorOptions {
  /** 用户在预览页点选元素时回调 */
  onSelect: (element: VisualEditorElement) => void
  /** 无法开启编辑模式时回调，调用方据此提示用户（页面不做静默失败） */
  onUnavailable?: (reason: VisualEditorFailureReason) => void
  /** 预览文档（重新）加载并注入脚本后回调：此时上一次的选中元素已失效 */
  onDocumentReady?: () => void
}

/** 可视化编辑器控制器 */
export interface VisualEditorController {
  /** 绑定预览 iframe（传 null 解绑）；预览刷新重建 iframe 后需要重新绑定 */
  attach: (iframe: HTMLIFrameElement | null) => void
  /** 开启 / 关闭编辑模式，关闭时会一并清除预览页中的选中元素 */
  setEnabled: (enabled: boolean) => void
  /** 清除预览页中已选中的元素（保留编辑模式） */
  clearSelection: () => void
  /** 解绑并释放全部监听（组件卸载时调用） */
  destroy: () => void
}

/**
 * 注入到预览页的编辑脚本（自执行函数）
 *
 * 用 String.raw 包裹：脚本里的正则（\s 等）原样保留，不需要二次转义；
 * 因此脚本内部不要使用模板字符串与 `${}`，字符串拼接一律用 + 完成。
 */
const VISUAL_EDITOR_SCRIPT = String.raw`
(function () {
  // 标记挂在 document 上而非 window：about:blank 切到真实页面时 window 会被复用，
  // 只判断 window 会把新文档误判成「已注入」，实际没有监听器（表现为点元素没反应）
  if (document.__AI_CODE_VISUAL_EDITOR__) {
    return
  }

  // window 被复用时，先释放上一份文档残留的监听，避免旧实例继续回执
  var previousApi = window.__AI_CODE_VISUAL_EDITOR__
  if (previousApi && typeof previousApi.dispose === 'function') {
    previousApi.dispose()
  }

  var SOURCE = 'ai-code-visual-editor'
  // 悬浮：浅蓝虚线；选中：加深的实线 + 外发光，一直保留到取消选中
  var HOVER_STYLE = { outline: '2px dashed #7cb3ff', 'outline-offset': '0px', cursor: 'pointer' }
  var SELECTED_STYLE = {
    outline: '2px solid #1671e6',
    'outline-offset': '0px',
    'box-shadow': '0 0 0 3px rgba(22, 119, 255, 0.22)',
    cursor: 'pointer',
  }
  // 会被临时改写的行内样式，取消高亮时按快照还原，避免污染页面自身样式
  var PAINTED_PROPS = ['outline', 'outline-offset', 'box-shadow', 'cursor']
  var MAX_TEXT_LENGTH = 80
  var MAX_HTML_LENGTH = 240
  var MAX_SELECTOR_DEPTH = 8

  var enabled = false
  var hoveredElement = null
  var selectedElement = null
  // 元素 -> { 属性: { value, priority } }，记录改写前的行内样式
  var styleSnapshots = new Map()

  function paint(element, style) {
    if (!styleSnapshots.has(element)) {
      var snapshot = {}
      PAINTED_PROPS.forEach(function (prop) {
        snapshot[prop] = {
          value: element.style.getPropertyValue(prop),
          priority: element.style.getPropertyPriority(prop),
        }
      })
      styleSnapshots.set(element, snapshot)
    }
    Object.keys(style).forEach(function (prop) {
      // 用 important 写入，避免被预览页自身的样式覆盖
      element.style.setProperty(prop, style[prop], 'important')
    })
  }

  function unpaint(element) {
    var snapshot = styleSnapshots.get(element)
    if (!snapshot) {
      return
    }
    styleSnapshots.delete(element)
    PAINTED_PROPS.forEach(function (prop) {
      var saved = snapshot[prop]
      if (saved.value) {
        element.style.setProperty(prop, saved.value, saved.priority)
      } else {
        element.style.removeProperty(prop)
      }
    })
  }

  function clearHover() {
    if (hoveredElement) {
      unpaint(hoveredElement)
      hoveredElement = null
    }
  }

  function clearSelection() {
    if (selectedElement) {
      unpaint(selectedElement)
      selectedElement = null
    }
    clearHover()
  }

  function truncate(value, maxLength) {
    var text = String(value == null ? '' : value)
    return text.length > maxLength ? text.slice(0, maxLength) + '…' : text
  }

  // 选择器：有 id 直接用 id 定位，否则按「标签 + 前两个 class」逐级向上拼，最多 MAX_SELECTOR_DEPTH 层
  function buildSelector(element) {
    var parts = []
    var node = element
    var truncated = false
    while (node && node.nodeType === 1) {
      var part = node.tagName.toLowerCase()
      if (node.id) {
        parts.unshift(part + '#' + node.id)
        break
      }
      var classes = String(node.getAttribute('class') || '')
        .trim()
        .split(/\s+/)
        .filter(Boolean)
      if (classes.length) {
        part += '.' + classes.slice(0, 2).join('.')
      }
      parts.unshift(part)
      if (parts.length >= MAX_SELECTOR_DEPTH) {
        truncated = Boolean(node.parentElement)
        break
      }
      node = node.parentElement
    }
    return (truncated ? '… > ' : '') + parts.join(' > ')
  }

  function describeElement(element) {
    var text = String(element.innerText || element.textContent || '')
      .replace(/\s+/g, ' ')
      .trim()
    return {
      tagName: element.tagName.toLowerCase(),
      id: element.id || '',
      className: String(element.getAttribute('class') || ''),
      selector: buildSelector(element),
      text: truncate(text, MAX_TEXT_LENGTH),
      html: truncate(element.outerHTML, MAX_HTML_LENGTH),
    }
  }

  function postToParent(type, payload) {
    if (window.parent === window) {
      return
    }
    var message = { source: SOURCE, type: type }
    if (payload) {
      Object.keys(payload).forEach(function (key) {
        message[key] = payload[key]
      })
    }
    // 主站会校验消息来源，这里用 * 兼容预览域名与主站域名写法不一致的情况
    window.parent.postMessage(message, '*')
  }

  function handleMouseOver(event) {
    if (!enabled) {
      return
    }
    var target = event.target
    if (!target || target.nodeType !== 1 || target === selectedElement) {
      return
    }
    if (hoveredElement !== target) {
      clearHover()
      hoveredElement = target
      paint(target, HOVER_STYLE)
    }
  }

  function handleMouseLeave() {
    clearHover()
  }

  function handleClick(event) {
    if (!enabled) {
      return
    }
    var target = event.target
    if (!target || target.nodeType !== 1) {
      return
    }
    // 编辑模式下拦掉页面自身的点击行为（链接跳转、按钮提交等）
    event.preventDefault()
    event.stopPropagation()
    if (typeof event.stopImmediatePropagation === 'function') {
      event.stopImmediatePropagation()
    }
    clearHover()
    if (selectedElement && selectedElement !== target) {
      unpaint(selectedElement)
    }
    selectedElement = target
    paint(target, SELECTED_STYLE)
    postToParent('select', { element: describeElement(target) })
  }

  function setEnabled(value) {
    enabled = Boolean(value)
    clearSelection()
  }

  function handleMessage(event) {
    var data = event.data
    if (!data || data.source !== SOURCE) {
      return
    }
    if (data.type === 'enable') {
      enabled = true
      clearHover()
    } else if (data.type === 'disable') {
      enabled = false
      clearSelection()
    } else if (data.type === 'clear') {
      clearSelection()
    } else {
      return
    }
    // 回执：主站据此确认指令真的生效了，避免「按钮亮了但预览页没反应」的静默失败
    postToParent('enabled', { enabled: enabled })
  }

  document.addEventListener('mouseover', handleMouseOver, true)
  document.addEventListener('mouseleave', handleMouseLeave, true)
  document.addEventListener('click', handleClick, true)
  window.addEventListener('message', handleMessage)

  // 释放监听：window 被复用时，主站在新文档里重新注入前会先调用它
  function dispose() {
    document.removeEventListener('mouseover', handleMouseOver, true)
    document.removeEventListener('mouseleave', handleMouseLeave, true)
    document.removeEventListener('click', handleClick, true)
    window.removeEventListener('message', handleMessage)
  }

  var api = {
    setEnabled: setEnabled,
    clearSelection: clearSelection,
    isEnabled: function () {
      return enabled
    },
    dispose: dispose,
  }
  // document 上的标记用于判断「这份文档」是否已安装；window 上的 api 便于调试与兼容
  document.__AI_CODE_VISUAL_EDITOR__ = api
  window.__AI_CODE_VISUAL_EDITOR__ = api

  // 通知主站脚本已就绪，主站据此补一次编辑模式同步
  postToParent('ready')
})()
`

/** 回传字段统一收敛成字符串，避免预览页传入异常数据时渲染出错 */
const toSafeText = (value: unknown) => (typeof value === 'string' ? value : '')

/** 规整 iframe 回传的元素信息 */
const normalizeElement = (raw: Partial<VisualEditorElement>): VisualEditorElement => ({
  tagName: toSafeText(raw.tagName) || 'div',
  id: toSafeText(raw.id),
  className: toSafeText(raw.className),
  selector: toSafeText(raw.selector),
  text: toSafeText(raw.text),
  html: toSafeText(raw.html),
})

/** 提示条上展示的元素标识：标签名 + id + 前两个 class，如 button#submit.btn.btn-primary */
export const formatVisualEditorElement = (element: VisualEditorElement) => {
  const id = element.id ? `#${element.id}` : ''
  const classes = element.className.trim().split(/\s+/).filter(Boolean).slice(0, 2)
  const suffix = classes.length ? `.${classes.join('.')}` : ''
  return `${element.tagName}${id}${suffix}`
}

/** 把选中的元素信息拼进提示词：AI 需要同时知道「改哪个元素」和「改成什么样」 */
export const buildVisualEditPrompt = (element: VisualEditorElement, prompt: string) => {
  const elementLines = [
    `- 标签：${element.tagName}`,
    element.id ? `- id：${element.id}` : '',
    element.className ? `- class：${element.className}` : '',
    element.selector ? `- 选择器：${element.selector}` : '',
    element.text ? `- 文本：${element.text}` : '',
    element.html ? `- 结构：${element.html}` : '',
  ].filter(Boolean)
  return ['【可视化编辑选中元素】', ...elementLines, '', '【修改需求】', prompt].join('\n')
}

/**
 * 创建可视化编辑器控制器：负责向预览 iframe 注入编辑脚本、同步编辑模式、接收选中元素
 */
export const createVisualEditor = (options: VisualEditorOptions): VisualEditorController => {
  let iframe: HTMLIFrameElement | null = null
  /** 当前编辑模式：预览文档每次重载后都要把该状态同步给新注入的脚本 */
  let enabled = false
  /** 等待预览页回执的定时器 */
  let ackTimer: number | undefined

  const clearAckTimer = () => {
    if (ackTimer !== undefined) {
      window.clearTimeout(ackTimer)
      ackTimer = undefined
    }
  }

  /**
   * 判断「当前这份文档」里是否已装好编辑脚本
   * 与脚本内的判断同理：window 会被复用（about:blank → 真实页面），必须按 document 判断
   */
  const isInjected = (doc: Document | null) =>
    Boolean(doc && (doc as unknown as Record<string, unknown>)[VISUAL_EDITOR_HOST_KEY])

  /** 给预览页下发指令：载荷只有编辑模式开关，不含业务数据，因此目标源用 * */
  const postToIframe = (type: string) => {
    const target = iframe?.contentWindow
    if (!target) {
      return
    }
    target.postMessage({ source: VISUAL_EDITOR_SOURCE, type }, '*')
  }

  /** 把当前编辑模式下发给预览页 */
  const syncEnabledState = () =>
    postToIframe(enabled ? OUTBOUND_TYPE.ENABLE : OUTBOUND_TYPE.DISABLE)

  /**
   * 把编辑脚本注入预览文档
   * @returns ok=true 表示脚本已就绪；ok=false 时 reason 说明失败原因
   */
  const injectScript = (): { ok: true } | { ok: false; reason: VisualEditorFailureReason } => {
    const target = iframe
    // iframe 已被卸载（如预览刷新、切换应用）时不能按跨域处理，否则会误报原因
    if (!target || !target.isConnected) {
      return { ok: false, reason: 'no-iframe' }
    }
    let win: Window | null = null
    let doc: Document | null = null
    try {
      win = target.contentWindow
      // 跨域访问 contentDocument 会抛出安全异常，这里统一按「不可编辑」处理
      doc = target.contentDocument ?? win?.document ?? null
    } catch {
      doc = null
    }
    if (!win || !doc) {
      return { ok: false, reason: 'cross-origin' }
    }
    if (isInjected(doc)) {
      return { ok: true }
    }
    const container = doc.body ?? doc.documentElement
    if (!container) {
      // 文档还没解析出根节点，交给 load 事件处理
      return { ok: false, reason: 'not-ready' }
    }
    const script = doc.createElement('script')
    script.id = SCRIPT_ELEMENT_ID
    script.textContent = VISUAL_EDITOR_SCRIPT
    container.appendChild(script)
    if (!isInjected(doc)) {
      // 标签插进去了却没执行：多半是预览页的 CSP 拦掉了内联脚本
      console.warn('[visual-editor] 编辑脚本未执行，可能被预览页的 CSP 拦截')
      return { ok: false, reason: 'blocked' }
    }
    options.onDocumentReady?.()
    return { ok: true }
  }

  /** 注入脚本并把当前编辑模式同步过去（attach、预览刷新时调用，失败不打扰用户） */
  const injectAndSync = () => {
    if (injectScript().ok) {
      syncEnabledState()
    }
  }

  /**
   * 开始等待预览页回执：收不到说明编辑脚本没生效，
   * 必须回滚编辑模式并提示用户，避免出现「按钮亮着但点元素没反应」
   */
  const startAckTimer = () => {
    clearAckTimer()
    ackTimer = window.setTimeout(() => {
      ackTimer = undefined
      enabled = false
      console.warn('[visual-editor] 预览页未响应编辑指令，编辑脚本可能未生效')
      options.onUnavailable?.('no-ack')
    }, ACK_TIMEOUT)
  }

  /** 预览页每次加载（含内部跳转）都会重建文档，需要重新注入脚本 */
  const handleIframeLoad = () => {
    const result = injectScript()
    if (result.ok) {
      syncEnabledState()
      if (enabled) {
        startAckTimer()
      }
      return
    }
    // 文档就绪后仍然注入失败：把原因报给页面（仅在用户确实开了编辑模式时）
    if (enabled && result.reason !== 'not-ready') {
      enabled = false
      options.onUnavailable?.(result.reason)
    }
  }

  /** 只处理本页预览 iframe 发来的消息 */
  const handleWindowMessage = (event: MessageEvent) => {
    if (!iframe || event.source !== iframe.contentWindow) {
      return
    }
    const data = event.data as VisualEditorMessage | null
    if (!data || data.source !== VISUAL_EDITOR_SOURCE) {
      return
    }
    if (data.type === INBOUND_TYPE.SELECT && data.element) {
      options.onSelect(normalizeElement(data.element))
      return
    }
    if (data.type === INBOUND_TYPE.ENABLED) {
      // 预览页确认指令已生效，取消超时检测
      if (data.enabled) {
        clearAckTimer()
      }
      return
    }
    if (data.type === INBOUND_TYPE.READY) {
      // 脚本就绪后再补一次状态同步，保证预览刷新后编辑模式不丢失
      syncEnabledState()
    }
  }

  const detach = () => {
    if (iframe) {
      iframe.removeEventListener('load', handleIframeLoad)
      iframe = null
    }
  }

  const attach = (nextIframe: HTMLIFrameElement | null) => {
    if (iframe === nextIframe) {
      return
    }
    detach()
    iframe = nextIframe
    if (!iframe) {
      return
    }
    iframe.addEventListener('load', handleIframeLoad)
    // 首次绑定时文档可能还没加载完（load 事件尚未触发），先尝试注入；
    // 若此时文档还是 about:blank，真正的 load 事件到来后会重新注入一次
    injectAndSync()
  }

  const setEnabled = (value: boolean) => {
    const next = Boolean(value)
    clearAckTimer()
    if (!next) {
      enabled = false
      syncEnabledState()
      return
    }
    const result = injectScript()
    if (result.ok) {
      enabled = true
      syncEnabledState()
      // 等预览页回执，确认编辑脚本真的在跑
      startAckTimer()
      return
    }
    if (result.reason === 'not-ready') {
      // 文档还在加载：先记下编辑模式，load 后注入脚本并下发指令，届时再等回执
      enabled = true
      return
    }
    enabled = false
    options.onUnavailable?.(result.reason)
  }

  const clearSelection = () => postToIframe(OUTBOUND_TYPE.CLEAR)

  const destroy = () => {
    // 先通知预览页复位高亮，再解绑并释放监听
    postToIframe(OUTBOUND_TYPE.DISABLE)
    detach()
    enabled = false
    clearAckTimer()
    window.removeEventListener('message', handleWindowMessage)
  }

  window.addEventListener('message', handleWindowMessage)

  return { attach, setEnabled, clearSelection, destroy }
}
