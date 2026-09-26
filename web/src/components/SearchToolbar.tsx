import { Button, Space } from '@douyinfe/semi-ui';
import { RotateCcw, Search } from 'lucide-react';
import type { ReactNode } from 'react';

interface SearchToolbarProps {
    /** 筛选控件 */
    children?: ReactNode;
    /** 右侧操作（新增等） */
    actions?: ReactNode;
    onSearch?: () => void;
    onReset?: () => void;
}

/** 列表页顶部：左侧筛选 + 查询/重置，右侧操作按钮 */
export function SearchToolbar({ children, actions, onSearch, onReset }: SearchToolbarProps) {
    return (
        <div className="search-toolbar">
            <Space wrap spacing={8}>
                {children}
                {onSearch && (
                    <Button type="primary" icon={<Search size={14} />} onClick={onSearch}>
                        查询
                    </Button>
                )}
                {onReset && (
                    <Button type="tertiary" icon={<RotateCcw size={14} />} onClick={onReset}>
                        重置
                    </Button>
                )}
            </Space>
            {actions && <Space spacing={8}>{actions}</Space>}
        </div>
    );
}
