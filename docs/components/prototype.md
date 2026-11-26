# 原型框架组件

`@weiran-tech/prototype` 采用阿琅原型的公共交互实现。业务页面、菜单、Mock、版本和评审数据仍由各项目提供。下例仅使用内存数据，不依赖登录或业务服务。

正常状态可填写评审、选择或新建建议人、上传截图；已完结状态禁止保存；空目录显示恢复提示；模拟存储失败会保留输入，可切回正常重试。

<ClientOnly><PrototypeComponentsDemo /></ClientOnly>

安装、适配器与发布约定见 [发布线](../releases.md)。
