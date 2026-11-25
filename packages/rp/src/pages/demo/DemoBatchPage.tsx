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
    { label: '下载正常 Excel', href: '/samples/excelTemplate.xlsx' },
    { label: '下载正常 ZIP', href: '/samples/zipTemplate.zip' },
    { label: '下载错误 Excel', href: '/samples/excelErrorTemplate.xlsx' },
    { label: '下载错误 ZIP', href: '/samples/zipErrorTemplate.zip' },
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
    return <BatchJobWorkbench title="批处理任务" description="浏览器本地模拟：上传后展示固定的三条处理结果"
        kinds={KINDS} samples={SAMPLES} ResultPanel={DemoResultPanel}
        sampleHint="示例文件可下载；本原型不解析内容，正常与错误样例均展示模拟成功结果。"
        uploadHint="选择 Excel 或 ZIP 查看模拟流程，文件不会发送至服务器。" />;
}
