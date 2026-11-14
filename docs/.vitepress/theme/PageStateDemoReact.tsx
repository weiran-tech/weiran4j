import '@douyinfe/semi-ui/react19-adapter';
import React, { useEffect, useMemo, useState } from 'react';
import { Button, Checkbox, Input, Space } from '@douyinfe/semi-ui';
import { queriesReady, QueryReadiness, type ReadableQuery } from '../../../packages/manage/src/components/QueryReadiness';
import { Permission } from '../../../packages/manage/src/components/Permission';
import { PermissionContext } from '../../../packages/manage/src/hooks/usePermission';
import { RecoverablePage } from '../../../packages/manage/src/components/RecoverablePage';
import { KeywordSearchInput } from '../../../packages/manage/src/components/KeywordSearchInput';
import { useMediaQuery } from '../../../packages/manage/src/hooks/useMediaQuery';
import { mediaDown } from '../../../packages/manage/src/lib/breakpoints';
import { FormProtectionDemo, ReadRecoveryDemo } from './AdminRecoveryDemos';
import './page-state-demo.css';
import { EditBoundaryDemo, PasswordAttemptDemo } from './EditBoundaryDemos';
import { AuthorizationCalibrationDemo } from './AuthorizationCalibrationDemo';

type Mode = 'success' | 'loading' | 'error' | 'cached-error' | 'retrying';
type Scene = 'authorization' | 'menu-conflict' | 'conflict' | 'throttle' | 'permissions' | 'security' | 'upload' | 'sync' | 'recovery' | 'search' | 'forms' | 'lists' | 'detail';
const SCENES: Record<Scene, string> = { authorization: '授权校准', 'menu-conflict': '菜单编辑冲突', conflict: '编辑冲突', throttle: '认证限流', permissions: '权限分配', security: '安全设置', upload: '上传设置', sync: '权限同步', recovery: '异常恢复', search: '窄屏搜索', forms: '编辑保护', lists: '列表反馈', detail: '日志详情' };
const MODES: Record<Mode, string> = { success: '读取成功', loading: '首次加载中', error: '首次读取失败', 'cached-error': '缓存刷新失败', retrying: '正在重试' };
function query(mode: Mode): ReadableQuery {
    return { data: mode === 'success' || mode === 'cached-error' ? {} : undefined, isSuccess: mode === 'success', isError: mode === 'error' || mode === 'cached-error', isFetching: mode === 'loading' || mode === 'retrying' };
}

