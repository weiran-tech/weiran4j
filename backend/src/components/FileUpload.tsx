import { FileUpload as BaseFileUpload } from '@weiran-tech/backend-components';
import type { UploadFile, UploadType } from '@weiran-tech/backend-components';
import '@weiran-tech/backend-components/style.css';
import { Toast } from '@douyinfe/semi-ui';
import { useUploadSettings, useUploadSystemFile } from '@/hooks/queries/system-media';

export {
    ALL_UPLOAD_TYPES, DEFAULT_MAX_FILES, DEFAULT_UPLOAD_SETTINGS,
    fileUploadError, imageFileError, isImageUrl, ordinaryFileError,
    uploadLimitsLabel, videoFileError,
} from '@weiran-tech/backend-components';
export type { UploadSettings, UploadType } from '@weiran-tech/backend-components';

type Props = {
    disabled?: boolean;
    uploadTypes?: readonly UploadType[];
    onUpload?: UploadFile;
    onUploadingChange?: (uploading: boolean) => void;
    maxFiles?: number;
} & (
    | { multiple?: false; value: string; onChange: (value: string) => void }
    | { multiple: true; value: string[]; onChange: (value: string[]) => void }
);

/** 后台上传适配层：为可复用组件注入系统配置与上传接口。 */
export function FileUpload(props: Props) {
    const settings = useUploadSettings();
    const uploader = useUploadSystemFile();
    const upload: UploadFile = props.onUpload ?? ((file, onProgress) => uploader.uploadWithProgress(file, onProgress));
    const common = {
        settings: settings.data,
        settingsError: settings.isError,
        onRetrySettings: () => { void settings.refetch(); },
        upload,
        showInitialProgress: !props.onUpload,
        onUploadError: props.onUpload ? () => Toast.error('文件上传失败，请重试') : undefined,
        disabled: props.disabled,
        uploadTypes: props.uploadTypes,
        onUploadingChange: props.onUploadingChange,
        maxFiles: props.maxFiles,
    };
    return props.multiple
        ? <BaseFileUpload {...common} multiple value={props.value} onChange={props.onChange} />
        : <BaseFileUpload {...common} value={props.value} onChange={props.onChange} />;
}
