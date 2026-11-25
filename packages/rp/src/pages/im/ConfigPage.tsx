import { Button, Input, Modal, Select, Switch, Table, Tabs, Tag, TextArea, Toast, Typography } from '@douyinfe/semi-ui';
import type { ColumnProps } from '@douyinfe/semi-ui/lib/es/table';
import { useMemo, useState } from 'react';
import { PageContainer } from '@/components/PageContainer';
import { useActionsColumn, type TableAction } from '@/components/TableActions';
import {
    useDeleteQuickReply,
    useDeleteSensitiveWord,
    useQuickReplies,
    useQuietConfigs,
    useRecallConfig,
    useSaveQuickReply,
    useSaveQuietConfig,
    useSaveRecallConfig,
    useSaveSensitiveWord,
    useSensitiveWords,
} from '@/hooks/queries/im';
import { useTableDefaults } from '@/hooks/useTableDefaults';
import type { QuietConfigView, QuickReplyView, RecallConfigView, RoutingScene, SensitiveWordView } from '@/types/api';
import './im.css';

const SCENE_LABEL: Record<RoutingScene, string> = { presale: '售前群', trade: '交易群' };

const RECALL_OPTIONS = [
    { label: '1 分钟', value: 1 },
    { label: '2 分钟', value: 2 },
    { label: '3 分钟', value: 3 },
    { label: '5 分钟', value: 5 },
    { label: '10 分钟', value: 10 },
    { label: '30 分钟', value: 30 },
    { label: '1 小时', value: 60 },
    { label: '1 天', value: 1440 },
    { label: '永久', value: -1 },
];

const REPLY_GROUPS = ['售前', '交易', '通用', '售后', '回收'];
const WORD_TYPES = ['防引流', '正则', '关键词'];
const WORD_LEVELS = ['全局', '租户', '业务'];
const WORD_ACTIONS = ['硬拦截', '提示'];
const QUIET_TIMINGS = ['用户发送后', '用户发送后 + 进入群时', '进入群时'];

function recallLabel(value: number): string {
    return RECALL_OPTIONS.find((option) => option.value === value)?.label ?? `${value} 分钟`;
}

function RecallPanel() {
    const { data } = useRecallConfig();
    const save = useSaveRecallConfig();
    const config: RecallConfigView | undefined = data?.[0];

    if (!config) return <Typography.Text type="tertiary">暂无撤回配置</Typography.Text>;

    const update = (patch: Partial<RecallConfigView>) => {
        save.mutate({ id: config.id, body: patch }, { onSuccess: () => Toast.success('撤回设置已保存') });
    };

    return (
        <div className="im-kv" style={{ gridTemplateColumns: '200px minmax(0, 1fr)', background: 'transparent' }}>
            <span className="im-kv__k">允许撤回消息</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Switch checked={config.allow} onChange={(checked) => update({ allow: checked })} aria-label="允许撤回消息" />
                <span className="im-muted">{config.allow ? '已开启' : '已关闭'}</span>
            </span>
            <span className="im-kv__k">撤回时间窗口</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Select
                    value={config.windowMinutes}
                    optionList={RECALL_OPTIONS}
                    onChange={(value) => update({ windowMinutes: Number(value) })}
                    style={{ width: 160 }}
                />
                <span className="im-muted">当前：{recallLabel(config.windowMinutes)}</span>
            </span>
            <span className="im-kv__k">允许客服撤回用户消息</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Switch checked={config.allowUser} onChange={(checked) => update({ allowUser: checked })} aria-label="允许客服撤回用户消息" />
                <span className="im-muted">{config.allowUser ? '已开启' : '已关闭'} · 用于手机号等敏感信息兜底</span>
            </span>
            <span className="im-kv__k">不可撤回</span>
            <span className="im-muted">业务卡片 / 系统消息 / 已读回执 / 群已关闭</span>
        </div>
    );
}