function ReadDemo({ scene }: { scene: Exclude<Scene, 'authorization' | 'menu-conflict' | 'conflict' | 'throttle' | 'sync' | 'recovery' | 'search' | 'forms' | 'lists' | 'detail'> }) {
    const labels = scene === 'permissions' ? ['菜单树', '角色详情'] : scene === 'upload' ? ['上传规则', '配置列表'] : ['安全设置'];
    const [modes, setModes] = useState<Mode[]>(labels.map(() => 'success'));
    const [selected, setSelected] = useState(true);
    const [size, setSize] = useState('20');
    const [length, setLength] = useState('12');
    const [saved, setSaved] = useState('');
    const states = modes.map(query);
    const ready = queriesReady(...states);
    const setMode = (index: number, mode: Mode) => { setModes((old) => old.map((value, i) => i === index ? mode : value)); setSaved(''); };
    const retrying = modes.includes('retrying');
    useEffect(() => {
        if (!retrying) return;
        const timer = setTimeout(() => setModes((old) => old.map((mode) => mode === 'retrying' ? 'success' : mode)), 600);
        return () => clearTimeout(timer);
    }, [retrying]);
    return <>
        <div className="page-state-demo__controls">{labels.map((label, index) => <label key={label}>{label}状态
            <select aria-label={`${label}状态`} value={modes[index]} onChange={(event) => setMode(index, event.target.value as Mode)}>
                {Object.entries(MODES).filter(([mode]) => mode !== 'retrying').map(([mode, text]) => <option key={mode} value={mode}>{text}</option>)}
                {modes[index] === 'retrying' && <option value="retrying">正在重试</option>}
            </select>
        </label>)}</div>
        {states.map((state, index) => <QueryReadiness key={labels[index]} query={state} label={labels[index]!} onRetry={() => setMode(index, 'retrying')} />)}
        <section className="page-state-demo__preview" aria-label="页面预览">
            <h3>{SCENES[scene]}</h3>
            {scene === 'permissions' && <>
                <p>演示角色：内容编辑 · 已选 {selected ? 1 : 0} 项</p>
                <Checkbox disabled={!ready} checked={selected} onChange={(event) => setSelected(event.target.checked ?? false)}>用户管理</Checkbox>
                <p><Button size="small" disabled={!ready} onClick={() => setSelected(false)}>清空</Button></p>
            </>}
            {scene === 'security' && <>
                <p>示例密码策略：12–64 个字符，小写字母和数字。</p>
                <label>密码最小长度<Input type="number" aria-label="演示密码最小长度" value={length} disabled={!ready} onChange={setLength} /></label>
            </>}
            {scene === 'upload' && <>
                <p>图片格式：jpg、png · 调整大小后模拟失败再重试，草稿保留。</p>
                <label>图片大小上限（MB）<Input type="number" aria-label="演示图片大小" value={size} disabled={!ready} onChange={setSize} /></label>
            </>}
            <p><Button theme="solid" type="primary" disabled={!ready} onClick={() => { if (ready) setSaved(scene === 'permissions' ? `已保存 ${selected ? 1 : 0} 项权限（本地演示）` : '设置已保存（本地演示）'); }}>保存</Button></p>
            <p role="status">{saved || (ready ? '必要数据已就绪，可以编辑和保存。' : '必要数据未就绪，编辑和保存已禁用。')}</p>
        </section>
    </>;
}

function SyncDemo() {
    const [source, setSource] = useState('角色');
    const [updated, setUpdated] = useState(false);
    const [pending, setPending] = useState(false);
    const [message, setMessage] = useState('当前菜单和按钮来自原权限快照。');
    useEffect(() => {
        if (!pending) return;
        const timer = setTimeout(() => { setUpdated(true); setPending(false); setMessage('资料与菜单已重取，采用更新后的权限。'); }, 600);
        return () => clearTimeout(timer);
    }, [pending]);
    return <PermissionContext.Provider value={updated ? [] : ['system:user:create']}>
        <label>变更来源<select aria-label="变更来源" value={source} disabled={pending} onChange={(event) => { setSource(event.target.value); setUpdated(false); setMessage('已恢复原权限快照。'); }}><option>角色</option><option>菜单</option></select></label>
        <p>演示：{source === '菜单' ? '禁用用户管理菜单及其按钮权限' : '移除本人角色的用户管理权限'}。</p>
        <Space wrap><Button disabled={pending || updated} onClick={() => { setPending(true); setMessage(`${source}写入成功，正在重取资料和菜单…`); }}>模拟{source}保存成功</Button>
            <Button disabled={pending} onClick={() => setMessage(`${source}写入失败，保留当前身份快照。`)}>模拟保存失败</Button>
            <Button disabled={pending} onClick={() => { setUpdated(false); setMessage('已恢复原权限快照。'); }}>重置</Button></Space>
        <section className="page-state-demo__preview"><nav aria-label="演示导航">工作台{!updated && ' / 用户管理'}</nav>
            <Permission code="system:user:create" fallback={<p>当前没有新增用户权限。</p>}><Button>新增用户</Button></Permission>
        </section><p role="status">{message}</p>
    </PermissionContext.Provider>;
}

