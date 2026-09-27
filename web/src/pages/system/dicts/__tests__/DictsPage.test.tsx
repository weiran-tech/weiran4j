import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockFetch, page, renderWithProviders } from '@/test/helpers';
import type { DictItemView, DictView } from '@/types/api';
import DictsPage from '../DictsPage';

const dict = (id: number, name: string, code: string, extra: Partial<DictView> = {}): DictView => ({
    id,
    name,
    code,
    description: null,
    status: 'enabled',
    isBuiltin: false,
    createdAt: '2026-09-27 14:18:50',
    updatedAt: '2026-09-27 14:18:50',
    ...extra,
});

const dicts = [
    dict(1, '职称级别', 'professional_title_level'),
    dict(2, '政治面貌', 'political_status', { status: 'disabled' }),
    dict(3, '性别', 'sys_user_gender', { isBuiltin: true }),
];

const item = (id: number, dictId: number, label: string): DictItemView => ({
    id,
    dictId,
    label,
    value: String(id),
    color: null,
    sort: 0,
    status: 'enabled',
    remark: null,
});

function setup(permissions = ['*']) {
    const fetch = mockFetch({
        'GET /api/dicts': page(dicts),
        'GET /api/dicts/1/items': [item(11, 1, '高级')],
        'GET /api/dicts/2/items': [item(21, 2, '党员')],
        'GET /api/dicts/3/items': [item(31, 3, '男')],
    });
    renderWithProviders(<DictsPage />, { permissions });
    return fetch;
}

const listItem = (name: string) => screen.getByText(name).closest('.nav-list-item') as HTMLElement;

describe('DictsPage 左侧字典列表（NavListPanel，同 mono4ts）', () => {
    afterEach(() => vi.unstubAllGlobals());

    it('每项「名称 · 编码」+ 创建时间，停用 / 内置带标签；默认选中第一项并加载其字典项', async () => {
        setup();
        expect(await screen.findByText('professional_title_level')).toBeInTheDocument();
        const first = listItem('职称级别');
        expect(within(first).getByText('2026-09-27 14:18:50')).toBeInTheDocument();
        expect(first).toHaveClass('nav-list-item--active');
        expect(within(listItem('政治面貌')).getByText('停用')).toBeInTheDocument();
        expect(listItem('政治面貌')).toHaveClass('nav-list-item--disabled');
        expect(within(listItem('性别')).getByText('内置')).toBeInTheDocument();
        expect(await screen.findByText('高级')).toBeInTheDocument();
    });

    it('点击切换选中字典，右侧跟着换字典项', async () => {
        setup();
        fireEvent.click(await screen.findByText('政治面貌'));
        expect(await screen.findByText('党员')).toBeInTheDocument();
        expect(listItem('政治面貌')).toHaveClass('nav-list-item--active');
        expect(listItem('职称级别')).not.toHaveClass('nav-list-item--active');
    });

    it('条目「…」菜单：编辑打开表单且不切换选中；内置字典不可删除', async () => {
        setup();
        await screen.findByText('professional_title_level');
        fireEvent.click(screen.getByRole('button', { name: '性别的操作' }));
        const deleteItem = await screen.findByText('内置字典不可删除');
        expect(deleteItem.closest('li')).toHaveClass('semi-dropdown-item-disabled');
        fireEvent.click(await screen.findByRole('menuitem', { name: /编辑/ }));
        expect(await screen.findByDisplayValue('sys_user_gender')).toBeInTheDocument();
        expect(listItem('职称级别')).toHaveClass('nav-list-item--active');
    });

    it('搜索框回车按名称 / 编码查询并回到第一页', async () => {
        const fetch = setup();
        await screen.findByText('professional_title_level');
        const input = screen.getByRole('textbox', { name: '名称 / 编码' });
        fireEvent.change(input, { target: { value: ' 性别 ' } });
        fireEvent.keyDown(input, { key: 'Enter', keyCode: 13 });
        fireEvent.keyPress(input, { key: 'Enter', code: 'Enter', keyCode: 13, charCode: 13 });
        await waitFor(() => expect(fetch.calls.some((c) => c.path === '/api/dicts' && c.search.includes('keyword=%E6%80%A7%E5%88%AB'))).toBe(true));
        expect(fetch.calls.at(-1)?.search).toContain('page=1');
    });

    it('编辑当前选中的字典后，右栏标题跟着列表刷新（sys_dict.md#01）', async () => {
        let list = dicts;
        mockFetch({
            'GET /api/dicts': () => page(list),
            'PUT /api/dicts/1': (init?: RequestInit) => {
                const body = JSON.parse(init?.body as string) as Partial<DictView>;
                list = list.map((d) => (d.id === 1 ? { ...d, ...body } : d));
                return null;
            },
            'GET /api/dicts/1/items': [item(11, 1, '高级')],
        });
        renderWithProviders(<DictsPage />);
        expect(await screen.findByText('字典项：职称级别（professional_title_level）')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: '职称级别的操作' }));
        fireEvent.click(await screen.findByRole('menuitem', { name: /编辑/ }));
        const nameInput = await screen.findByDisplayValue('职称级别');
        fireEvent.change(nameInput, { target: { value: '职称等级' } });
        // Modal 进场动画期间 jsdom 把它判为不可访问，getByRole 找不到，按文字定位按钮
        fireEvent.click(screen.getByText('确定').closest('button') as HTMLElement);
        expect(await screen.findByText('字典项：职称等级（professional_title_level）')).toBeInTheDocument();
    });

    it('没有增删改权限时条目不显示「…」，标题栏菜单只有刷新', async () => {
        setup(['system:dict:query']);
        await screen.findByText('professional_title_level');
        expect(screen.queryByRole('button', { name: '职称级别的操作' })).toBeNull();
        fireEvent.click(screen.getByRole('button', { name: '字典列表操作' }));
        expect(await screen.findByText('刷新')).toBeInTheDocument();
        expect(screen.queryByText('新增字典')).toBeNull();
    });
});
