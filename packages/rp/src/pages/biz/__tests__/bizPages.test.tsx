import { fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockFetch, renderWithProviders } from '@/test/helpers';
import { createBizSeed } from '@/mocks/seed-biz';
import PayoutAccountsPage from '../pay/PayoutAccountsPage';
import MerchantsPage from '../pay/MerchantsPage';
import RoutesPage from '../pay/RoutesPage';
import PayRulesPage from '../pay/PayRulesPage';
import TradeRulesPage from '../pay/TradeRulesPage';
import AccountsPage from '../pay/AccountsPage';
import PayFlowsPage from '../finance/PayFlowsPage';
import RefundsPage from '../finance/RefundsPage';
import WithdrawalsPage from '../finance/WithdrawalsPage';
import UnwithdrawnPage from '../finance/UnwithdrawnPage';
import VouchersPage from '../finance/VouchersPage';
import ExportJobsPage from '../finance/ExportJobsPage';

const seed = createBizSeed();

/** 用真实种子数据搭路由表：页面渲染的就是原型里的那一批行 */
function routes(): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (const [table, rows] of Object.entries(seed)) {
        out[`GET /api-backend/biz/${table}/listAll`] = rows;
    }
    out['GET /api-backend/biz/bizPayRule/get/1'] = (seed.bizPayRule ?? [])[0];
    out['PUT /api-backend/biz/bizPayRule/update/1'] = null;
    out['GET /api-backend/biz/bizTradeRule/get/1'] = (seed.bizTradeRule ?? [])[0];
    out['PUT /api-backend/biz/bizTradeRule/update/1'] = null;
    for (const table of Object.keys(seed)) {
        out[`PUT /api-backend/biz/${table}/update/1`] = null;
        out[`POST /api-backend/biz/${table}/create`] = { id: 999 };
        out[`DELETE /api-backend/biz/${table}/delete/1`] = null;
    }
    return out;
}

afterEach(() => vi.unstubAllGlobals());

