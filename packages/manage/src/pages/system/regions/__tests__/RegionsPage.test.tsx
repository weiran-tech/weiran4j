import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockFetch, renderWithProviders } from '@/test/helpers';
import type { RegionNode, RegionView } from '@/types/api';
import RegionsPage from '../RegionsPage';

const beijing: RegionNode = {
    id: 10,
    code: '110000',
    name: '北京市',
    level: 'province',
    parentCode: null,
    sort: 1,
    status: 'enabled',
    createdAt: '2026-10-01 00:00:00',
    updatedAt: '2026-10-01 00:00:00',
    children: [
        {
            id: 11,
            code: '110100',
            name: '北京市辖区',
            level: 'city',
            parentCode: '110000',
            sort: 1,
            status: 'enabled',
            createdAt: '2026-10-01 00:00:00',
            updatedAt: '2026-10-01 00:00:00',
            children: [],
        },
    ],
};

const shanghai: RegionNode = {
    ...beijing,
    id: 9,
    code: '310000',
    name: '上海市',
    children: [],
};

const baseRoutes = () => ({
    'GET /api-backend/region/area/listTree': [shanghai, beijing],
    'PUT /api-backend/region/area/update/10': { ...beijing, status: 'disabled' },
    'DELETE /api-backend/region/area/delete/9': null,
});

