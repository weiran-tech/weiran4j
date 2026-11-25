import { useState } from 'react';
import { NavListItem, NavListPanel } from '@/components/NavListPanel';
import { PageContainer } from '@/components/PageContainer';
import './demo.css';

const ITEMS = [
    { key: 'list', title: '列表与筛选', detail: '查询、列设置、操作列' },
    { key: 'fields', title: '字段与标签', detail: '字典、图标' },
    { key: 'access', title: '权限与入口', detail: '权限展示、安全入口' },
] as const;

export default function DemoNavigationPage() {
    const [selected, setSelected] = useState<string>('list');
    const [search, setSearch] = useState('');

    return (
        <PageContainer title="导航列表" extra={<span className="demo-page__hint">搜索并选择本地示例分组</span>}>
            <div className="demo-page__nav">
                <NavListPanel
                    title="演示分组"
                    search={{ value: search, onChange: setSearch, placeholder: '搜索分组' }}
                    dataSource={ITEMS.filter((item) => `${item.title}${item.detail}`.includes(search.trim()))}
                    emptyText="没有匹配的分组"
                    footer={<span>当前：{ITEMS.find((item) => item.key === selected)?.title}</span>}
                    renderItem={(item) => (
                        <NavListItem key={item.key} active={selected === item.key} primary={item.title} meta={item.detail} onClick={() => setSelected(item.key)} />
                    )}
                />
            </div>
        </PageContainer>
    );
}
