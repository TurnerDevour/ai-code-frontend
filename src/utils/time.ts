/**
 * 后端时间字符串的解析与展示。
 * 列表 / 详情接口给 `yyyy-MM-dd HH:mm:ss`，部署状态接口给 ISO 8601（带时区也能吃下），
 * 两种形态都交给 dayjs；不要改回 `new Date(time.replace(/-/g, '/'))`，它解析不了带 T 的 ISO 串。
 */
import dayjs from 'dayjs'

/** 统一展示格式，与后端 createTime 的写法一致 */
export const DATE_TIME_FORMAT = 'YYYY-MM-DD HH:mm:ss'

/** 空值返回空串；无法解析时原样返回，避免把数据弄丢 */
export const formatDateTime = (time?: string, format: string = DATE_TIME_FORMAT) => {
  if (!time) {
    return ''
  }
  const parsed = dayjs(time)
  return parsed.isValid() ? parsed.format(format) : time
}

/** 解析为时间戳，用于排序与比较；无法解析返回 0 */
export const parseTime = (time?: string) => {
  if (!time) {
    return 0
  }
  const parsed = dayjs(time)
  return parsed.isValid() ? parsed.valueOf() : 0
}

/** 格式化为「刚刚 / x 分钟前 / x 小时前 / x 天前」，超过 30 天显示日期 */
export const formatRelativeTime = (time?: string) => {
  if (!time) {
    return ''
  }
  const parsed = dayjs(time)
  if (!parsed.isValid()) {
    return time
  }
  const now = dayjs()
  const minutes = now.diff(parsed, 'minute')
  if (minutes < 1) {
    return '刚刚'
  }
  if (minutes < 60) {
    return `${minutes} 分钟前`
  }
  const hours = now.diff(parsed, 'hour')
  if (hours < 24) {
    return `${hours} 小时前`
  }
  const days = now.diff(parsed, 'day')
  if (days < 30) {
    return `${days} 天前`
  }
  return parsed.format('YYYY-MM-DD')
}
