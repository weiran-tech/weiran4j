import { RichTextEditor as BaseRichTextEditor } from '@weiran-tech/backend-components';
import type { RichTextEditorProps } from '@weiran-tech/backend-components';
import '@weiran-tech/backend-components/style.css';
import { useUploadSettings, useUploadSystemFile } from '@/hooks/queries/system-media';

type Props = Omit<RichTextEditorProps, 'settings' | 'upload' | 'settingsError' | 'onRetrySettings'>;

/** 后台富文本适配层：为可复用编辑器注入系统上传配置与接口。 */
export function RichTextEditor(props: Props) {
    const settings = useUploadSettings();
    const uploader = useUploadSystemFile();
    return <BaseRichTextEditor
        {...props}
        settings={settings.data}
        upload={(file, onProgress) => uploader.uploadWithProgress(file, onProgress)}
        settingsError={settings.isError}
        onRetrySettings={() => { void settings.refetch(); }}
    />;
}
