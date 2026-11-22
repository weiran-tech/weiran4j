import '@douyinfe/semi-ui/react19-adapter';
import { Checkbox, Form, Space } from '@douyinfe/semi-ui';
import React, { useState } from 'react';
import { LocalSmsTemplateField } from '../../packages/manage/src/components/SystemConfigGroupForm';

export function SmsTemplateDemo() {
    const [canEdit, setCanEdit] = useState(true);
    return <section style={{ padding: 20, border: '1px solid var(--semi-color-border)', borderRadius: 8 }}>
        <Space vertical align="start" style={{ width: '100%' }}>
            <Checkbox checked={canEdit} onChange={(event) => setCanEdit(event.target.checked ?? false)}>允许编辑模板</Checkbox>
            <Form<Record<string, unknown>> initValues={{ template: '您的验证码是 ，5 分钟内有效。' }} style={{ width: '100%' }}>
                <Space vertical align="start" style={{ width: '100%' }} spacing={16}>
                <LocalSmsTemplateField field="template" label="本地验证码模板" disabled={!canEdit} />
                <Form.Input field="aliyun" label="阿里云验证码模板" fieldStyle={{ padding: 0 }} disabled={!canEdit} placeholder="填写已审核的模板 CODE" />
                </Space>
            </Form>
            <p>在“是”和逗号之间放置光标，或选中一段文字，再点击验证码变量。可清空模板测试空值，也可切换编辑权限；示例不保存、不发送短信。</p>
        </Space>
    </section>;
}
