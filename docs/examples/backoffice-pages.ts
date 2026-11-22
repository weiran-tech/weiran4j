// 文档分组菜单与后台页面示例的共同索引。
export const backofficePages = [
    {
        "id": "list",
        "title": "列表与筛选",
        "description": "使用本地字典与数据，支持搜索、筛选、列设置和状态切换。"
    },
    {
        "id": "navigation",
        "title": "导航列表",
        "description": "使用真实导航列表组件展示分组搜索、选择与空结果。"
    },
    {
        "id": "fields",
        "title": "字段与标签",
        "description": "使用本地字典演示选项、状态标签与图标选择。"
    },
    {
        "id": "access",
        "title": "权限与入口",
        "description": "切换模拟操作权限，检查按钮展示及无权限提示。"
    },
    {
        "id": "config",
        "title": "配置表单",
        "description": "复用实际动态表单，演示全部字段、上传组合、特殊校验、只读与保存或上传失败重试；保存仅影响当前页面，上传使用临时 URL。"
    },
    {
        "id": "sequence",
        "title": "自增序号",
        "description": "本地模拟按标识独立递增、非法标识与分配失败；真实并发和事务语义由后端测试覆盖。"
    },
    {
        "id": "batch",
        "title": "批处理任务",
        "description": "复用实际工作台，通过本地数据源模拟上传、预检、决策、入库、总结、取消与失败重试，不解析文件或写入业务数据。"
    }
] as const;

export type BackofficePage = typeof backofficePages[number]['id'];