describe('商户后台页面渲染', () => {
    it('账户管理：一条 = 主体 × 类型 × 结算账户，四个 KPI 与状态切换都在', async () => {
        mockFetch(routes());
        renderWithProviders(<AccountsPage />);
        expect(await screen.findByText('AC001')).toBeInTheDocument();
        // 11 条账户：可用 9（AC005 冻结、AC008 异常），冻结 1、异常 1
        expect(screen.getByText('11')).toBeInTheDocument();
        expect(screen.getByText('9')).toBeInTheDocument();
        // 账号脱敏：只露前 2 位与后 4 位
        expect(screen.getByText('62**********6789')).toBeInTheDocument();
        // 两个独立开关各自一枚标签：AC008 是「异常」，AC005 是「冻结」
        expect(screen.getAllByRole('button', { name: '异常' }).length).toBeGreaterThan(0);
        expect(screen.getAllByRole('button', { name: '冻结' }).length).toBeGreaterThan(0);
        // 被引用列要能回答「动了会怎样」
        expect(screen.getAllByText(/出款 \d+ \/ 收款 \d+/).length).toBeGreaterThan(0);
    });

    it('出款账户：列表用别名，账户从「账户管理」带出，每种到账方式只启用一条', async () => {
        mockFetch(routes());
        renderWithProviders(<PayoutAccountsPage />);
        // 别名是列表的主标识，不再用 PA001 这种编号当标题
        expect((await screen.findAllByText('银行卡出款主用')).length).toBeGreaterThan(0);
        // 账户列显示脱敏账号（来自引用账户 AC001），不显示完整卡号
        expect(screen.getAllByText('62**********6789').length).toBeGreaterThan(0);
        // 启用的两条：银行卡 PA001、支付宝 PA003；PA002 / PA004 / PA005 未启用
        expect(screen.getAllByRole('button', { name: '已启用' })).toHaveLength(2);
        expect(screen.getAllByRole('button', { name: '未启用' })).toHaveLength(3);
        // 支付宝 5 项齐全；微信缺 AppID = 5/6
        expect(screen.getByText('5/5')).toBeInTheDocument();
        expect(screen.getByText('5/6')).toBeInTheDocument();
        // 方式列区分线上 / 线下
        expect(screen.getAllByText('线上').length).toBeGreaterThan(0);
    });

    it('收款商户：只剩「收款渠道」一个页签，主体不再是页签', async () => {
        mockFetch(routes());
        renderWithProviders(<MerchantsPage />);
        expect(await screen.findByText('MC001')).toBeInTheDocument();
        // 主体页签已删除 —— 主体搬到「账户管理」，由渠道引用
        expect(screen.queryByRole('tab', { name: /收款主体/ })).toBeNull();
        // 渠道行显示的是账户带出的公司主体
        expect(screen.getAllByText('示例商贸有限公司').length).toBeGreaterThan(0);
        // 线下渠道不进池
        expect(screen.getAllByText('不进池').length).toBeGreaterThan(0);
        // 线下渠道的账户虽然异常，但线下不看渠道健康度 —— 不标红、不拦
        expect(screen.queryByText('主体账户异常')).toBeNull();
        expect(screen.queryByText('主体账户异常，不可开启')).toBeNull();
    });

    it('路由分流：微信池里两条渠道按权重算占比（100 : 60）', async () => {
        mockFetch(routes());
        renderWithProviders(<RoutesPage />);
        expect(await screen.findByText('汇付微信01')).toBeInTheDocument();
        expect(screen.getByText('易宝微信01')).toBeInTheDocument();
        // 100 / 160 ≈ 63%，60 / 160 ≈ 38%
        expect(screen.getAllByText('63%').length).toBeGreaterThan(0);
        expect(screen.getAllByText('38%').length).toBeGreaterThan(0);
        // 单渠道的池子写「独占」逻辑：支付宝池里 MC002 与 MC004 都存在，故这里是多渠道
        expect(screen.getAllByText(/按权重随机命中一条/).length).toBe(2);
    });

    it('交易规则：两笔费用各给一行试算，按 ¥20 与 ¥1,000 各算一遍', async () => {
        mockFetch(routes());
        renderWithProviders(<TradeRulesPage />);
        expect(await screen.findByText('交易手续费')).toBeInTheDocument();
        expect(screen.getByText('包赔费')).toBeInTheDocument();
        // 交易手续费 10%：¥20 → 收 ¥2、到手 ¥18；¥1,000 → 收 ¥100、到手 ¥900
        expect(screen.getByText(/收 ¥2\.00，卖家到手 ¥18\.00/)).toBeInTheDocument();
        expect(screen.getByText(/收 ¥100\.00，卖家到手 ¥900\.00/)).toBeInTheDocument();
        // 包赔费默认 10%、最低 ¥10、最高 ¥1,000：¥20 按 ¥10 兜底、¥1,000 按 10% 收 ¥100
        expect(screen.getByText(/收 ¥10\.00，买家合计 ¥30\.00/)).toBeInTheDocument();
        expect(screen.getByText(/收 ¥100\.00，买家合计 ¥1,100\.00/)).toBeInTheDocument();
        expect(screen.getByText(/已叠加下限 \/ 上限约束/)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: '提交更新' })).toBeInTheDocument();
    });

    it('提现规则：只剩返利提现的闸门与两种到账方式，不再有交易手续费', async () => {
        mockFetch(routes());
        renderWithProviders(<PayRulesPage />);
        expect(await screen.findByText('通用规则')).toBeInTheDocument();
        expect(screen.getByText('用户提现返利金到支付宝账号')).toBeInTheDocument();
        expect(screen.getByText('用户提现返利金到储蓄卡')).toBeInTheDocument();
        // 交易手续费已拆到「交易规则」，这一页不该再出现
        expect(screen.queryByText('交易手续费')).toBeNull();
        // 试算按 ¥35 的返利提现
        expect(screen.getAllByText(/提现 ¥35/).length).toBe(2);
    });

    it('支付流水：成功率只在成功 + 失败之间算，渠道名用别名', async () => {
        mockFetch(routes());
        renderWithProviders(<PayFlowsPage />);
        expect(await screen.findByText('PF2611030001')).toBeInTheDocument();
        // 汇付聚合01 出现在多条流水上（同一通道的多次支付尝试）
        expect(screen.getAllByText('汇付聚合01').length).toBeGreaterThan(0);
        // 全量 21 笔
        expect(screen.getByText('21', { selector: '.biz-kpi__v' })).toBeInTheDocument();
        // 页签里「待支付」有 2 笔
        expect(screen.getByRole('tab', { name: /待支付/ }).textContent).toContain('2');
    });

    it('退款管理：在途金额只算退款中 + 结果未知，不含失败', async () => {
        mockFetch(routes());
        renderWithProviders(<RefundsPage />);
        expect(await screen.findByText('RF261103005')).toBeInTheDocument();
        // 在途 = 300（unknown）+ 880（processing）= 1180
        expect(screen.getByText('¥ 1,180')).toBeInTheDocument();
        // 失败两笔都在列
        expect(screen.getByText('RF261103006')).toBeInTheDocument();
        expect(screen.getByText(/渠道不支持放款后原路退款/)).toBeInTheDocument();
    });

    it('提现管理：合并提现单页签给出待审核 / 异常两个可操作入口', async () => {
        mockFetch(routes());
        renderWithProviders(<WithdrawalsPage />);
        expect(await screen.findByText('PW261110001')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: '审核' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: '处置' })).toBeInTheDocument();
        // 明细构成拆成货款 / 奖励
        expect(screen.getByText('货款 2 + 奖励 5')).toBeInTheDocument();
    });

    it('提现管理：订单提现页签把被合并的那几笔指到所属提现单', async () => {
        mockFetch(routes());
        renderWithProviders(<WithdrawalsPage />);
        await screen.findByText('PW261110001');
        fireEvent.click(screen.getByRole('tab', { name: /订单提现/ }));
        expect(await screen.findByText('WD261104010')).toBeInTheDocument();
        expect(screen.getAllByRole('button', { name: '所属提现单' }).length).toBeGreaterThan(0);
    });

    it('未提现订单：渠道单等卖家、线下单等客服，停留天数按真实今天算', async () => {
        mockFetch(routes());
        renderWithProviders(<UnwithdrawnPage />);
        expect(await screen.findByText('OD261103006')).toBeInTheDocument();
        expect(screen.getByText('待客服登记打款')).toBeInTheDocument();
        expect(screen.getAllByText('待卖家发起').length).toBeGreaterThan(0);
        // 超过 7 天那张卡存在（样例里 OD261102014 / OD261106020 等已压多日）
        expect(screen.getByText('超过 7 天没动')).toBeInTheDocument();
    });

    it('财务凭证：按流水号查到单据后逐个账户给出命中结果', async () => {
        mockFetch(routes());
        renderWithProviders(<VouchersPage />);
        await screen.findByText(/可用流水号试试/);
        // 种子里 WD261103001 的流水号
        fireEvent.change(screen.getByPlaceholderText('如 CMB2026110311310042'), { target: { value: 'CMB2026110311310042' } });
        fireEvent.click(screen.getByRole('button', { name: '查询' }));
        await waitFor(() => expect(screen.getByText('WD261103001')).toBeInTheDocument());
        expect(screen.getByText(/命中 4 个出款账户|命中 \d+ 个出款账户/)).toBeInTheDocument();
    });

    it('导出管理：四个统计数与状态页签，失败任务给重试', async () => {
        mockFetch(routes());
        renderWithProviders(<ExportJobsPage />);
        expect(await screen.findByText('EXP261103001')).toBeInTheDocument();
        expect(screen.getByText('EXP261102001')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: '重试' })).toBeInTheDocument();
        // 占用空间只算已完成：1.2 + 3.8 = 5.0
        expect(screen.getByText('5')).toBeInTheDocument();
    });
});
