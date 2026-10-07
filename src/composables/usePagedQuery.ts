/**
 * 分页列表查询的组合式函数。
 *
 * 背景：首页的两块列表 + 三个后台管理页此前各自重复了同一套「分页查询」样板：
 *   dataList / total / loading 三个 ref、reactive 的查询条件、pagination 计算属性、
 *   fetchData / doSearch / doTableChange / 输入框清空即刷新，以及 onMounted 首次请求。
 * 六个副本里的差异只有「调哪个接口」和「页面文案」，其余完全一致，这里收敛成一份。
 */
import { computed, onMounted, reactive, ref, type ComputedRef, type Ref } from 'vue'
import { showResponseError, type ResponseBody } from './useMessage'

/** 查询条件中与分页相关的字段 */
export interface PagedQuery {
  pageNum?: number
  pageSize?: number
}

/** 后端分页结果体（Page<T>） */
export interface PagedRecords<T> {
  records?: T[]
  totalRow?: number
}

/** 后端分页响应体（BaseResponse<Page<T>>） */
export interface PagedResponse<T> extends ResponseBody {
  data?: PagedRecords<T> | null
}

/** 分页接口的返回值（兼容 axios 的 AxiosResponse） */
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
  /** 每页数量 */
  pageSize: number
  /** 请求函数：参数加工（如空 id 转 undefined）也在这里完成 */
  fetchPage: (query: Q) => Promise<PagedApiResponse<T>>
  /** 请求失败时的提示前缀，默认「获取数据失败」 */
  failPrefix?: string
  /** 是否展示 a-table 的每页条数切换器，默认展示 */
  showSizeChanger?: boolean
  /**
   * 请求前的守卫：返回 false 时跳过本次请求并清空列表
   * （首页在未登录时不请求「我的应用」，就是靠它收口的）
   */
  beforeLoad?: () => boolean
  /** 是否在组件挂载时自动请求一次，默认是 */
  immediate?: boolean
}

export interface UsePagedQueryReturn<T, Q extends PagedQuery> {
  /** 当前页数据 */
  dataList: Ref<T[]>
  /** 总条数 */
  total: Ref<number>
  /** 请求进行中 */
  loading: Ref<boolean>
  /** 查询条件（直接绑定到搜索表单） */
  query: Q
  /** a-table / a-pagination 的分页配置 */
  pagination: ComputedRef<{
    current: number
    pageSize: number
    total: number
    showSizeChanger: boolean
    showTotal: (value: number) => string
  }>
  /** 按当前条件请求一页 */
  load: () => Promise<void>
  /** 从第一页开始查询（搜索） */
  search: () => Promise<void>
  /** a-table 的 change：切换页码或每页条数 */
  changePage: (page: TablePageChange) => Promise<void>
  /** a-pagination 的 change：只切换页码 */
  changePageNum: (pageNum: number) => Promise<void>
  /** 搜索输入框清空时立即刷新（各列表页统一的交互） */
  handleInputClear: (event: Event) => void
}

/**
 * @param options 查询配置
 */
export const usePagedQuery = <T, Q extends PagedQuery>(
  options: UsePagedQueryOptions<T, Q>,
): UsePagedQueryReturn<T, Q> => {
  const dataList = ref<T[]>([]) as Ref<T[]>
  const total = ref(0)
  const loading = ref(false)
  const query = reactive({ pageNum: 1, pageSize: options.pageSize, ...options.initialQuery }) as Q

  const pagination = computed(() => ({
    current: query.pageNum ?? 1,
    pageSize: query.pageSize ?? options.pageSize,
    total: total.value,
    // 分页条默认展示每页条数切换器，首页的 a-pagination 显式关掉
    showSizeChanger: options.showSizeChanger ?? true,
    showTotal: (value: number) => `共 ${value} 条`,
  }))

  /** 清空列表（守卫拦住请求、或请求失败时使用） */
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

  // 输入框被清空时立即刷新列表，不必再点一次搜索
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
    handleInputClear,
  }
}
