import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockFetch, page, renderWithProviders } from '@/test/helpers';
import type { UserView } from '@/types/api';
import UsersPage, { EMPTY_FILTERS, formatDayRange, toQuery } from '../UsersPage';

const admin: UserView = {
    id: 1,
    username: 'admin',
    nickname: '超级管理员',
    email: null,
    phone: '13800000000',
    avatar: null,
    gender: 'male',
    departmentId: 1,
    departmentName: '总公司',
    status: 'enabled',
    isBuiltin: true,
    roleIds: [1],
    roleNames: ['超级管理员'],
    lastLoginAt: '2026-09-26 10:00:00',
    lastLoginIp: '127.0.0.1',
    createdAt: '2026-09-01 00:00:00',
    updatedAt: '2026-09-01 00:00:00',
};

const alice: UserView = { ...admin, id: 2, username: 'alice', nickname: '爱丽丝', isBuiltin: false, roleIds: [2], roleNames: ['编辑'], gender: 'female' };

function baseRoutes() {
    return {
        'GET /api/users': page([admin, alice], 2),
        'GET /api/dicts/code/sys_user_gender/items': [
            { id: 1, dictId: 1, label: '男', value: 'male', color: 'blue', sort: 1, status: 'enabled', remark: null },
            { id: 2, dictId: 1, label: '女', value: 'female', color: 'pink', sort: 2, status: 'enabled', remark: null },
        ],
        'GET /api/dicts/code/sys_common_status/items': [],
        'GET /api/departments': [],
        'GET /api/roles/options': [
            { id: 1, name: '超级管理员', code: 'super_admin' },
            { id: 2, name: '编辑', code: 'editor' },
        ],
    };
}

