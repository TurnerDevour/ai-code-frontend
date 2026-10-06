// @ts-ignore
/* eslint-disable */
import request from '@/utils/request'

/** 此处后端没有提供注释 GET /health */
export async function healthCheck(options?: { [key: string]: any }) {
  return request<API.BaseResponseString>('/health', {
    method: 'GET',
    ...(options || {}),
  })
}

/** 此处后端没有提供注释 GET /health/deploy-queue */
export async function deployQueueStatus(options?: { [key: string]: any }) {
  return request<API.BaseResponseMapStringObject>('/health/deploy-queue', {
    method: 'GET',
    ...(options || {}),
  })
}
