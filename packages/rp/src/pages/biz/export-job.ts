import { useBizCreate } from '@/hooks/queries/biz';
import type { BizExportJobView } from '@/types/biz';

const pad = (n: number) => String(n).padStart(2, '0');

export interface ExportInput {
    kind: string;
    /** 来源页面名（列表里显示，与 kind 的中文名一致） */
    menu: string;
    /** 导出范围描述，跟着当前筛选走 */
    filter: string;
    rows: number;
}

/**
 * 提交一个导出任务。
 *
 * 原型没有真的后端：任务直接以「已完成」落库，文件是名字 + 估算大小 ——
 * 点「下载」给的是同一句提示。这样「导出管理」里的状态、进度、过期、
 * 下载次数都有真实数据可看，而不是一堆写死的假行。
 */
export function useCreateExport() {
    const create = useBizCreate<BizExportJobView>('bizExportJob');
    return (input: ExportInput) => {
        const now = new Date();
        const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}`;
        const code = `EXP${stamp.replace('_', '')}${pad(now.getSeconds())}`;
        const expire = new Date(now);
        expire.setDate(expire.getDate() + 7);
        const body: Partial<BizExportJobView> = {
            code,
            kind: input.kind,
            menu: input.menu,
            filter: input.filter,
            rows: input.rows,
            state: 'done',
            progress: 100,
            at: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`,
            doneAt: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`,
            file: `${input.menu}_${stamp}.xlsx`,
            size: `${Math.max(0.1, Math.round((input.rows * 0.0007) * 10) / 10).toFixed(1)} MB`,
            expireAt: `${expire.getFullYear()}-${pad(expire.getMonth() + 1)}-${pad(expire.getDate())}`,
            downloads: 0,
            by: '原型管理员',
            err: '',
        };
        create.mutate(body);
        return code;
    };
}
