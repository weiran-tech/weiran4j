import { Table, Typography } from '@douyinfe/semi-ui';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { BatchJobWorkbench, type BatchJob, type BatchPageResult } from '@/components/BatchJobWorkbench';
import { tableScrollX, useTableDefaults } from '@/hooks/useTableDefaults';
import { http } from '@/utils/request';

interface DemoItem { id: number; itemNo: number; itemName: string; itemValue: string }

const KINDS = [
    { label: 'Excel 逐行导入', value: 'demo_excel', accept: '.xlsx' },
    { label: 'ZIP 逐文件处理', value: 'demo_zip', accept: '.zip' },
];
const SAMPLES = [
    { label: '下载正常 Excel', href: '/api-backend/demo/batchItem/excelTemplate' },
    { label: '下载正常 ZIP', href: '/api-backend/demo/batchItem/zipTemplate' },
    { label: '下载错误 Excel', href: '/api-backend/demo/batchItem/excelErrorTemplate' },
    { label: '下载错误 ZIP', href: '/api-backend/demo/batchItem/zipErrorTemplate' },
];

function DemoResultPanel({ job }: { job: BatchJob }) {
    const [page, setPage] = useState(1);
    const { tableProps } = useTableDefaults();
    const items = useQuery({
        queryKey: ['demo-batch-items', job.id, page],
        queryFn: () => http.get<BatchPageResult<DemoItem>>(`/api-backend/demo/batchItem/list/${job.id}?page=${page}&pageSize=20`),
    });
    const columns = [
        { title: 'ID', dataIndex: 'id', width: 90 },
        { title: '序号', dataIndex: 'itemNo', width: 90 },
        { title: 'name / 文件路径', dataIndex: 'itemName', width: 250 },
        { title: 'value / SHA-256', dataIndex: 'itemValue' },
    ];
    return <>
        <strong>已写入的演示数据（{items.data?.total ?? 0} 条）</strong>
        <Table<DemoItem> {...tableProps} rowKey="id" dataSource={items.data?.list ?? []} loading={items.isPending}
            columns={columns} scroll={{ x: `max(100%, ${tableScrollX(columns)}px)` }} pagination={{ currentPage: page, pageSize: 20, total: items.data?.total ?? 0,
                showTotal: true, onChange: (nextPage) => setPage(nextPage) }} />
        {items.isError && <Typography.Text type="danger">导入数据读取失败，请刷新页面重试。</Typography.Text>}
    </>;
}

export default function DemoBatchPage() {
    return <BatchJobWorkbench title="批处理任务" description="local/test 真实任务：Excel 逐行导入，ZIP 逐文件计算摘要"
        kinds={KINDS} samples={SAMPLES} ResultPanel={DemoResultPanel}
        sampleHint="错误 Excel 含 2 行空字段；错误 ZIP 含 2 个不支持的文件。上传后点击「预检」查看错误明细。"
        uploadHint="Excel 最大 5 MB、10000 行；ZIP 最大 100 MB、1000 个文件，单文件解压后最大 10 MB。" />;
}
