import { Button, Empty } from '@douyinfe/semi-ui';
import { FileQuestion } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { HOME_PATH } from '@/config';

export default function NotFoundPage() {
    const navigate = useNavigate();
    return (
        <div className="page-container page-loading">
            <Empty image={<FileQuestion size={64} strokeWidth={1.25} />} title="404 页面不存在" description="你访问的页面不存在，或者当前账号没有该菜单。">
                <Button type="primary" onClick={() => void navigate(HOME_PATH)}>
                    返回首页
                </Button>
            </Empty>
        </div>
    );
}
