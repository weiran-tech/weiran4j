import { Form, Modal, Toast } from '@douyinfe/semi-ui';
import type { FormApi } from '@douyinfe/semi-ui/lib/es/form';
import { useMemo, useRef } from 'react';
import { STATUS_OPTIONS } from '@/components/StatusTag';
import { useSaveRegion } from '@/hooks/queries/regions';
import type { RegionLevel, RegionNode, RegionSaveRequest, Status } from '@/types/api';
import { flattenTree } from '@/utils/menu';

type Target = { mode: 'create'; parent: RegionNode | null } | { mode: 'edit'; record: RegionNode };

interface RegionForm {
    code: string;
    name: string;
    level: RegionLevel;
    parentCode?: string;
    sort: number;
    status: Status;
}

const LEVEL_OPTIONS = [
    { label: '省级', value: 'province' },
    { label: '市级', value: 'city' },
    { label: '县级', value: 'county' },
];

function parentLevel(level: RegionLevel): RegionLevel | null {
    if (level === 'city') return 'province';
    if (level === 'county') return 'city';
    return null;
}

function collectSubtreeCodes(nodes: readonly RegionNode[], code: string, output = new Set<string>()): Set<string> {
    for (const node of nodes) {
        if (node.code === code) {
            const collect = (current: RegionNode) => {
                output.add(current.code);
                current.children.forEach(collect);
            };
            collect(node);
            return output;
        }
        collectSubtreeCodes(node.children, code, output);
        if (output.size) return output;
    }
    return output;
}

function initialValues(target: Target): RegionForm {
    if (target.mode === 'edit') {
        const { record } = target;
        return {
            code: record.code,
            name: record.name,
            level: record.level,
            ...(record.parentCode ? { parentCode: record.parentCode } : {}),
            sort: record.sort,
            status: record.status,
        };
    }
    const level: RegionLevel = target.parent?.level === 'province' ? 'city' : target.parent?.level === 'city' ? 'county' : 'province';
    return {
        code: '',
        name: '',
        level,
        ...(target.parent ? { parentCode: target.parent.code } : {}),
        sort: 0,
        status: 'enabled',
    };
}

interface Props {
    target: Target;
    tree: RegionNode[];
    onClose: () => void;
}

export function RegionFormModal({ target, tree, onClose }: Props) {
    const isEdit = target.mode === 'edit';
    const api = useRef<FormApi<RegionForm> | null>(null);
    const save = useSaveRegion();
    const initial = initialValues(target);
    const disabledCodes = useMemo(
        () => (isEdit ? collectSubtreeCodes(tree, target.record.code) : new Set<string>()),
        [tree, target, isEdit],
    );

    const submit = async () => {
        const values = await api.current?.validate();
        if (!values) return;
        const body: RegionSaveRequest = {
            code: values.code.trim(),
            name: values.name.trim(),
            level: values.level,
            ...(values.level === 'province' ? { parentCode: null } : values.parentCode ? { parentCode: values.parentCode } : {}),
            sort: values.sort ?? 0,
            status: values.status,
        };
        await save.mutateAsync({ ...(isEdit ? { id: target.record.id } : {}), body });
        Toast.success(isEdit ? '已保存' : '已创建');
        onClose();
    };

    return (
        <Modal
            visible
            title={isEdit ? '编辑地区' : '新增地区'}
            onCancel={onClose}
            onOk={() => submit().catch(() => undefined)}
            okButtonProps={{ loading: save.isPending }}
            maskClosable={false}
        >
            <Form<RegionForm>
                getFormApi={(formApi) => {
                    api.current = formApi;
                }}
                initValues={initial}
                labelPosition="left"
                labelWidth={90}
            >
                {({ values }) => {
                    const selectedLevel = values.level ?? initial.level;
                    const requiredParentLevel = parentLevel(selectedLevel);
                    const parentOptions =
                        requiredParentLevel === null
                            ? []
                            : flattenTree(tree)
                                  .filter((node) => node.level === requiredParentLevel && !disabledCodes.has(node.code))
                                  .map((node) => ({ label: `${node.name}（${node.code}）`, value: node.code }));
                    return (
                        <>
                            <Form.Input
                                field="code"
                                label="区划代码"
                                maxLength={12}
                                disabled={isEdit}
                                {...(isEdit ? { extraText: '创建后不可修改' } : {})}
                                rules={[{ required: true, message: '请输入区划代码' }, { pattern: /^[0-9]{2,12}$/, message: '请输入 2 到 12 位数字区划代码' }]}
                            />
                            <Form.Input field="name" label="地区名称" maxLength={64} rules={[{ required: true, message: '请输入地区名称' }]} />
                            <Form.Select
                                field="level"
                                label="级别"
                                optionList={LEVEL_OPTIONS}
                                style={{ width: '100%' }}
                                onChange={() => api.current?.setValue('parentCode', undefined)}
                                rules={[{ required: true, message: '请选择地区级别' }]}
                            />
                            {requiredParentLevel && (
                                <Form.Select
                                    field="parentCode"
                                    label="上级地区"
                                    optionList={parentOptions}
                                    style={{ width: '100%' }}
                                    filter
                                    showClear
                                    placeholder={`选择${requiredParentLevel === 'province' ? '省级' : '市级'}地区`}
                                    rules={[{ required: true, message: '请选择上级地区' }]}
                                />
                            )}
                            <Form.InputNumber field="sort" label="排序" min={0} style={{ width: '100%' }} />
                            <Form.RadioGroup field="status" label="状态" options={STATUS_OPTIONS} />
                        </>
                    );
                }}
            </Form>
        </Modal>
    );
}