describe('RegionsPage', () => {
    afterEach(() => vi.unstubAllGlobals());

    it('首次失败显示持久错误，重试成功后显示地区', async () => {
        let failing = true;
        mockFetch({
            ...baseRoutes(),
            'GET /api-backend/region/area/listTree': () => failing
                ? Response.json({ code: 100000, message: '读取失败' }, { status: 500 }) : [beijing],
        });
        renderWithProviders(<RegionsPage />);
        const alert = await screen.findByRole('alert', { name: '列表加载失败' });
        expect(alert).toHaveTextContent('加载失败');
        expect(screen.queryByText('暂无记录')).not.toBeInTheDocument();
        expect(screen.queryByText('暂无数据')).not.toBeInTheDocument();
        failing = false;
        fireEvent.click(within(alert).getByRole('button', { name: '重试' }));
        expect(await screen.findByText('北京市')).toBeInTheDocument();
        await waitFor(() => expect(screen.queryByRole('alert', { name: '列表加载失败' })).not.toBeInTheDocument());
    });

    it('地区刷新失败保留旧数据，空结果可以清空筛选', async () => {
        let failing = false;
        mockFetch({
            ...baseRoutes(),
            'GET /api-backend/region/area/listTree': (_init: unknown, url: URL) => failing
                ? Response.json({ code: 100000, message: '读取失败' }, { status: 500 })
                : url.searchParams.has('keyword') ? [] : [beijing],
        });
        renderWithProviders(<RegionsPage />);
        await screen.findByText('北京市');
        failing = true;
        fireEvent.click(screen.getByRole('button', { name: '刷新' }));
        const alert = await screen.findByRole('alert', { name: '列表加载失败' });
        expect(alert).toHaveTextContent('更新失败');
        expect(screen.getByText('北京市')).toBeInTheDocument();
        failing = false;
        fireEvent.click(within(alert).getByRole('button', { name: '重试' }));
        await waitFor(() => expect(screen.queryByRole('alert', { name: '列表加载失败' })).not.toBeInTheDocument());
        fireEvent.change(screen.getByPlaceholderText('地区名称 / 区划代码'), { target: { value: 'none' } });
        fireEvent.click(screen.getByRole('button', { name: '搜索' }));
        await screen.findByText('没有匹配结果');
        fireEvent.click(screen.getByRole('button', { name: '清空条件' }));
        expect(await screen.findByText('北京市')).toBeInTheDocument();
    });

    it('成功的未筛选空列表显示暂无记录', async () => {
        mockFetch({ ...baseRoutes(), 'GET /api-backend/region/area/listTree': [] });
        renderWithProviders(<RegionsPage />);
        expect(await screen.findByText('暂无记录')).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: '清空条件' })).not.toBeInTheDocument();
    });

    it('筛选后自动展开三级路径，手动折叠后刷新保持，清空和重新筛选正确初始化', async () => {
        const city = beijing.children[0]!;
        const county: RegionNode = { ...city, id: 12, code: '110101', name: '东城区', level: 'county', parentCode: city.code };
        const tree = [{ ...beijing, children: [{ ...city, children: [county] }] }];
        const { calls } = mockFetch({ ...baseRoutes(), 'GET /api-backend/region/area/listTree': tree });
        renderWithProviders(<RegionsPage />);
        await screen.findByText('北京市');
        expect(screen.queryByText('东城区')).not.toBeInTheDocument();
        const input = screen.getByPlaceholderText('地区名称 / 区划代码');
        fireEvent.change(input, { target: { value: '东城' } });
        fireEvent.click(screen.getByRole('button', { name: '搜索' }));
        expect(await screen.findByText('东城区')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: '全部收起' }));
        expect(screen.queryByText('东城区')).not.toBeInTheDocument();
        const before = calls.length;
        fireEvent.click(screen.getByRole('button', { name: '刷新' }));
        await waitFor(() => expect(calls.length).toBeGreaterThan(before));
        await waitFor(() => expect(document.querySelector('.semi-spin-spinning')).not.toBeInTheDocument());
        expect(screen.queryByText('东城区')).not.toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: '移除条件 关键字：东城' }));
        expect(screen.queryByText('北京市辖区')).not.toBeInTheDocument();
        fireEvent.change(input, { target: { value: '110101' } });
        fireEvent.click(screen.getByRole('button', { name: '搜索' }));
        expect(await screen.findByText('东城区')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: '重置' }));
        expect(screen.queryByText('北京市辖区')).not.toBeInTheDocument();
    });

    it('把地区行展开按钮放在名称列，并支持全部展开/收起', async () => {
        mockFetch(baseRoutes());
        renderWithProviders(<RegionsPage />);

        await screen.findByText('北京市');
        expect(screen.getByRole('columnheader', { name: 'ID' })).toBeInTheDocument();
        expect(screen.getByRole('columnheader', { name: '地区名称' })).toBeInTheDocument();
        expect(screen.queryByText('北京市辖区')).not.toBeInTheDocument();

        const rows = [...document.querySelectorAll('.semi-table-body tbody tr')];
        expect(rows.map((row) => row.querySelector('td')?.textContent?.trim())).toEqual(['10', '9']);

        const beijingRow = screen.getByText('北京市').closest('tr');
        expect(beijingRow).not.toBeNull();
        const expandButton = within(beijingRow as HTMLElement).getByRole('button', { name: '展开北京市' });
        expect(beijingRow?.querySelectorAll('td')[1]).toContainElement(expandButton);
        fireEvent.click(expandButton);
        expect(await screen.findByText('北京市辖区')).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: '全部收起' }));
        expect(screen.queryByText('北京市辖区')).not.toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: '全部展开' }));
        expect(await screen.findByText('北京市辖区')).toBeInTheDocument();
    });

    it('提交当前关键字和级别筛选，并显示已生效条件', async () => {
        const { calls } = mockFetch({
            ...baseRoutes(),
            'GET /api-backend/region/area/listTree': (_init: unknown, url: URL) => {
                if (url.searchParams.get('keyword') === '北京') return [beijing];
                return [shanghai, beijing];
            },
        });
        renderWithProviders(<RegionsPage />);
        await screen.findByText('北京市');

        fireEvent.change(screen.getByPlaceholderText('地区名称 / 区划代码'), { target: { value: '北京' } });
        const toolbar = document.querySelector('.search-toolbar') as HTMLElement;
        fireEvent.click(within(toolbar).getByRole('button', { name: '搜索' }));

        await waitFor(() => expect(calls.some((call) => call.path === '/api-backend/region/area/listTree' && call.search === '?keyword=%E5%8C%97%E4%BA%AC')).toBe(true));
        expect(await screen.findByRole('group', { name: '已选条件' })).toHaveTextContent('关键字：北京');
        fireEvent.click(screen.getByRole('button', { name: '移除条件 关键字：北京' }));
        await waitFor(() => expect(screen.queryByRole('group', { name: '已选条件' })).not.toBeInTheDocument());
    });

    it('根据 update 权限显示启停操作并提交状态变更', async () => {
        const { calls } = mockFetch(baseRoutes());
        renderWithProviders(<RegionsPage />, { permissions: ['region:list', 'region:update'] });
        await screen.findByText('北京市');

        const beijingRow = screen.getByText('北京市').closest('tr') as HTMLElement;
        fireEvent.click(within(beijingRow).getByRole('button', { name: '停用' }));
        await waitFor(() => expect(calls.some((call) => call.method === 'PUT' && call.path === '/api-backend/region/area/update/10')).toBe(true));
        expect(calls.find((call) => call.method === 'PUT')?.body).toMatchObject({ code: '110000', status: 'disabled' });
    });

    it('新增省级地区时提交契约字段且不带父级代码', async () => {
        const created: RegionView = {
            id: 12,
            code: '120000',
            name: '天津市',
            level: 'province',
            parentCode: null,
            sort: 0,
            status: 'enabled',
            createdAt: '2026-10-01 00:00:00',
            updatedAt: '2026-10-01 00:00:00',
        };
        const { calls } = mockFetch({ ...baseRoutes(), 'POST /api-backend/region/area/create': created });
        renderWithProviders(<RegionsPage />);
        await screen.findByText('北京市');
        fireEvent.click(screen.getByRole('button', { name: '新增地区' }));

        const dialog = await screen.findByRole('dialog');
        const form = within(dialog);
        fireEvent.change(form.getByLabelText('区划代码'), { target: { value: '120000' } });
        fireEvent.change(form.getByLabelText('地区名称'), { target: { value: '天津市' } });
        fireEvent.click(form.getByText('确定').closest('button')!);

        await waitFor(() => expect(calls.some((call) => call.method === 'POST' && call.path === '/api-backend/region/area/create')).toBe(true));
        expect(calls.find((call) => call.method === 'POST')?.body).toMatchObject({
            code: '120000',
            name: '天津市',
            level: 'province',
            parentCode: null,
            sort: 0,
            status: 'enabled',
        });
    });

    it('没有写权限时隐藏新增、导出和行操作入口', async () => {
        mockFetch(baseRoutes());
        renderWithProviders(<RegionsPage />, { permissions: ['region:list'] });
        await screen.findByText('北京市');
        expect(screen.queryByRole('button', { name: '新增地区' })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: '导出 CSV' })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: '编辑' })).not.toBeInTheDocument();
    });

    it('导出使用当前已应用筛选，而不依赖树展开状态', async () => {
        const { calls } = mockFetch({
            ...baseRoutes(),
            'GET /api-backend/region/area/export': new Response('id,name\n10,北京市', {
                headers: { 'Content-Type': 'text/csv; charset=utf-8' },
            }),
        });
        vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:regions');
        vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
        vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
        renderWithProviders(<RegionsPage />);
        await screen.findByText('北京市');

        fireEvent.change(screen.getByPlaceholderText('地区名称 / 区划代码'), { target: { value: '北京' } });
        fireEvent.click(within(document.querySelector('.search-toolbar') as HTMLElement).getByRole('button', { name: '搜索' }));
        await waitFor(() => expect(calls.some((call) => call.path === '/api-backend/region/area/listTree' && call.search.includes('keyword='))).toBe(true));
        fireEvent.click(screen.getByRole('button', { name: '导出 CSV' }));

        await waitFor(() => expect(calls.some((call) => call.path === '/api-backend/region/area/export' && call.search.includes('keyword='))).toBe(true));
    });
});
