declare namespace API {
  type AppAddRequest = {
    /** 应用初始化的 prompt */
    initPrompt: string
    /** 代码生成类型（枚举）：html / multi_file / vue_project，默认 multi_file */
    codeGenType?: string
    /** AI 模型类型（枚举）：deepseek-flash / deepseek-v4-pro，默认 deepseek-flash */
    aiModelType?: string
  }

  type AppAdminUpdateRequest = {
    /** id */
    id: string
    /** 应用名称 */
    appName?: string
    /** 应用封面 */
    cover?: string
    /** 优先级（值为 99 表示精选应用） */
    priority?: number
  }

  type AppDeployRequest = {
    /** 应用 id */
    appId: string
  }

  type AppQueryRequest = {
    pageNum?: number
    pageSize?: number
    sortField?: string
    sortOrder?: string
    /** id */
    id?: string
    /** 应用名称 */
    appName?: string
    /** 应用封面 */
    cover?: string
    /** 应用初始化的 prompt */
    initPrompt?: string
    /** 代码生成类型（枚举） */
    codeGenType?: string
    /** 部署标识 */
    deployKey?: string
    /** 优先级 */
    priority?: number
    /** 创建用户id */
    userId?: string
  }

  type AppUpdateRequest = {
    /** id */
    id: string
    /** 应用名称 */
    appName: string
  }

  type AppVO = {
    id?: string
    appName?: string
    cover?: string
    initPrompt?: string
    codeGenType?: string
    aiModelType?: string
    deployKey?: string
    deployedTime?: string
    priority?: number
    userId?: string
    createTime?: string
    updateTime?: string
    user?: UserVO
  }

  type BaseResponseAppVO = {
    code?: number
    data?: AppVO
    message?: string
  }

  type BaseResponseBoolean = {
    code?: number
    data?: boolean
    message?: string
  }

  type BaseResponseDeployStatusVO = {
    code?: number
    data?: DeployStatusVO
    message?: string
  }

  type BaseResponseLoginUserVO = {
    code?: number
    data?: LoginUserVO
    message?: string
  }

  type BaseResponseLong = {
    code?: number
    data?: number
    message?: string
  }

  type BaseResponseMapStringObject = {
    code?: number
    data?: Record<string, any>
    message?: string
  }

  type BaseResponsePageAppVO = {
    code?: number
    data?: PageAppVO
    message?: string
  }

  type BaseResponsePageChatHistory = {
    code?: number
    data?: PageChatHistory
    message?: string
  }

  type BaseResponsePageUserVO = {
    code?: number
    data?: PageUserVO
    message?: string
  }

  type BaseResponseString = {
    code?: number
    data?: string
    message?: string
  }

  type BaseResponseUser = {
    code?: number
    data?: User
    message?: string
  }

  type BaseResponseUserVO = {
    code?: number
    data?: UserVO
    message?: string
  }

  type ChatHistory = {
    id?: string
    message?: string
    messageType?: string
    appId?: string
    userId?: string
    createTime?: string
    updateTime?: string
    parentId?: string
    isDelete?: number
  }

  type ChatHistoryQueryRequest = {
    pageNum?: number
    pageSize?: number
    sortField?: string
    sortOrder?: string
    /** id */
    id?: string
    /** 应用id */
    appId?: string
    /** 创建用户id */
    userId?: string
    /** 消息类型：user/ai/error */
    messageType?: string
    /** 消息内容（模糊查询） */
    message?: string
    /** 父消息id（用于上下文关联） */
    parentId?: string
    /** 上一次查询的最后一条消息的创建时间（游标分页，用于向前加载更多历史记录） */
    lastCreateTime?: string
  }

  type chatToGenCodeParams = {
    appId: string
    prompt: string
  }

  type DeleteRequest = {
    /** id */
    id: string
  }

  type DeployStatusVO = {
    appId?: string
    status?: string
    accepted?: boolean
    message?: string
    deployUrl?: string
    errorMessage?: string
    deployedTime?: string
    queuePosition?: number
    queueSize?: number
    workerCount?: number
  }

  type downloadAppParams = {
    appId: string
  }

  type getAppVOByIdByAdminParams = {
    id: string
  }

  type getAppVOByIdParams = {
    id: string
  }

  type getDeployStatusParams = {
    appId: string
  }

  type getUserByIdParams = {
    id: string
  }

  type getUserVOByIdParams = {
    id: string
  }

  type listAppChatHistoryParams = {
    appId: string
  }

  type LoginUserVO = {
    id?: string
    userAccount?: string
    username?: string
    userAvatar?: string
    userProfile?: string
    userRole?: string
    createTime?: string
    updateTime?: string
  }

  type PageAppVO = {
    records?: AppVO[]
    pageNumber?: number
    pageSize?: number
    totalPage?: number
    totalRow?: number
    optimizeCountQuery?: boolean
  }

  type PageChatHistory = {
    records?: ChatHistory[]
    pageNumber?: number
    pageSize?: number
    totalPage?: number
    totalRow?: number
    optimizeCountQuery?: boolean
  }

  type PageUserVO = {
    records?: UserVO[]
    pageNumber?: number
    pageSize?: number
    totalPage?: number
    totalRow?: number
    optimizeCountQuery?: boolean
  }

  type ServerSentEventString = Record<string, any>

  type serveStaticResourceParams = {
    deployKey: string
  }

  type User = {
    id?: string
    userAccount?: string
    userPassword?: string
    username?: string
    userAvatar?: string
    userProfile?: string
    userRole?: string
    editTime?: string
    createTime?: string
    updateTime?: string
    isDelete?: number
  }

  type UserAddRequest = {
    /** 用户昵称 */
    username: string
    /** 账号 */
    userAccount: string
    /** 用户头像 */
    userAvatar?: string
    /** 用户简介 */
    userProfile?: string
    /** 用户角色: user, admin */
    userRole: string
  }

  type UserLoginRequest = {
    /** 账号 */
    userAccount: string
    /** 密码 */
    userPassword: string
  }

  type UserQueryRequest = {
    pageNum?: number
    pageSize?: number
    sortField?: string
    sortOrder?: string
    id?: string
    username?: string
    userAccount?: string
    userProfile?: string
    userRole?: string
  }

  type UserRegisterRequest = {
    /** 账号 */
    userAccount: string
    /** 密码 */
    userPassword: string
    /** 确认密码 */
    checkPassword: string
  }

  type UserUpdateRequest = {
    /** id */
    id: string
    /** 用户昵称 */
    username: string
    /** 用户头像 */
    userAvatar?: string
    /** 简介 */
    userProfile?: string
    /** 用户角色：user/admin */
    userRole: string
  }

  type UserVO = {
    id?: string
    userAccount?: string
    username?: string
    userAvatar?: string
    userProfile?: string
    userRole?: string
    createTime?: string
  }
}