function QuietModal({ record, onClose }: { record: QuietConfigView; onClose: () => void }) {
    const save = useSaveQuietConfig();
    const [start, setStart] = useState(record.start);
    const [end, setEnd] = useState(record.end);
    const [timing, setTiming] = useState(record.timing);
    const [prompt, setPrompt] = useState(record.prompt);
    const [error, setError] = useState('');

    const submit = async () => {
        if (!/^\d{2}:\d{2}$/.test(start) || !/^\d{2}:\d{2}$/.test(end)) {
            setError('时间格式应为 HH:mm');
            return;
        }
        setError('');
        await save.mutateAsync({ id: record.id, body: { start, end, timing, prompt } });
        Toast.success(`${SCENE_LABEL[record.scene]}禁言配置已保存`);
        onClose();
    };

    return (
        <Modal
            visible
            title={`群禁言 · ${SCENE_LABEL[record.scene]}`}
            width={520}
            onCancel={onClose}
            onOk={() => void submit().catch(() => undefined)}
            okButtonProps={{ loading: save.isPending }}
            maskClosable={false}
        >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'flex', gap: 12 }}>
                    <label style={{ flex: 1 }}>
                        <div className="im-muted" style={{ marginBottom: 6 }}>
                            开始时间
                        </div>
                        <Input value={start} placeholder="22:00" onChange={setStart} />
                    </label>
                    <label style={{ flex: 1 }}>
                        <div className="im-muted" style={{ marginBottom: 6 }}>
                            结束时间
                        </div>
                        <Input value={end} placeholder="09:00" onChange={setEnd} />
                    </label>
                </div>
                <label>
                    <div className="im-muted" style={{ marginBottom: 6 }}>
                        提示时机
                    </div>
                    <Select value={timing} optionList={QUIET_TIMINGS.map((value) => ({ label: value, value }))} style={{ width: '100%' }} onChange={(value) => setTiming(String(value))} />
                </label>
                <label>
                    <div className="im-muted" style={{ marginBottom: 6 }}>
                        提示语
                    </div>
                    <TextArea value={prompt} autosize={{ minRows: 2, maxRows: 4 }} onChange={setPrompt} />
                </label>
                <Typography.Text type="tertiary" size="small">
                    支持跨天时段（如 22:00–09:00）；提示语支持 {'{结束时间}'} 变量；客服发言固定允许。
                </Typography.Text>
                {error && <Typography.Text type="danger">{error}</Typography.Text>}
            </div>
        </Modal>
    );
}

function QuietPanel() {
    const { data } = useQuietConfigs();
    const save = useSaveQuietConfig();
    const [editing, setEditing] = useState<QuietConfigView | null>(null);
    const list = data ?? [];

    return (
        <>
            <Typography.Paragraph type="tertiary" size="small">
                按群类型配置客服服务时段，非服务时间自动禁言用户。
            </Typography.Paragraph>
            {list.map((item) => {
                const cross = item.start > item.end;
                return (
                    <div key={item.id} className="im-config-row">
                        <div className="im-config-row__main">
                            <div className="im-config-row__title">
                                {SCENE_LABEL[item.scene]}
                                <Tag size="small" color={item.on ? 'green' : 'grey'}>
                                    {item.on ? '启用' : '停用'}
                                </Tag>
                            </div>
                            <div className="im-config-row__meta">
                                <span>
                                    服务时段：{item.start}–{item.end}
                                    {cross ? '（跨天）' : ''}
                                </span>
                                <span>提示时机：{item.timing}</span>
                                <span>客服发言：允许（固定）</span>
                            </div>
                            <div className="im-config-row__prompt">{item.prompt}</div>
                        </div>
                        <div className="im-config-row__ops">
                            <Button theme="borderless" onClick={() => setEditing(item)}>
                                配置
                            </Button>
                            <Switch
                                checked={item.on}
                                aria-label={`${SCENE_LABEL[item.scene]}群禁言开关`}
                                onChange={(checked) =>
                                    save.mutate(
                                        { id: item.id, body: { on: checked } },
                                        { onSuccess: () => Toast.success(`${SCENE_LABEL[item.scene]}禁言已${checked ? '启用' : '停用'}`) },
                                    )
                                }
                            />
                        </div>
                    </div>
                );
            })}
            {editing && <QuietModal record={editing} onClose={() => setEditing(null)} />}
        </>
    );
}

