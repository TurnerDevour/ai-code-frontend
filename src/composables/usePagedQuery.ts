/**
 * 分页列表查询的组合式函数。
 *
 * 首页两块列表 + 三个后台管理页此前各自复制了同一套样板（dataList / total / loading、
 * 查询条件、pagination、fetchData / doSearch / doTableChange、输入框清空刷新、首次请求），
 * 差异只有调哪个接口，这里收敛成一份。
 */
import { computed, onMounted, reactive, ref, type ComputedRef, type Ref } from 'vue'
import { showError, showResponseError, type ResponseBody } from './useMessage'

/** 分页相关查询字段 */
export interface PagedQuery {
  pageNum?: number
  pageSize?: number
}

/** 后端分页结果体 Page<T> */
export interface PagedRecords<T> {
  records?: T[]
  totalRow?: number
}

/** 后端分页响应体 BaseResponse<Page<T>> */
export interface PagedResponse<T> extends ResponseBody {
  data?: PagedRecords<T> | null
}

/** 分页接口返回值（兼容 axios 的 AxiosResponse） */
export interface PagedApiResponse<T> {
  data: PagedResponse<T>
}

/** a-table 的 change 事件参数 */
export interface TablePageChange {
  current: number
  pageSize: number
}

export interface UsePagedQueryOptions<T, Q extends PagedQuery> {
  /** 初始查询条件（pageNum / pageSize 会被规范为 pageSize 与第 1 页） */
  initialQuery: Q
  pageSize: number
  /** 请求函数：参数加工（如空 id 转 undefined）也在这里完成 */
  fetchPage: (query: Q) => Promise<PagedApiResponse<T>>
  /** 失败提示前缀，默认「获取数据失败」 */
  failPrefix?: string
  /** 是否展示每页条数切换器，默认展示 */
  showSizeChanger?: boolean
  /**
   * 请求前的守卫：返回 false 时跳过本次请求并清空列表
   * （首页未登录时不请求「我的应用」就靠它收口）
   */
  beforeLoad?: () => boolean
  /** 是否在组件挂载时自动请求一次，默认是 */
  immediate?: boolean
  /** 取记录唯一标识，默认取 `item.id` */
  getItemId?: (item: T) => string | number | undefined
}

export interface UsePagedQueryReturn<T, Q extends PagedQuery> {
  /** 当前页数据 */
  dataList: Ref<T[]>
  /** 总条数 */
  total: Ref<number>
  /** 请求进行中 */
  loading: Ref<boolean>
  /** 查询条件（直接绑定搜索表单） */
  query: Q
  /** a-table / a-pagination 的分页配置 */
  pagination: ComputedRef<{
    current: number
    pageSize: number
    total: number
    showSizeChanger: boolean
    showTotal: (value: number) => string
  }>
  load: () => Promise<void>
  search: () => Promise<void>
  changePage: (page: TablePageChange) => Promise<void>
  /** 只切换页码 */
  changePageNum: (pageNum: number) => Promise<void>
  /**
   * 删除一行后刷新：先本地摘掉（不依赖请求结果），再重新拉一页校准 total 与空位；
   * 当前页被删空时先回退一页
   */
  reloadAfterRemove: (removedId?: string | number) => Promise<void>
  /** 搜索输入框清空时立即刷新（各列表页统一的交互） */
  handleInputClear: (event: Event) => void
}

export const usePagedQuery = <T, Q extends PagedQuery>(
  options: UsePagedQueryOptions<T, Q>,
): UsePagedQueryReturn<T, Q> => {
  const dataList = ref<T[]>([]) as Ref<T[]>
  const total = ref(0)
  const loading = ref(false)
  const query = reactive({ pageNum: 1, pageSize: options.pageSize, ...options.initialQuery }) as Q

  const getItemId = options.getItemId ?? ((item: T) => (item as { id?: string }).id)

  const pagination = computed(() => ({
    current: query.pageNum ?? 1,
    pageSize: query.pageSize ?? options.pageSize,
    total: total.value,
    showSizeChanger: options.showSizeChanger ?? true,
    showTotal: (value: number) => `共 ${value} 条`,
  }))

  const clear = () => {
    dataList.value = []
    total.value = 0
  }

  const load = async () => {
    if (options.beforeLoad && !options.beforeLoad()) {
      clear()
      return
    }
    loading.value = true
    try {
      const res = await options.fetchPage(query)
      if (res.data.code === 0 && res.data.data) {
        dataList.value = (res.data.data.records ?? []) as T[]
        total.value = Number(res.data.data.totalRow ?? 0)
      } else {
        showResponseError(options.failPrefix ?? '获取数据失败', res.data)
      }
    } catch {
      // 网络异常 / 超时：保留现有列表（尤其是刚删除后本地已摘掉的那一份），只提示一次；
      // 也不能让异常冒出去变成未处理的 Promise 拒绝
      showError(options.failPrefix ?? '获取数据失败')
    } finally {
      loading.value = false
    }
  }

  const search = async () => {
    query.pageNum = 1
    await load()
  }

  const changePage = async (page: TablePageChange) => {
    query.pageNum = page.current
    query.pageSize = page.pageSize
    await load()
  }

  const changePageNum = async (pageNum: number) => {
    query.pageNum = pageNum
    await load()
  }

  const reloadAfterRemove = async (removedId?: string | number) => {
    if (removedId !== undefined) {
      const removed = dataList.value.filter((item) => String(getItemId(item)) === String(removedId))
      if (removed.length) {
        dataList.value = dataList.value.filter(
          (item) => String(getItemId(item)) !== String(removedId),
        )
        total.value = Math.max(0, total.value - removed.length)
      }
    }
    // 这一页被删空了就回退一页，避免停在空页
    const currentPage = query.pageNum ?? 1
    if (!dataList.value.length && currentPage > 1) {
      query.pageNum = currentPage - 1
    }
    await load()
  }

  const handleInputClear = (event: Event) => {
    if (!(event.target as HTMLInputElement).value) {
      void search()
    }
  }

  if (options.immediate !== false) {
    onMounted(() => {
      void load()
    })
  }

  return {
    dataList,
    total,
    loading,
    query,
    pagination,
    load,
    search,
    changePage,
    changePageNum,
    reloadAfterRemove,
    handleInputClear,
  }
}
