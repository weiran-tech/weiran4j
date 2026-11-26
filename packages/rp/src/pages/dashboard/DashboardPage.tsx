import { PortalLink } from '@/prototype/PortalRouter';
import { BookOpen, GitBranch, MonitorSmartphone } from 'lucide-react';
import { sitePath } from '@/prototype/catalog';
import '@/prototype/prototype.css';

export default function DashboardPage() {
    return <div className="proto-page">
        <header className="portal-hero"><div><div className="proto-eyebrow">WEIRAN · 原型协作</div><h1>让想法成为可体验、可评审的产品原型</h1><p>用 AI 制作管理端与手机端原型，按版本查看完整产品和本次调整，再用截图标注记录评审意见。</p><div className="proto-actions"><PortalLink className="portal-primary" href="/versions">查看版本清单 →</PortalLink><PortalLink className="portal-secondary" href="/help">使用指南</PortalLink></div></div><aside className="portal-intro" aria-label="开始协作"><h2>从这里开始</h2><ol><li><div>制作原型<small>使用 AI 完善页面、规则与演示数据</small></div></li><li><div>对照版本<small>查看完整产品、本版差异与并行调整</small></div></li><li><div>一起评审<small>手动截图标注，记录意见并导出 PDF</small></div></li></ol></aside></header>
        <section className="portal-entry-grid" aria-label="快捷入口"><PortalLink className="portal-entry" href="/help/product"><BookOpen size={24} /><h2>用 AI 制作原型</h2><p>从下载项目到编写需求，按操作指南完成一次原型调整。</p><span>阅读产品指南 →</span></PortalLink><PortalLink className="portal-entry" href={sitePath('/rp/versions?tab=prototype&scope=all')}><MonitorSmartphone size={24} /><h2>查看双端原型</h2><p>在管理端与手机端之间切换，查看完整产品或本版改动页面。</p><span>打开原型目录 →</span></PortalLink><PortalLink className="portal-entry" href={'/help/versions'}><GitBranch size={24} /><h2>维护版本</h2><p>通过 AI 维护源码中的版本、稳定页面编号与 CHG，完结后冻结本轮实现。</p><span>阅读维护指南 →</span></PortalLink></section>

    </div>;
}
