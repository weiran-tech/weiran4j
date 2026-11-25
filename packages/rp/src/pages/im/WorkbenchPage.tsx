import { sitePath } from '@/prototype/catalog';
import { Button, Input, Modal, Select, Spin, Tag, TextArea, Toast } from '@douyinfe/semi-ui';
import { ExternalLink, Send, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useChatConvAll, useChatMessages, useSaveChatConv, useSaveChatMessage, useStaffAll } from '@/hooks/queries/im';
import type { ChatConvView, ChatMessageView, ConvStatus, ConvType, StaffStatus } from '@/types/api';
import { currentTime, formatMoney } from './workbench-utils';
import './im.css';
import './im-workbench.css';

const TYPE_META: Record<ConvType, { label: string; color: 'blue' | 'purple' }> = {
    presale: { label: '售前', color: 'blue' },
    trade: { label: '交易', color: 'purple' },
};

const STATUS_META: Record<ConvStatus, { label: string; color: 'green' | 'orange' | 'grey' }> = {
    active: { label: '进行中', color: 'green' },
    pending: { label: '待回复', color: 'orange' },
    suspended: { label: '已挂起', color: 'grey' },
    closed: { label: '已关闭', color: 'grey' },
};

const STAFF_STATUS_LABEL: Record<StaffStatus, string> = { online: '在线', busy: '挂起', offline: '离线' };

function TransferModal({ record, onClose }: { record: ChatConvView; onClose: () => void }) {
    const save = useSaveChatConv();
    const saveMessage = useSaveChatMessage();
    const { data: staff } = useStaffAll();
    const [assignee, setAssignee] = useState(record.assignee);
    const options = (staff ?? [])
        .filter((item) => item.enabled && item.name !== record.assignee)
        .map((item) => ({ label: `${item.name}（${STAFF_STATUS_LABEL[item.status]}）`, value: item.name }));

    const submit = async () => {
        await save.mutateAsync({ id: record.id, body: { assignee } });
        await saveMessage.mutateAsync({
            body: { convId: record.id, role: 'sys', name: '', time: currentTime(), text: `会话已转接给 ${assignee}` },
        });
        Toast.success(`已转接给 ${assignee}`);
        onClose();
    };

    return (
        <Modal
            visible
            title="转接会话"
            onCancel={onClose}
            onOk={() => void submit().catch(() => undefined)}
            okButtonProps={{ loading: save.isPending || saveMessage.isPending, disabled: assignee === record.assignee }}
            maskClosable={false}
        >
            <div className="im-muted" style={{ marginBottom: 8 }}>
                当前接待 <b>{record.assignee}</b> · {record.groupId}。转接后新客服可查看全部历史消息，原客服退出会话。
            </div>
            <Select value={assignee} optionList={options} style={{ width: '100%' }} onChange={(value) => setAssignee(String(value))} />
        </Modal>
    );
}

