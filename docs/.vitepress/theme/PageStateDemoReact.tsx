import '@douyinfe/semi-ui/react19-adapter';
import React, { useEffect, useState } from 'react';
import { Button, Checkbox, Input, Space } from '@douyinfe/semi-ui';
import { queriesReady, QueryReadiness, type ReadableQuery } from '../../../packages/manage/src/components/QueryReadiness';
import { Permission } from '../../../packages/manage/src/components/Permission';
import { PermissionContext } from '../../../packages/manage/src/hooks/usePermission';
import './page-state-demo.css';

type Mode = 'success' | 'loading' | 'error' | 'cached-error' | 'retrying';
type Scene = 'permissions' | 'security' | 'upload' | 'sync';
const SCENES: Record<Scene, string> = { permissions: '权限分配', security: '安全设置', upload: '上传设置', sync: '权限同步' };
const MODES: Record<Mode, string> = { success: '读取成功', loading: '首次加载中', error: '首次读取失败', 'cached-error': '缓存刷新失败', retrying: '正在重试' };
function query(mode: Mode): ReadableQuery {
    return { data: mode === 'success' || mode === 'cached-error' ? {} : undefined, isSuccess: mode === 'success', isError: mode === 'error' || mode === 'cached-error', isFetching: mode === 'loading' || mode === 'retrying' };
}

function ReadDemo({ scene }: { scene: Exclude<Scene, 'sync'> }) {
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
    const [updated, setUpdated] = useState(false);
    const [pending, setPending] = useState(false);
    const [message, setMessage] = useState('当前菜单和按钮来自原权限快照。');
    useEffect(() => {
        if (!pending) return;
        const timer = setTimeout(() => { setUpdated(true); setPending(false); setMessage('资料与菜单已重取，采用更新后的权限。'); }, 600);
        return () => clearTimeout(timer);
    }, [pending]);
    return <PermissionContext.Provider value={updated ? [] : ['system:user:create']}>
        <p>演示：移除本人角色的用户管理权限。</p>
        <Space wrap><Button disabled={pending || updated} onClick={() => { setPending(true); setMessage('角色写入成功，正在重取资料和菜单…'); }}>模拟角色保存成功</Button>
            <Button disabled={pending} onClick={() => setMessage('角色写入失败，保留当前身份快照。')}>模拟保存失败</Button>
            <Button disabled={pending} onClick={() => { setUpdated(false); setMessage('已恢复原权限快照。'); }}>重置</Button></Space>
        <section className="page-state-demo__preview"><nav aria-label="演示导航">工作台{!updated && ' / 用户管理'}</nav>
            <Permission code="system:user:create" fallback={<p>当前没有新增用户权限。</p>}><Button>新增用户</Button></Permission>
        </section><p role="status">{message}</p>
    </PermissionContext.Provider>;
}

export function PageStateDemo() {
    const [scene, setScene] = useState<Scene>('permissions');
    return <div className="page-state-demo">
        <label>选择场景<select aria-label="选择场景" value={scene} onChange={(event) => setScene(event.target.value as Scene)}>{Object.entries(SCENES).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
        {scene === 'sync' ? <SyncDemo /> : <ReadDemo key={scene} scene={scene} />}
    </div>;
}