function RecoveryDemo() {
    const [mode, setMode] = useState('render');
    const [epoch, setEpoch] = useState(0);
    const [home, setHome] = useState(false);
    const [reloaded, setReloaded] = useState(false);
    const loader = useMemo(() => {
        let attempts = 0;
        return () => {
            attempts += 1;
            if (mode === 'persistent' || (mode === 'lazy' && attempts === 1)) return Promise.reject(new Error('演示模块加载失败'));
            return Promise.resolve({ default: function DemoPage() {
                if (mode === 'render' && attempts === 1) throw new Error('演示页面渲染异常');
                return <p>页面已恢复（第 {attempts} 次加载）</p>;
            } });
        };
    }, [mode, epoch]);
    return <>
        <label>故障类型<select aria-label="故障类型" value={mode} onChange={(event) => { setMode(event.target.value); setHome(false); setReloaded(false); }}><option value="render">页面渲染失败</option><option value="lazy">首次模块加载失败</option><option value="persistent">持续模块加载失败</option></select></label>
        <p><Button onClick={() => { setEpoch((old) => old + 1); setHome(false); setReloaded(false); }}>重新模拟</Button></p>
        <section className="page-state-demo__preview"><nav aria-label="故障演示导航">导航外壳始终保留</nav>
            {home ? <p>已返回首页</p> : <RecoverablePage key={`${mode}:${epoch}`} loader={loader} onHome={() => setHome(true)} onReload={() => setReloaded(true)} />}
            {reloaded && <p role="status">已触发主动刷新（演示保留当前文档）。</p>}
        </section>
    </>;
}

function SearchDemo() {
    const narrow = useMediaQuery(mediaDown('lg'));
    const [draft, setDraft] = useState('');
    const [applied, setApplied] = useState('');
    const [open, setOpen] = useState(false);
    const search = () => setApplied(draft.trim());
    const reset = () => { setDraft(''); setApplied(''); };
    const users = ['alice · 爱丽丝', 'bob · 鲍勃'].filter((user) => !applied || user.includes(applied));
    return <section className="page-state-demo__preview">
        <p>当前为{narrow ? '窄屏' : '宽屏'}。示例数据：alice（爱丽丝）、bob（鲍勃）。</p>
        {!narrow && <label>快捷搜索<KeywordSearchInput value={draft} onChange={setDraft} onSearch={search} /></label>}
        <p><Button aria-expanded={open} onClick={() => setOpen((old) => !old)}>高级筛选</Button></p>
        {open && <label>关键字（用户名 / 昵称 / 手机）<KeywordSearchInput value={draft} onChange={setDraft} onSearch={search} /></label>}
        <p><Space><Button onClick={search}>搜索</Button><Button onClick={reset}>重置</Button></Space></p>
        {applied && <p>已选条件：{applied} <Button aria-label="移除关键字条件" onClick={reset}>移除</Button></p>}
        <p role="status">第 1 页 · {users.length ? users.join('；') : '没有匹配结果'}</p>
    </section>;
}

export function PageStateDemo() {
    const [scene, setScene] = useState<Scene>('permissions');
    return <div className="page-state-demo">
        <label>选择场景<select aria-label="选择场景" value={scene} onChange={(event) => setScene(event.target.value as Scene)}>{Object.entries(SCENES).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
        {scene === 'authorization' ? <AuthorizationCalibrationDemo /> : scene === 'menu-conflict' ? <EditBoundaryDemo kind="menu" /> : scene === 'conflict' ? <EditBoundaryDemo /> : scene === 'throttle' ? <PasswordAttemptDemo /> : scene === 'forms' ? <FormProtectionDemo /> : scene === 'lists' ? <ReadRecoveryDemo /> : scene === 'detail' ? <ReadRecoveryDemo detail /> : scene === 'sync' ? <SyncDemo /> : scene === 'recovery' ? <RecoveryDemo /> : scene === 'search' ? <SearchDemo /> : <ReadDemo key={scene} scene={scene} />}
    </div>;
}
