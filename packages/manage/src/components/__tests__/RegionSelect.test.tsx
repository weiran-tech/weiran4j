import { fireEvent, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders, mockFetch } from '@/test/helpers';
import type { RegionNode } from '@/types/api';
import { RegionSelect, toRegionCascaderData } from '../RegionSelect';

const regionTree: RegionNode[] = [
    {
        id: 1,
        code: '110000',
        name: '北京市',
        level: 'province',
        parentCode: null,
        sort: 1,
        status: 'enabled',
        createdAt: '',
        updatedAt: '',
        children: [
            {
                id: 2,
                code: '110100',
                name: '市辖区',
                level: 'city',
                parentCode: '110000',
                sort: 1,
                status: 'enabled',
                createdAt: '',
                updatedAt: '',
                children: [
                    {
                        id: 3,
                        code: '110101',
                        name: '东城区',
                        level: 'county',
                        parentCode: '110100',
                        sort: 1,
                        status: 'enabled',
                        createdAt: '',
                        updatedAt: '',
                        children: [],
                    },
                ],
            },
            {
                id: 4,
                code: '110200',
                name: '停用市',
                level: 'city',
                parentCode: '110000',
                sort: 2,
                status: 'disabled',
                createdAt: '',
                updatedAt: '',
                children: [],
            },
        ],
    },
];

describe('RegionSelect', () => {
    it('移除停用节点及其后代，只生成启用节点的 code 层级树', () => {
        const options = toRegionCascaderData(regionTree);
        expect(options).toEqual([
            {
                label: '北京市',
                value: '110000',
                children: [{ label: '市辖区', value: '110100', children: [{ label: '东城区', value: '110101' }] }],
            },
        ]);
    });

    it('选择县级地区时回调完整区划代码路径，且不显示停用地区', async () => {
        const { calls } = mockFetch({ 'GET /api-backend/region/area/getEnabledTree': regionTree });
        const onChange = vi.fn();
        renderWithProviders(<RegionSelect onChange={onChange} />);

        await waitFor(() => expect(calls.some((call) => call.path === '/api-backend/region/area/getEnabledTree')).toBe(true));
        const cascader = screen.getByRole('combobox', { name: 'Cascader' });
        fireEvent.click(cascader);
        fireEvent.click(await screen.findByRole('menuitem', { name: /北京市/ }));
        fireEvent.click(await screen.findByRole('menuitem', { name: /市辖区/ }));
        expect(screen.queryByRole('menuitem', { name: '停用市' })).not.toBeInTheDocument();
        fireEvent.click(await screen.findByRole('menuitem', { name: /东城区/ }));
        expect(onChange).toHaveBeenLastCalledWith(['110000', '110100', '110101']);
    });

    it('受控 code path 按 lookup 树显示对应的地区名称', async () => {
        mockFetch({ 'GET /api-backend/region/area/getEnabledTree': regionTree });
        renderWithProviders(<RegionSelect value={['110000', '110100', '110101']} />);

        await waitFor(() =>
            expect(screen.getByRole('combobox', { name: 'Cascader' })).toHaveTextContent('北京市 / 市辖区 / 东城区'),
        );
    });
});
