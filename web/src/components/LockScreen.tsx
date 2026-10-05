import { Avatar, Button, Input } from '@douyinfe/semi-ui';
import { Lock } from 'lucide-react';
import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { useVerifyPassword } from '@/hooks/queries/auth';
import { ApiError, CODE_BAD_CREDENTIALS } from '@/utils/request';
import './LockScreen.css';

interface LockScreenProps {
    user: { nickname?: string | null; username?: string; avatar?: string | null } | null;
    /** 密码校验通过、退场动画结束后调用 */
    onUnlocked: () => void;
    /** 「重新登录」：退出当前账号 */
    onReLogin: () => void;
}

/** 退场动画时长，与 LockScreen.css 的 lockFadeOut 一致 */
const LEAVE_MS = 380;

const FOCUSABLE = 'input:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * 锁定期间把 body 下除遮罩外的所有节点设为 inert：不只是布局，还有 Semi 挂到 body 上的
 * Modal / SideSheet / Popover / Dropdown 浮层——否则锁屏时已打开的浮层仍能 Tab 聚焦、被读屏读到。
 * 只处理挂载时已存在的节点；锁定后新出现的只有 Toast 一类提示，不可交互。解锁时恢复原状。
 */
function useInertSiblings(root: HTMLElement | null) {
    useEffect(() => {
        if (!root) return undefined;
        const touched = [...document.body.children].filter(
            (el): el is HTMLElement => el !== root && el instanceof HTMLElement && !el.hasAttribute('inert'),
        );
        touched.forEach((el) => el.setAttribute('inert', ''));
        return () => touched.forEach((el) => el.removeAttribute('inert'));
    }, [root]);
}

/**
 * 全屏锁屏遮罩（移植自 mono4ts `components/LockScreen.tsx`，去掉了农历）。
 * 输入登录密码后调 `POST /api/auth/verify-password`：正确解锁；40101 提示「密码错误」并抖动，
 * **不会**清会话（`utils/request.ts` 对 40101 不走会话失效分支）。
 */
export function LockScreen({ user, onUnlocked, onReLogin }: LockScreenProps) {
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [shaking, setShaking] = useState(false);
    const [leaving, setLeaving] = useState(false);
    const [now, setNow] = useState(() => new Date());
    const inputRef = useRef<HTMLInputElement>(null);
    const timers = useRef(new Set<ReturnType<typeof setTimeout>>());
    const verify = useVerifyPassword();
    // 遮罩挂在 body 下自己的容器里，才能把其它 body 子节点整体 inert
    const [host] = useState(() => {
        const el = document.createElement('div');
        el.className = 'lock-screen-host';
        return el;
    });
    useEffect(() => {
        document.body.appendChild(host);
        const pending = timers.current;
        return () => {
            pending.forEach(clearTimeout);
            host.remove();
        };
    }, [host]);
    useInertSiblings(host);
    // 在容器挂进 body 之后再聚焦（上面的 effect 先执行）
    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    const later = (fn: () => void, ms: number) => {
        const timer = setTimeout(() => {
            timers.current.delete(timer);
            fn();
        }, ms);
        timers.current.add(timer);
    };

    useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);


    const unlock = () => {
        if (!password || verify.isPending || leaving) return;
        verify.mutate(password, {
            onSuccess: () => {
                setLeaving(true);
                later(onUnlocked, LEAVE_MS);
            },
            onError: (e) => {
                setError(e instanceof ApiError && e.code === CODE_BAD_CREDENTIALS ? '密码错误' : e.message || '校验失败，请重试');
                setShaking(true);
                setPassword('');
                later(() => setShaking(false), 500);
            },
        });
    };

    const name = user?.nickname || user?.username || '用户';
    const pad = (n: number) => n.toString().padStart(2, '0');
    const dateText = now.toLocaleDateString('zh-CN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    // 焦点陷阱：Tab / Shift+Tab 在遮罩内循环（其它节点已 inert，这里兜住浏览器差异）
    const trapFocus = (e: KeyboardEvent<HTMLDivElement>) => {
        if (e.key !== 'Tab') return;
        const items = [...e.currentTarget.querySelectorAll<HTMLElement>(FOCUSABLE)];
        const first = items[0];
        const last = items.at(-1);
        if (!first || !last) return;
        if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
        }
    };

    return createPortal(
        <div
            className={`lock-screen${leaving ? ' lock-screen--leaving' : ''}`}
            role="dialog"
            aria-modal="true"
            aria-label="屏幕已锁定"
            onKeyDown={trapFocus}
        >
            <div className="lock-screen__content">
                <div className="lock-screen__time">
                    {pad(now.getHours())}
                    <span className="lock-screen__colon">:</span>
                    {pad(now.getMinutes())}
                </div>
                <div className="lock-screen__date">{dateText}</div>
                <div className="lock-screen__user">
                    <Avatar size="large" color="blue" {...(user?.avatar ? { src: user.avatar } : {})}>
                        {name.slice(0, 1)}
                    </Avatar>
                    <div className="lock-screen__username">{name}</div>
                </div>
                <div className={`lock-screen__form${shaking ? ' lock-screen__form--shake' : ''}`}>
                    <Input
                        ref={inputRef}
                        className="lock-screen__input"
                        mode="password"
                        aria-label="登录密码"
                        placeholder="输入登录密码解锁"
                        prefix={<Lock size={15} />}
                        value={password}
                        onChange={(v) => {
                            setPassword(v);
                            setError(null);
                        }}
                        // 不用 Semi 的 onEnterPress：它挂在已废弃的 keypress 上（semi-foundation input/foundation.js），
                        // 真实浏览器由 CDP 注入按键或输入法组字时不一定派发；keydown 总会到
                        onKeyDown={(e) => {
                            // 注入的按键可能只带 keyCode 不带 key，两者都认
                            if ((e.key === 'Enter' || e.keyCode === 13) && !e.nativeEvent.isComposing) unlock();
                        }}
                    />
                    {error && (
                        <div className="lock-screen__error" role="alert">
                            {error}
                        </div>
                    )}
                    <Button type="primary" theme="solid" block loading={verify.isPending} disabled={!password} onClick={unlock} style={{ marginTop: 12 }}>
                        解锁
                    </Button>
                    <Button className="lock-screen__relogin" type="tertiary" theme="borderless" block onClick={onReLogin} style={{ marginTop: 4 }}>
                        重新登录
                    </Button>
                </div>
            </div>
        </div>,
        host,
    );
}
