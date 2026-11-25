import { Button, Empty } from '@douyinfe/semi-ui';
import { ShieldOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { HOME_PATH } from '@/config';

export default function ForbiddenPage() {
    const navigate = useNavigate();
    return (
        <div className="page-container page-loading">
            <Empty image={<ShieldOff size={64} strokeWidth={1.25} />} title="403 无权限" description="你没有访问该页面的权限，如有需要请联系管理员。">
                <Button type="primary" onClick={() => void navigate(HOME_PATH)}>
                    返回首页
                </Button>
            </Empty>
        </div>
    );
}
