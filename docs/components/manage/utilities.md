# Manage 工具函数与类型

从 `@weiran-tech/manage` 导入。辅助函数不发起上传请求；上传成功后的地址与业务状态由调用方管理。

| 导出 | 用途 |
| --- | --- |
| `imageUploadError` | 单图上传校验 |
| `fileUploadError`、`imageFileError`、`videoFileError`、`ordinaryFileError` | 按上传类型检查文件并生成错误提示 |
| `uploadLimitsLabel` | 生成上传限制文案 |
| `fileExtension` | 从文件名或 URL 提取扩展名 |
| `isImageFile`、`isVideoFile`、`isPdfFile` | 按扩展名判别文件类型 |
| `isImageUrl` | 判断图片地址类型 |
| `DEFAULT_UPLOAD_SETTINGS`、`DEFAULT_MAX_FILES`、`ALL_UPLOAD_TYPES` | 默认上传配置、数量限制和类型清单 |

公开类型包括各组件的 `*Props`，以及 `UploadImage`、`UploadFile`、`UploadSettings`、`UploadType`、`OptionSelectOption`、`TextAvatarValue`、`NavListPanelSearch`。参数与最小接入方式见对应组件页面；使用 TypeScript 时从同一入口以 `import type` 导入。

```ts
import { DEFAULT_UPLOAD_SETTINGS, fileExtension } from '@weiran-tech/manage';
import type { UploadSettings } from '@weiran-tech/manage';

const settings: UploadSettings = DEFAULT_UPLOAD_SETTINGS;
const extension = fileExtension('report.pdf');
```
