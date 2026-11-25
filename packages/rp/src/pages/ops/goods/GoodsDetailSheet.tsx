import type { ReactNode } from 'react';
import type { OpsGoodsRow, OpsLog, OpsUserRow } from '@/hooks/queries/ops';
import { OpsDetailSheet, OpsKv, OpsPlainTag, OpsSection, OpsStatusTag, money } from '../ops';

/** 商品操作记录：时间字段推导出的生命周期 + 后台手动操作 */
export function goodsLogs(row: OpsGoodsRow, users?: OpsUserRow[]): OpsLog[] {
    const seller = row.userId ? (users?.find((user) => user.uid === row.userId)?.nickname ?? row.userId) : '';
    const rows: OpsLog[] = [];
    const push = (time: string, action: string, operator: string, remark: string) => {
        if (time) rows.push({ time, action, operator, remark });
    };
    push(row.createdAt, '创建商品', row.source === '后台' ? '运营-后台' : seller, row.source === '后台' ? '后台录入商品' : '卖家提交商品');
    push(row.onAt, '商品上架', seller || '运营-后台', '进入在售列表');
    push(row.offAt, '商品下架', '运营-后台', '退出在售列表');
    push(row.soldAt, '商品售出', '系统', '订单成交，自动置为已售出');
    push(row.deletedAt, '商品删除', '运营-后台', '软删除，保留操作记录');
    return [...rows, ...(Array.isArray(row.logs) ? row.logs : [])];
}

export function GoodsDetailSheet({
    row,
    users,
    onClose,
}: {
    row: OpsGoodsRow;
    users?: OpsUserRow[];
    onClose: () => void;
}) {
    const seller = users?.find((user) => user.uid === row.userId);
    const buyer = users?.find((user) => user.uid === row.buyerUid);
    const info: [string, ReactNode][] = [
        ['商品编号', <span className="ops-mono">{row.code}</span>],
        ['氪金联盟编号', row.unionId ? <span className="ops-mono">{row.unionId}</span> : '—'],
        ['商品标题', row.title],
        ['用户ID', row.userId ? `${row.userId}${seller ? `（${seller.nickname}）` : ''}` : '—'],
        ['来源', <OpsPlainTag value={row.source} brand={row.source === '用户'} />],
        ['游戏', row.game],
        ['渠道', row.channel],
        ['大区', row.region],
        ['服务器', row.server],
        ['游戏账号', <span className="ops-mono">{row.account}</span>],
        ['售价', <span className="ops-money">{money(row.price)}</span>],
    ];
    if (row.buyerUid) info.push(['买家ID', `${row.buyerUid}${buyer ? `（${buyer.nickname}）` : ''}`]);
    info.push(['当前状态', <OpsStatusTag value={row.status} />]);

    return (
        <OpsDetailSheet visible title={`商品详情 · ${row.code}`} onClose={onClose}>
            <OpsSection title="商品信息" />
            <OpsKv items={info} />
            <OpsSection title="时间信息" />
            <OpsKv
                items={[
                    ['创建时间', row.createdAt],
                    ['上架时间', row.onAt],
                    ['下架时间', row.offAt],
                    ['删除时间', row.deletedAt],
                    ['售出时间', row.soldAt],
                ]}
            />
        </OpsDetailSheet>
    );
}