function variablesOf(text: string): string[] {
    const matched = text.match(/\{[^}]+\}/g) ?? [];
    return [...new Set(matched.map((item) => item.slice(1, -1)))];
}

function ReplyModal({ record, onClose }: { record: QuickReplyView | null; onClose: () => void }) {
    const save = useSaveQuickReply();
    const [group, setGroup] = useState(record?.group ?? '通用');
    const [text, setText] = useState(record?.text ?? '');
    const [error, setError] = useState('');

    const submit = async () => {
        if (!text.trim()) {
            setError('请输入快捷回复内容');
            return;
        }
        setError('');
        await save.mutateAsync({
            ...(record ? { id: record.id } : {}),
            body: { group, text: text.trim(), uses: record?.uses ?? 0 },
        });
        Toast.success(record ? '快捷回复已保存' : '快捷回复已新增');
        onClose();
    };

    return (
        <Modal
            visible
            title={record ? '编辑快捷回复' : '新增快捷回复'}
            width={560}
            onCancel={onClose}
            onOk={() => void submit().catch(() => undefined)}
            okButtonProps={{ loading: save.isPending }}
            maskClosable={false}
        >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <label>
                    <div className="im-muted" style={{ marginBottom: 6 }}>
                        分组
                    </div>
                    <Select value={group} optionList={REPLY_GROUPS.map((value) => ({ label: value, value }))} style={{ width: 200 }} onChange={(value) => setGroup(String(value))} />
                </label>
                <label>
                    <div className="im-muted" style={{ marginBottom: 6 }}>
                        内容
                    </div>
                    <TextArea value={text} autosize={{ minRows: 3, maxRows: 6 }} placeholder="支持 {商品名}、{价格}、{订单号} 等变量" onChange={setText} />
                </label>
                {error && <Typography.Text type="danger">{error}</Typography.Text>}
            </div>
        </Modal>
    );
}

function ReplyPanel() {
    const { data } = useQuickReplies();
    const remove = useDeleteQuickReply();
    const { tableProps } = useTableDefaults();
    const [keyword, setKeyword] = useState('');
    const [group, setGroup] = useState<string | undefined>(undefined);
    const [editing, setEditing] = useState<QuickReplyView | null | undefined>(undefined);

    const rows = useMemo(
        () =>
            (data ?? []).filter(
                (item) =>
                    (!group || item.group === group) &&
                    (!keyword.trim() || item.text.toLowerCase().includes(keyword.trim().toLowerCase())),
            ),
        [data, group, keyword],
    );

    const actionsOf = (record: QuickReplyView): TableAction[] => [
        { key: 'edit', label: '编辑', onClick: () => setEditing(record) },
        {
            key: 'delete',
            label: '删除',
            danger: true,
            confirm: { title: '确定删除该快捷回复？', content: record.text },
            onClick: () => remove.mutate(record.id, { onSuccess: () => Toast.success('已删除') }),
        },
    ];

    const columns: ColumnProps<QuickReplyView>[] = [
        { title: '分组', dataIndex: 'group', width: 90, render: (value: string) => <Tag size="small">{value}</Tag> },
        { title: '内容', dataIndex: 'text', render: (value: string) => <div className="im-reply-text">{value}</div> },
        {
            title: '变量',
            key: 'vars',
            width: 180,
            render: (_: unknown, record: QuickReplyView) => {
                const vars = variablesOf(record.text);
                return vars.length ? vars.join(' / ') : <span className="im-muted">—</span>;
            },
        },
        { title: '使用次数', dataIndex: 'uses', width: 100 },
        { title: '操作', dataIndex: 'actions', fixed: 'right', width: 130 },
    ];

    const { columns: tableColumns } = useActionsColumn(columns, actionsOf);

    return (
        <>
            <div className="im-toolbar">
                <Input
                    placeholder="搜索快捷回复内容"
                    value={keyword}
                    onChange={setKeyword}
                    showClear
                    style={{ width: 240 }}
                />
                <Select
                    placeholder="全部分组"
                    value={group}
                    optionList={REPLY_GROUPS.map((value) => ({ label: value, value }))}
                    onChange={(value) => setGroup(value === undefined || value === '' ? undefined : String(value))}
                    showClear
                    style={{ width: 140 }}
                />
                <div className="im-toolbar__spacer" />
                <Button type="primary" theme="solid" onClick={() => setEditing(null)}>
                    新增快捷回复
                </Button>
            </div>
            <Table<QuickReplyView>
                {...tableProps}
                rowKey="id"
                columns={tableColumns}
                dataSource={rows}
                pagination={false}
            />
            {editing !== undefined && <ReplyModal record={editing} onClose={() => setEditing(undefined)} />}
        </>
    );
}

