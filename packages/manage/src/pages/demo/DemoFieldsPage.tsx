import { useState } from 'react';
import { DictSelect } from '@/components/DictSelect';
import { DictTag } from '@/components/DictTag';
import { IconPicker } from '@/components/IconPicker';
import { PageContainer } from '@/components/PageContainer';
import { StatusTag } from '@/components/StatusTag';
import './demo.css';

export default function DemoFieldsPage() {
    const [icon, setIcon] = useState('Puzzle');
    const [status, setStatus] = useState<string | undefined>();

    return (
        <PageContainer title="字段与标签" extra={<span className="demo-page__hint">选项来自现有字典接口</span>}>
            <div className="demo-page__fields">
                <label>菜单图标 <IconPicker value={icon} onChange={setIcon} /></label>
                <label>状态字典 <DictSelect dictCode="sys_common_status" value={status} onChange={setStatus} /></label>
                <div>状态标签 <StatusTag value="enabled" /> <StatusTag value="disabled" /></div>
                <div>字典标签 <DictTag dictCode="sys_user_gender" value="male" /> <DictTag dictCode="sys_user_gender" value="female" /></div>
            </div>
        </PageContainer>
    );
}
