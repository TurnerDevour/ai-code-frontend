/**
 * 将时间格式化为「刚刚 / x 分钟前 / x 小时前 / x 天前 / 日期」的形式
 * @param time 时间字符串
 */
export const formatRelativeTime = (time?: string) => {
  if (!time) {
    return ''
  }
  // 兼容 Safari 对 "yyyy-MM-dd HH:mm:ss" 的解析
  const timestamp = new Date(time.replace(/-/g, '/')).getTime()
  if (Number.isNaN(timestamp)) {
    return time
  }
  const diff = Date.now() - timestamp
  const minute = 60 * 1000
  const hour = 60 * minute
  const day = 24 * hour
  if (diff < minute) {
    return '刚刚'
  }
  if (diff < hour) {
    return `${Math.floor(diff / minute)} 分钟前`
  }
  if (diff < day) {
    return `${Math.floor(diff / hour)} 小时前`
  }
  if (diff < 30 * day) {
    return `${Math.floor(diff / day)} 天前`
  }
  return time.slice(0, 10)
}
