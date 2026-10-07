/**
 * 后端时间字符串的解析与展示。
 *
 * 后端不同接口下发的时间形态并不统一：
 *   - 列表 / 详情接口给的是 "2026-10-07 13:42:47"（`yyyy-MM-dd HH:mm:ss`）
 *   - 部署状态接口给的是 ISO 8601 的 "2026-10-07T13:45:08"
 * dayjs 自带的解析器能同时吃下这两种写法（也能兜住带时区的 ISO 串），
 * 因此统一交给 dayjs，不再手写 `new Date(time.replace(/-/g, '/'))` 的 Safari 兜底
 * ——那个写法遇到带 `T` 的 ISO 串会解析失败。
 */
import dayjs from 'dayjs'

/** 统一的时间展示格式：与后端 `createTime` 的写法保持一致 */
export const DATE_TIME_FORMAT = 'YYYY-MM-DD HH:mm:ss'

/**
 * 把后端下发的时间格式化为统一的展示格式
 *
 * @param time   时间字符串（ISO 8601 或 `yyyy-MM-dd HH:mm:ss`）
 * @param format 目标格式，默认 {@link DATE_TIME_FORMAT}
 *
 * @returns 格式化后的时间；空值返回空串；无法解析时**原样返回**，避免把数据弄丢
 */
export const formatDateTime = (time?: string, format: string = DATE_TIME_FORMAT) => {
  if (!time) {
    return ''
  }
  const parsed = dayjs(time)
  return parsed.isValid() ? parsed.format(format) : time
}

/**
 * 将后端返回的时间字符串解析为时间戳，用于排序与比较
 * @param time 时间字符串
 * @returns 时间戳，无法解析时返回 0
 */
export const parseTime = (time?: string) => {
  if (!time) {
    return 0
  }
  const parsed = dayjs(time)
  return parsed.isValid() ? parsed.valueOf() : 0
}

/**
 * 将时间格式化为「刚刚 / x 分钟前 / x 小时前 / x 天前 / 日期」的形式
 * @param time 时间字符串
 */
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