describe('UsersPage', () => {
    afterEach(() => vi.unstubAllGlobals());

    it('拉取分页列表并渲染用户、字典标签', async () => {
        const { calls } = mockFetch(baseRoutes());
        renderWithProviders(<UsersPage />);

        expect(await screen.findByText('alice')).toBeInTheDocument();
        expect(screen.getByText('admin')).toBeInTheDocument();
        // 性别走字典 sys_user_gender 渲染成中文标签
        expect(await screen.findByText('女')).toBeInTheDocument();
        const listCall = calls.find((c) => c.path === '/api/users');
        expect(listCall?.search).toBe('?page=1&pageSize=20');
    });

    it('列设置（偏好默认开启）：隐藏「手机」列后表头不再有它，设置按页面存本机', async () => {
        mockFetch(baseRoutes());
        renderWithProviders(<UsersPage />);
        await screen.findByText('alice');
        expect(screen.getByRole('columnheader', { name: '手机' })).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: '列设置' }));
        const panel = await screen.findByLabelText('列设置', { selector: '.column-settings' });
        fireEvent.click(within(panel).getByRole('checkbox', { name: '手机' }));
        await waitFor(() => expect(screen.queryByRole('columnheader', { name: '手机' })).toBeNull());
        expect(localStorage.getItem('weiran_table_columns:system/users')).toContain('phone');
    });

    it('关键字查询带上 keyword 并回到第 1 页', async () => {
        const { calls } = mockFetch(baseRoutes());
        renderWithProviders(<UsersPage />);
        await screen.findByText('alice');

        fireEvent.change(screen.getByPlaceholderText('用户名 / 昵称 / 手机'), { target: { value: 'ali' } });
        fireEvent.click(screen.getByRole('button', { name: '查询' }));

        await waitFor(() => expect(calls.some((c) => c.path === '/api/users' && c.search.includes('keyword=ali'))).toBe(true));
    });

    it('内置用户的删除按钮禁用；删除普通用户调用 DELETE', async () => {
        const { calls } = mockFetch({ ...baseRoutes(), 'DELETE /api/users/2': null });
        renderWithProviders(<UsersPage />);
        await screen.findByText('alice');

        const deleteButtons = screen.getAllByRole('button', { name: '删除' });
        expect(deleteButtons[0]).toBeDisabled();
        fireEvent.click(deleteButtons[1]!);

        const confirm = await screen.findByText('确定删除该用户？');
        const popup = confirm.closest('.semi-popconfirm') as HTMLElement;
        fireEvent.click(within(popup).getByRole('button', { name: /确定/ }));

        await waitFor(() => expect(calls.some((c) => c.method === 'DELETE' && c.path === '/api/users/2')).toBe(true));
    });

    it('新增用户：提交后 POST /api/users，请求体字段符合契约', async () => {
        const { calls } = mockFetch({ ...baseRoutes(), 'POST /api/users': { id: 3 } });
        renderWithProviders(<UsersPage />);
        await screen.findByText('alice');

        fireEvent.click(screen.getByRole('button', { name: '新增用户' }));
        const dialog = await screen.findByRole('dialog');
        const inputs = within(dialog);
        fireEvent.change(inputs.getByLabelText('用户名'), { target: { value: 'bob' } });
        fireEvent.change(inputs.getByLabelText('昵称'), { target: { value: '鲍勃' } });
        fireEvent.change(inputs.getByLabelText('初始密码'), { target: { value: 'secret123' } });
        // Modal 底部按钮在 jsdom 下按 role+name 匹配不到，按可见文字找
        fireEvent.click(inputs.getByText('确定').closest('button')!);

        await waitFor(() => expect(calls.some((c) => c.method === 'POST' && c.path === '/api/users')).toBe(true));
        const post = calls.find((c) => c.method === 'POST' && c.path === '/api/users');
        expect(post?.body).toMatchObject({
            username: 'bob',
            nickname: '鲍勃',
            password: 'secret123',
            status: 'enabled',
            roleIds: [],
            gender: 'unknown',
            departmentId: null,
        });
    });

    it('没有写权限时不显示新增与操作列', async () => {
        mockFetch(baseRoutes());
        renderWithProviders(<UsersPage />, { permissions: ['system:user:list'] });
        await screen.findByText('alice');
        expect(screen.queryByRole('button', { name: '新增用户' })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: '编辑' })).not.toBeInTheDocument();
    });
    describe('搜索栏：新增在最左 + 已选条件标签', () => {
        // 按查询参数真实过滤：keyword 按用户名包含，status=disabled 时只剩 alice
        const routes = () => ({
            ...baseRoutes(),
            'GET /api/users': (_: unknown, url: URL) => {
                const keyword = url.searchParams.get('keyword');
                const status = url.searchParams.get('status');
                const list = [admin, alice].filter(
                    (u) => (!keyword || u.username.includes(keyword)) && (status !== 'disabled' || u.id === alice.id),
                );
                return page(list, list.length);
            },
            'GET /api/dicts/code/sys_common_status/items': [
                { id: 11, dictId: 2, label: '启用', value: 'enabled', color: 'green', sort: 1, status: 'enabled', remark: null },
                { id: 12, dictId: 2, label: '禁用', value: 'disabled', color: 'grey', sort: 2, status: 'enabled', remark: null },
            ],
        });
        const conditionTexts = () =>
            [...document.querySelectorAll('.search-conditions__text')].map((e) => e.textContent);
        const lastListSearch = (calls: { path: string; search: string }[]) => calls.filter((c) => c.path === '/api/users').at(-1)?.search;

        it('「新增用户」是工具栏第一个控件', async () => {
            mockFetch(routes());
            renderWithProviders(<UsersPage />);
            await screen.findByText('alice');
            const first = document.querySelector('.search-toolbar button, .search-toolbar input');
            expect(first?.textContent).toContain('新增用户');
        });

        it('标签只反映已查询的条件；状态显示名称；删掉一个即去掉该条件重新查询，输入框同步清空', async () => {
            const { calls } = mockFetch(routes());
            renderWithProviders(<UsersPage />);
            await screen.findByText('alice');
            const input = screen.getByPlaceholderText('用户名 / 昵称 / 手机');
            fireEvent.change(input, { target: { value: 'ali' } });
            // 还没点查询：不出标签
            expect(screen.queryByRole('group', { name: '已选条件' })).toBeNull();

            // Semi Select 要点容器才展开；选项里带 aria-label="tick" 的勾选图标，可访问名称是「tick 禁用」，所以用正则
            fireEvent.click(within(document.querySelector('.search-toolbar') as HTMLElement).getByText('状态').closest('.semi-select') as HTMLElement);
            fireEvent.click(await screen.findByRole('option', { name: /禁用/ }));
            fireEvent.click(screen.getByRole('button', { name: /查询/ }));
            await waitFor(() => expect(conditionTexts()).toEqual(['关键字：ali', '状态：禁用']));
            await waitFor(() => expect(lastListSearch(calls)).toBe('?page=1&pageSize=20&keyword=ali&status=disabled'));

            fireEvent.click(screen.getByRole('button', { name: '移除条件 关键字：ali' }));
            await waitFor(() => expect(conditionTexts()).toEqual(['状态：禁用']));
            expect(input).toHaveValue('');
            await waitFor(() => expect(lastListSearch(calls)).toBe('?page=1&pageSize=20&status=disabled'));
            // 按设计稿，只剩一个条件时也有「清空」
            expect(within(screen.getByRole('group', { name: '已选条件' })).getByRole('button', { name: '清空' })).toBeInTheDocument();

            expect(screen.queryByText('admin')).toBeNull();

            // 删掉最后一个条件：回到未筛选（命中打开页面时的查询缓存，不一定再发请求），admin 重新出现
            fireEvent.click(screen.getByRole('button', { name: '移除条件 状态：禁用' }));
            await waitFor(() => expect(screen.queryByRole('group', { name: '已选条件' })).toBeNull());
            expect(await screen.findByText('admin')).toBeInTheDocument();
        });

        it('多个条件时「清空」一次去掉全部', async () => {
            mockFetch(routes());
            renderWithProviders(<UsersPage />);
            await screen.findByText('alice');
            fireEvent.change(screen.getByPlaceholderText('用户名 / 昵称 / 手机'), { target: { value: 'ali' } });
            fireEvent.click(within(document.querySelector('.search-toolbar') as HTMLElement).getByText('状态').closest('.semi-select') as HTMLElement);
            fireEvent.click(await screen.findByRole('option', { name: /启用/ }));
            fireEvent.click(screen.getByRole('button', { name: /查询/ }));
            const group = await screen.findByRole('group', { name: '已选条件' });
            await waitFor(() => expect(screen.queryByText('admin')).toBeNull());
            fireEvent.click(within(group).getByRole('button', { name: '清空' }));
            await waitFor(() => expect(screen.queryByRole('group', { name: '已选条件' })).toBeNull());
            expect(await screen.findByText('admin')).toBeInTheDocument();
            expect(screen.getByPlaceholderText('用户名 / 昵称 / 手机')).toHaveValue('');
        });

        const field = (panel: HTMLElement, label: string) =>
            within(panel).getByText(label, { selector: '.search-field__label' }).closest('.search-field') as HTMLElement;
        const pick = async (panel: HTMLElement, label: string, option: RegExp) => {
            fireEvent.click(field(panel, label).querySelector('.semi-select') as HTMLElement);
            fireEvent.click(await screen.findByRole('option', { name: option }));
        };

        it('高级筛选默认收起；展开后按设计稿顺序放出 10 个单字段条件，所属部门 / 状态与工具栏共用草稿（FR-006）', async () => {
            mockFetch(routes());
            renderWithProviders(<UsersPage />);
            await screen.findByText('alice');
            const toggle = screen.getByRole('button', { name: '高级筛选' });
            expect(toggle).toHaveAttribute('aria-expanded', 'false');
            expect(screen.queryByRole('region', { name: '高级筛选' })).toBeNull();

            fireEvent.click(toggle);
            const panel = screen.getByRole('region', { name: '高级筛选' });
            expect(toggle).toHaveAttribute('aria-expanded', 'true');
            expect([...panel.querySelectorAll('.search-field__label')].map((e) => e.textContent)).toEqual([
                '用户名',
                '用户 ID',
                '手机号',
                '邮箱',
                '所属部门',
                '角色',
                '状态',
                '性别',
                '创建时间',
                '最后登录时间',
            ]);
            // 状态在面板与工具栏共用草稿
            await pick(panel, '状态', /禁用/);
            const toolbar = document.querySelector('.search-toolbar') as HTMLElement;
            expect(within(toolbar).getByText('禁用')).toBeInTheDocument();
        });

        it('面板的「展开 / 收起」切换字段区（窄屏限高两行、可滚动由样式实现）；搜索 / 重置在字段区之外', async () => {
            mockFetch(routes());
            renderWithProviders(<UsersPage />);
            await screen.findByText('alice');
            fireEvent.click(screen.getByRole('button', { name: '高级筛选' }));
            const panel = screen.getByRole('region', { name: '高级筛选' });
            const more = within(panel).getByRole('button', { name: /展开/ });
            expect(more).toHaveAttribute('aria-expanded', 'false');
            expect(panel).not.toHaveClass('search-advanced--expanded');
            fireEvent.click(more);
            expect(within(panel).getByRole('button', { name: /收起/ })).toHaveAttribute('aria-expanded', 'true');
            expect(panel).toHaveClass('search-advanced--expanded');
            // 操作行不在（会被限高裁掉的）字段区里
            const fields = panel.querySelector('.search-advanced__fields') as HTMLElement;
            expect(within(fields).queryByRole('button', { name: '搜索' })).toBeNull();
            expect(within(panel.querySelector('.search-advanced__actions') as HTMLElement).getByRole('button', { name: '搜索' })).toBeInTheDocument();
        });

        it('面板「搜索」发出单字段参数；已选条件显示可读值，删掉一个即去掉该参数并回第 1 页、面板控件清空（FR-006 / FR-007）', async () => {
            const { calls } = mockFetch(routes());
            renderWithProviders(<UsersPage />);
            await screen.findByText('alice');
            fireEvent.click(screen.getByRole('button', { name: '高级筛选' }));
            const panel = screen.getByRole('region', { name: '高级筛选' });

            fireEvent.change(within(field(panel, '用户名')).getByPlaceholderText('请输入用户名'), { target: { value: ' alice ' } });
            fireEvent.change(within(field(panel, '邮箱')).getByPlaceholderText('请输入邮箱地址'), { target: { value: 'a@x.com' } });
            await pick(panel, '角色', /编辑/);
            await pick(panel, '性别', /女/);
            fireEvent.click(within(panel).getByRole('button', { name: '搜索' }));

            await waitFor(() =>
                expect(lastListSearch(calls)).toBe('?page=1&pageSize=20&username=alice&email=a%40x.com&roleId=2&gender=female'),
            );
            expect(conditionTexts()).toEqual(['用户名：alice', '邮箱：a@x.com', '角色：编辑', '性别：女']);

            fireEvent.click(screen.getByRole('button', { name: '移除条件 角色：编辑' }));
            await waitFor(() => expect(lastListSearch(calls)).toBe('?page=1&pageSize=20&username=alice&email=a%40x.com&gender=female'));
            expect(conditionTexts()).toEqual(['用户名：alice', '邮箱：a@x.com', '性别：女']);
            expect(within(field(panel, '角色')).queryByText('编辑')).toBeNull();
        });

        it('右侧工具：列设置在前、刷新在后；刷新按当前条件重新拉取', async () => {
            const { calls } = mockFetch(routes());
            renderWithProviders(<UsersPage />);
            await screen.findByText('alice');
            const tools = document.querySelector('.search-toolbar__tools') as HTMLElement;
            expect(within(tools).getAllByRole('button').map((b) => b.getAttribute('aria-label'))).toEqual(['列设置', '刷新']);
            const before = calls.filter((c) => c.path === '/api/users').length;
            fireEvent.click(within(tools).getByRole('button', { name: '刷新' }));
            await waitFor(() => expect(calls.filter((c) => c.path === '/api/users').length).toBe(before + 1));
            expect(lastListSearch(calls)).toBe('?page=1&pageSize=20');
        });
    });
});

