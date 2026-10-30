import { Spin, Typography } from '@douyinfe/semi-ui';
import { NavListItem, NavListPanel } from '@/components/NavListPanel';
import { PageContainer } from '@/components/PageContainer';
import { SystemConfigGroupForm } from '@/components/SystemConfigGroupForm';
import { useConfigAll } from '@/hooks/queries/configs';
import { usePermission } from '@/hooks/usePermission';
import './demo.css';

const DEMO_PREFIX = 'system.demo.';

export default function DemoConfigPage() {
    const query = useConfigAll();
    const { hasPermission } = usePermission();
    const records = (query.data ?? []).filter((record) => record.configKey.startsWith(DEMO_PREFIX));
    const canEdit = hasPermission('system:config:update');

    return (
        <div className="config-groups-layout">
            <div className="config-groups-layout__master">
                <NavListPanel
                    title="配置分组"
                    dataSource={[{ key: 'demo', label: '组件演示' }]}
                    renderItem={(group) => <NavListItem key={group.key} active primary={group.label} secondary={group.key} />}
                />
            </div>
            <PageContainer title="组件演示配置" extra={<span className="demo-page__hint">local/test 示例数据，使用真实 system 配置和媒体接口</span>}>
                {query.isPending ? <Spin /> : query.isError ? (
                    <Typography.Text type="danger">配置读取失败；请确认账号具有系统配置查看权限。</Typography.Text>
                ) : records.length === 0 ? (
                    <Typography.Text type="tertiary">演示配置尚未播种；请以 local/test profile 启动后端并应用 Flyway 迁移。</Typography.Text>
                ) : (
                    <>
                        <SystemConfigGroupForm
                            records={records}
                            canEdit={canEdit}
                            showSettings={false}
                            onEdit={() => undefined}
                        />
                        <details style={{ marginTop: 24 }}>
                            <summary>查看已保存数据（从 sys_config 读取）</summary>
                            <pre style={{ overflow: 'auto' }}>{JSON.stringify(records.map((record) => ({ key: record.configKey, value: record.configValue })), null, 2)}</pre>
                        </details>
                    </>
                )}
            </PageContainer>
        </div>
    );
}
