import { Button, Toast } from '@douyinfe/semi-ui';
import { Link } from 'react-router-dom';
import { AppLogo } from '@/components/AppLogo';
import { PageContainer } from '@/components/PageContainer';
import { Permission } from '@/components/Permission';
import './demo.css';

export default function DemoAccessPage() {
    return (
        <div className="demo-page">
            <PageContainer title="权限展示">
                <div className="demo-page__access">
                    <AppLogo size={44} />
                    <div>
                        <strong>Permission</strong>
                        <p>下方按钮依据当前账号的「创建用户」权限显示。</p>
                        <Permission code="system:user:create" fallback={<span>当前账号没有创建用户权限</span>}>
                            <Button onClick={() => Toast.info('仅演示权限显示，不创建用户')}>有权限时显示的按钮</Button>
                        </Permission>
                    </div>
                </div>
            </PageContainer>
            <PageContainer title="安全与账号入口">
                <div className="demo-page__access">
                    <div>
                        <strong>LockScreen</strong>
                        <p>锁屏由顶部用户菜单控制。</p>
                    </div>
                    <div>
                        <strong>ExternalAccountsCard</strong>
                        <p>外部账号绑定与解绑在个人中心操作。</p>
                        <Link to="/profile">前往个人中心</Link>
                    </div>
                </div>
            </PageContainer>
        </div>
    );
}