function WordModal({ record, onClose }: { record: SensitiveWordView | null; onClose: () => void }) {
    const save = useSaveSensitiveWord();
    const [word, setWord] = useState(record?.word ?? '');
    const [type, setType] = useState(record?.type ?? '关键词');
    const [level, setLevel] = useState(record?.level ?? '全局');
    const [match, setMatch] = useState(record?.match ?? '');
    const [action, setAction] = useState(record?.action ?? '硬拦截');
    const [on, setOn] = useState(record?.on ?? true);
    const [error, setError] = useState('');

    const submit = async () => {
        if (!word.trim()) {
            setError('请输入规则内容');
            return;
        }
        setError('');
        await save.mutateAsync({
            ...(record ? { id: record.id } : {}),
            body: {
                word: word.trim(),
                type,
                level,
                match: match.trim() || '关键词',
                action,
                hits: record?.hits ?? 0,
                on,
            },
        });
        Toast.success(record ? '敏感词规则已保存' : '敏感词规则已新增');
        onClose();
    };

    return (
        <Modal
            visible
            title={record ? '编辑敏感词规则' : '新增敏感词规则'}
            width={560}
            onCancel={onClose}
            onOk={() => void submit().catch(() => undefined)}
            okButtonProps={{ loading: save.isPending }}
            maskClosable={false}
        >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <label>
                    <div className="im-muted" style={{ marginBottom: 6 }}>
                        规则内容
                    </div>
                    <Input value={word} placeholder="关键词 / 正则 / 组合规则" onChange={setWord} />
                </label>
                <div style={{ display: 'flex', gap: 12 }}>
                    <label style={{ flex: 1 }}>
                        <div className="im-muted" style={{ marginBottom: 6 }}>
                            类型
                        </div>
                        <Select value={type} optionList={WORD_TYPES.map((value) => ({ label: value, value }))} style={{ width: '100%' }} onChange={(value) => setType(String(value))} />
                    </label>
                    <label style={{ flex: 1 }}>
                        <div className="im-muted" style={{ marginBottom: 6 }}>
                            生效范围
                        </div>
                        <Select value={level} optionList={WORD_LEVELS.map((value) => ({ label: value, value }))} style={{ width: '100%' }} onChange={(value) => setLevel(String(value))} />
                    </label>
                </div>
                <label>
                    <div className="im-muted" style={{ marginBottom: 6 }}>
                        匹配方式
                    </div>
                    <Input value={match} placeholder="如：关键词 + 归一化" onChange={setMatch} />
                </label>
                <div style={{ display: 'flex', gap: 12 }}>
                    <label style={{ flex: 1 }}>
                        <div className="im-muted" style={{ marginBottom: 6 }}>
                            处理动作
                        </div>
                        <Select value={action} optionList={WORD_ACTIONS.map((value) => ({ label: value, value }))} style={{ width: '100%' }} onChange={(value) => setAction(String(value))} />
                    </label>
                    <label style={{ flex: 1 }}>
                        <div className="im-muted" style={{ marginBottom: 6 }}>
                            启用
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, height: 32 }}>
                            <Switch checked={on} onChange={setOn} aria-label="启用该规则" />
                            <span className="im-muted">{on ? '启用' : '停用'}</span>
                        </div>
                    </label>
                </div>
                {error && <Typography.Text type="danger">{error}</Typography.Text>}
            </div>
        </Modal>
    );
}

