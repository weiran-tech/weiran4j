import { ImageUpload } from '@weiran-tech/web-components';
import '@weiran-tech/web-components/style.css';
import { Button, Toast } from '@douyinfe/semi-ui';
import { useState } from 'react';
import { useUploadSettings, useUploadSystemFile } from '@/hooks/queries/system-media';

interface SystemImageUploadProps {
    value: string;
    onChange: (url: string) => void;
    disabled?: boolean;
    onUpload?: (file: File, onProgress?: (percent: number) => void) => Promise<string>;
    onUploadingChange?: (uploading: boolean) => void;
}

/** 后台接口适配层：独立组件包只接收上传动作与限制。 */
export function SystemImageUpload({ value, onChange, disabled, onUpload, onUploadingChange }: SystemImageUploadProps) {
    const [currentValue, setCurrentValue] = useState(value);
    const settings = useUploadSettings();
    const uploader = useUploadSystemFile();

    return <>
        <ImageUpload
            value={currentValue}
            onChange={(url) => { setCurrentValue(url); onChange(url); }}
            upload={async (file, onProgress) => onUpload
                ? onUpload(file, onProgress)
                : (await uploader.uploadWithProgress(file, onProgress)).url}
            formats={settings.data?.imageFormats ?? []}
            maxSizeMb={settings.data?.imageMaxSizeMb ?? 0}
            disabled={disabled || !settings.data}
            {...(onUploadingChange ? { onUploadingChange } : {})}
            onError={(message) => { Toast.error(message); }}
        />
        {settings.isError && <Button size="small" onClick={() => void settings.refetch()}>上传配置加载失败，重试</Button>}
    </>;
}
