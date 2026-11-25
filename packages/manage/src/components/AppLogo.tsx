import { useState, type ReactNode } from 'react';
import { config } from '@/config';
import './AppLogo.css';

interface AppLogoProps {
    size?: number;
    text?: string | undefined;
    icon?: ReactNode;
    src?: string | undefined;
    /** solid：主色渐变；glass：主色底上的磨砂半透明 */
    variant?: 'solid' | 'glass';
    className?: string;
}

/** 应用标志：支持图片、图标与文字的主题色徽标，默认取 appTitle 首字母 */
export function AppLogo({ size = 28, variant = 'solid', className, text, icon, src }: AppLogoProps) {
    const [failedSrc, setFailedSrc] = useState<string | null>(null);
    const initials = text?.trim().slice(0, 2) || config.appTitle.trim().slice(0, 1).toUpperCase() || 'W';
    const cls = ['app-logo', `app-logo--${variant}`, className].filter(Boolean).join(' ');
    return (
        <span
            className={cls}
            aria-hidden="true"
            style={{ width: size, height: size, borderRadius: Math.round(size * 0.25), fontSize: Math.round(size * 0.5) }}
        >
            {src && src !== failedSrc
                ? <img className="app-logo__image" src={src} alt="" onError={() => setFailedSrc(src)} />
                : icon ?? initials}
        </span>
    );
}