function WordsPanel() {
    const { data } = useSensitiveWords();
    const save = useSaveSensitiveWord();
    const remove = useDeleteSensitiveWord();
    const { tableProps } = useTableDefaults();
    const [editing, setEditing] = useState<SensitiveWordView | null | undefined>(undefined);

    const actionsOf = (record: SensitiveWordView): TableAction[] => [
        { key: 'edit', label: '编辑', onClick: () => setEditing(record) },
        {
            key: 'delete',
            label: '删除',
            danger: true,
            confirm: { title: '确定删除该敏感词规则？', content: record.word },
            onClick: () => remove.mutate(record.id, { onSuccess: () => Toast.success('已删除') }),
        },
    ];

    const columns: ColumnProps<SensitiveWordView>[] = [
        { title: '规则', dataIndex: 'word', width: 170, render: (value: string) => <span className="im-rule-text">{value}</span> },
        { title: '类型', dataIndex: 'type', width: 90, render: (value: string) => <Tag size="small" color={value === '正则' ? 'blue' : 'grey'}>{value}</Tag> },
        { title: '范围', dataIndex: 'level', width: 80 },
        { title: '匹配方式', dataIndex: 'match', width: 170, render: (value: string) => <span className="im-muted">{value}</span> },
        {
            title: '启用',
            dataIndex: 'on',
            width: 70,
            render: (value: boolean, record: SensitiveWordView) => (
                <Switch
                    checked={value}
                    aria-label={`启用规则 ${record.word}`}
                    onChange={(checked) =>
                        save.mutate({ id: record.id, body: { on: checked } }, { onSuccess: () => Toast.success(checked ? '已启用' : '已停用') })
                    }
                />
            ),
        },
        { title: '操作', dataIndex: 'actions', fixed: 'right', width: 130 },
    ];

    const { columns: tableColumns } = useActionsColumn(columns, actionsOf);

    return (
        <>
            <div className="im-toolbar">
                <Typography.Text type="tertiary" size="small">
                    发送前拦截，服务端消息回调二次校验；命中即不发送并写入拦截记录。
                </Typography.Text>
                <div className="im-toolbar__spacer" />
                <Button type="primary" theme="solid" onClick={() => setEditing(null)}>
                    新增敏感词
                </Button>
            </div>
            <Table<SensitiveWordView>
                {...tableProps}
                rowKey="id"
                columns={tableColumns}
                dataSource={data ?? []}
                pagination={false}
            />
            {editing !== undefined && <WordModal record={editing} onClose={() => setEditing(undefined)} />}
        </>
    );
}

export default function ConfigPage() {
    const [tab, setTab] = useState('quiet');

    return (
        <PageContainer title="客服配置">
            <Tabs type="line" activeKey={tab} onChange={setTab}>
                <Tabs.TabPane itemKey="quiet" tab="群禁言">
                    <QuietPanel />
                </Tabs.TabPane>
                <Tabs.TabPane itemKey="recall" tab="撤回设置">
                    <RecallPanel />
                </Tabs.TabPane>
                <Tabs.TabPane itemKey="reply" tab="快捷回复">
                    <ReplyPanel />
                </Tabs.TabPane>
                <Tabs.TabPane itemKey="words" tab="敏感词">
                    <WordsPanel />
                </Tabs.TabPane>
            </Tabs>
        </PageContainer>
    );
}