describe('toQuery / formatDayRange（按天的时间范围）', () => {
    const sep1 = new Date(2026, 8, 1, 10, 20, 30);
    const sep27 = new Date(2026, 8, 27);

    it('时间范围补成当天 00:00:00 / 23:59:59；只有一端时只发那一端；空条件不发', () => {
        expect(toQuery({ ...EMPTY_FILTERS, createdRange: [sep1, sep27], lastLoginRange: [sep1] }, 1, 20)).toEqual({
            page: 1,
            pageSize: 20,
            createdStartTime: '2026-09-01 00:00:00',
            createdEndTime: '2026-09-27 23:59:59',
            lastLoginStartTime: '2026-09-01 00:00:00',
        });
        expect(toQuery(EMPTY_FILTERS, 2, 50)).toEqual({ page: 2, pageSize: 50 });
    });

    it('字符串条件去首尾空白，空白即不发；用户 ID 原样', () => {
        expect(toQuery({ ...EMPTY_FILTERS, username: ' bob ', phone: '  ', userId: 7 }, 1, 20)).toEqual({
            page: 1,
            pageSize: 20,
            username: 'bob',
            userId: 7,
        });
    });

    it('标签文本：两端「开始 ~ 结束」，单端「≥ / ≤」，未选 null', () => {
        expect(formatDayRange([sep1, sep27])).toBe('2026-09-01 ~ 2026-09-27');
        expect(formatDayRange([sep1])).toBe('≥ 2026-09-01');
        expect(formatDayRange([undefined as unknown as Date, sep27])).toBe('≤ 2026-09-27');
        expect(formatDayRange(undefined)).toBeNull();
    });
});