export default function WorkbenchPage() {
    const params = useMemo(() => new URLSearchParams(window.location.search), []);
    const staffCode = params.get('staff');
    const convParam = Number(params.get('conv'));

    const { data: staff, isPending: staffPending } = useStaffAll();
    const { data: convs, isPending: convsPending } = useChatConvAll();
    const { data: messages } = useChatMessages();
    const saveMessage = useSaveChatMessage();
    const saveConv = useSaveChatConv();

    const [tab, setTab] = useState<'all' | ConvType>('all');
    const [keyword, setKeyword] = useState('');
    const [selectedId, setSelectedId] = useState<number | undefined>(convParam || undefined);
    const [draft, setDraft] = useState('');
    const [transferOpen, setTransferOpen] = useState(false);
    const listRef = useRef<HTMLDivElement>(null);

    const agent = useMemo(() => {
        const list = staff ?? [];
        return list.find((item) => item.code === staffCode || item.name === staffCode) ?? list[0];
    }, [staff, staffCode]);

    const myConvs = useMemo(() => {
        if (!agent) return [];
        return (convs ?? []).filter((item) => item.assignee === agent.name);
    }, [convs, agent]);

    const visibleConvs = useMemo(
        () =>
            myConvs.filter(
                (item) =>
                    (tab === 'all' || item.type === tab) &&
                    (!keyword.trim() || `${item.buyer}${item.title}${item.groupId}`.toLowerCase().includes(keyword.trim().toLowerCase())),
            ),
        [myConvs, tab, keyword],
    );

    const activeConv = useMemo(() => {
        if (!visibleConvs.length) return undefined;
        return visibleConvs.find((item) => item.id === selectedId) ?? visibleConvs[0];
    }, [visibleConvs, selectedId]);

    const convMessages = useMemo(
        () => (messages ?? []).filter((item) => item.convId === activeConv?.id).sort((a, b) => a.id - b.id),
        [messages, activeConv],
    );

    useEffect(() => {
        const el = listRef.current;
        if (el) el.scrollTop = el.scrollHeight;
    }, [activeConv?.id, convMessages.length]);

    const send = async () => {
        const text = draft.trim();
        if (!text || !activeConv || !agent) return;
        await saveMessage.mutateAsync({
            body: { convId: activeConv.id, role: 'agent', name: agent.name, time: currentTime(), text },
        });
        await saveConv.mutateAsync({ id: activeConv.id, body: { lastMessage: text, lastTime: currentTime() } });
        setDraft('');
    };

    if (staffPending || convsPending) {
        return (
            <div className="imwb" style={{ alignItems: 'center', justifyContent: 'center' }}>
                <Spin size="large" />
            </div>
        );
    }

    const online = agent?.status === 'online';

    return (
        <div className="imwb">
            <header className="imwb__header">
                <div className="imwb__brand">
                    <div className="imwb__logo">阿</div>
                    示例商贸 · 客服工作台
                </div>
                <div className="imwb__agent">
                    <Tag size="small" color={online ? 'green' : 'grey'}>
                        {agent ? STAFF_STATUS_LABEL[agent.status] : '未选择客服'}
                    </Tag>
                    {agent?.name ?? '—'}
                </div>
                <div className="imwb__spacer" />
                <Button theme="borderless" icon={<ExternalLink size={14} />} onClick={() => window.open(sitePath('/manage/im/chats'), '_self')}>
                    管理端
                </Button>
                <Button theme="borderless" icon={<X size={14} />} onClick={() => window.close()}>
                    关闭
                </Button>
            </header>

            <div className="imwb__body">
                <aside className="imwb__list">
                    <div className="imwb__tabs">
                        {([
                            ['all', '全部'],
                            ['presale', '售前'],
                            ['trade', '交易'],
                        ] as const).map(([key, label]) => (
                            <button key={key} type="button" className={`imwb__tab${tab === key ? ' on' : ''}`} onClick={() => setTab(key)}>
                                {label}
                            </button>
                        ))}
                    </div>
                    <div className="imwb__search">
                        <Input placeholder="搜索买家 / 群名称 / 群 ID" value={keyword} onChange={setKeyword} showClear size="small" />
                    </div>
                    <div className="imwb__convs">
                        {visibleConvs.length ? (
                            visibleConvs.map((conv) => (
                                <div
                                    key={conv.id}
                                    className={`imwb__conv${conv.id === activeConv?.id ? ' on' : ''}`}
                                    onClick={() => setSelectedId(conv.id)}
                                    role="button"
                                    tabIndex={0}
                                    onKeyDown={(event) => {
                                        if (event.key === 'Enter') setSelectedId(conv.id);
                                    }}
                                >
                                    <div className="imwb__avatar" style={{ background: conv.buyerColor }}>
                                        {conv.buyerAvatar}
                                    </div>
                                    <div className="imwb__conv-main">
                                        <div className="imwb__conv-line">
                                            <span className="imwb__conv-name">{conv.buyer}</span>
                                            <Tag size="small" color={TYPE_META[conv.type].color}>
                                                {TYPE_META[conv.type].label}
                                            </Tag>
                                            <span className="imwb__conv-time">{conv.lastTime}</span>
                                        </div>
                                        <div className="imwb__conv-last">
                                            <span>{conv.lastMessage}</span>
                                            {conv.unread > 0 && <span className="imwb__unread">{conv.unread}</span>}
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="imwb__empty">暂无分配给你的会话</div>
                        )}
                    </div>
                </aside>

                <section className="imwb__chat">
                    {activeConv ? (
                        <>
                            <div className="imwb__chat-head">
                                <div className="imwb__avatar" style={{ background: activeConv.buyerColor }}>
                                    {activeConv.buyerAvatar}
                                </div>
                                <div>
                                    <div className="imwb__chat-title">
                                        {activeConv.title}
                                        <Tag size="small" color={TYPE_META[activeConv.type].color}>
                                            {TYPE_META[activeConv.type].label}
                                        </Tag>
                                        <span className="im-muted">{activeConv.groupId}</span>
                                    </div>
                                    <div className="imwb__chat-sub">
                                        <span>
                                            <span className={`imwb__dot${activeConv.buyerOnline ? '' : ' off'}`} /> 买家{activeConv.buyerOnline ? '在线' : '离线'}
                                        </span>
                                        <span>·</span>
                                        <span>{STATUS_META[activeConv.status].label}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="imwb__msgs" ref={listRef}>
                                {convMessages.map((message: ChatMessageView) =>
                                    message.role === 'sys' ? (
                                        <div key={message.id} className="imwb__sys">
                                            <span>{message.text}</span>
                                        </div>
                                    ) : (
                                        <div key={message.id} className={`imwb__msg${message.role === 'agent' ? ' agent' : ''}`}>
                                            <div
                                                className="imwb__avatar"
                                                style={{
                                                    width: 28,
                                                    height: 28,
                                                    borderRadius: 7,
                                                    fontSize: 11,
                                                    background: message.role === 'agent' ? '#dbe6ff' : activeConv.buyerColor,
                                                }}
                                            >
                                                {message.name.slice(0, 1) || '客'}
                                            </div>
                                            <div className="imwb__msg-body">
                                                <div className="imwb__msg-name">
                                                    <span>{message.name || (message.role === 'seller' ? '卖家' : '买家')}</span>
                                                    <span>{message.time}</span>
                                                </div>
                                                <div className="imwb__bubble">{message.text}</div>
                                            </div>
                                        </div>
                                    ),
                                )}
                            </div>

                            <div className="imwb__composer">
                                <TextArea
                                    value={draft}
                                    placeholder="输入消息，Enter 发送，Shift + Enter 换行"
                                    autosize={{ minRows: 2, maxRows: 5 }}
                                    onChange={setDraft}
                                    onKeyDown={(event) => {
                                        if (event.key === 'Enter' && !event.shiftKey) {
                                            event.preventDefault();
                                            void send().catch(() => Toast.error('发送失败'));
                                        }
                                    }}
                                />
                                <div className="imwb__composer-bar">
                                    <span className="imwb__composer-hint">当前身份：{agent?.name ?? '客服'} · 消息将发送到群内买家与卖家</span>
                                    <Button
                                        type="primary"
                                        theme="solid"
                                        icon={<Send size={14} />}
                                        loading={saveMessage.isPending || saveConv.isPending}
                                        disabled={!draft.trim()}
                                        onClick={() => void send().catch(() => Toast.error('发送失败'))}
                                    >
                                        发送
                                    </Button>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="imwb__empty">暂无会话，请从左侧选择一个会话</div>
                    )}
                </section>

                <aside className="imwb__side">
                    {activeConv ? (
                        <>
                            <div className="imwb__card">
                                <div className="imwb__card-title">客户信息</div>
                                <dl className="imwb__kv">
                                    <dt>买家</dt>
                                    <dd>{activeConv.buyer}</dd>
                                    <dt>用户 ID</dt>
                                    <dd>{activeConv.uid}</dd>
                                    <dt>手机号</dt>
                                    <dd>{activeConv.phone}</dd>
                                    <dt>注册时间</dt>
                                    <dd>{activeConv.registered}</dd>
                                    <dt>来源</dt>
                                    <dd>{activeConv.source}</dd>
                                    <dt>历史订单</dt>
                                    <dd>
                                        {activeConv.orders} 单 · GMV {formatMoney(activeConv.gmv)}
                                    </dd>
                                </dl>
                            </div>

                            <div className="imwb__card">
                                <div className="imwb__card-title">关联订单</div>
                                <dl className="imwb__kv">
                                    <dt>订单号</dt>
                                    <dd>{activeConv.orderId}</dd>
                                    <dt>商品</dt>
                                    <dd>{activeConv.orderTitle}</dd>
                                    <dt>金额</dt>
                                    <dd>{formatMoney(activeConv.orderPrice)}</dd>
                                    <dt>状态</dt>
                                    <dd>{activeConv.orderStatus}</dd>
                                    <dt>卖家</dt>
                                    <dd>{activeConv.seller}</dd>
                                </dl>
                            </div>

                            <div className="imwb__card">
                                <div className="imwb__card-title">群成员</div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                    {activeConv.members.map((member) => (
                                        <Tag key={`${member.name}-${member.role}`} size="small" color={member.online ? 'green' : 'grey'}>
                                            {member.role} · {member.name}
                                        </Tag>
                                    ))}
                                </div>
                            </div>

                            <div className="imwb__card">
                                <Button
                                    type="primary"
                                    theme="light"
                                    block
                                    disabled={activeConv.status === 'closed'}
                                    onClick={() => setTransferOpen(true)}
                                >
                                    转接会话
                                </Button>
                            </div>

                            {transferOpen && <TransferModal record={activeConv} onClose={() => setTransferOpen(false)} />}
                        </>
                    ) : (
                        <div className="imwb__empty">选择会话后查看客户与订单信息</div>
                    )}
                </aside>
            </div>
        </div>
    );
}
