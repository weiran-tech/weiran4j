import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { config } from '@/config';
import { AppLogo } from './AppLogo';
import './NavLogo.css';

export interface NavLogoProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'title'> {
    title?: string;
    size?: number;
    /** 图片优先，其次图标；未设置时显示文字徽标。 */
    logoSrc?: string;
    icon?: ReactNode;
    textIcon?: string;
    showLogo?: boolean;
    showTitle?: boolean;
    titleClassName?: string;
}

/** 导航品牌入口：统一徽标、标题与点击行为，布局样式由导航容器补充。 */
export function NavLogo({ title = config.appTitle, size = 28, logoSrc, icon, textIcon, showLogo = true, showTitle = true,
    className, titleClassName, type = 'button', 'aria-label': ariaLabel, ...buttonProps }: NavLogoProps) {
    return <button {...buttonProps} type={type} className={['nav-logo', className].filter(Boolean).join(' ')}
        aria-label={ariaLabel ?? (showTitle ? undefined : title)}>
        {showLogo && <AppLogo size={size} src={logoSrc} icon={icon} text={textIcon} />}
        {showTitle && <span className={['nav-logo__title', titleClassName].filter(Boolean).join(' ')}>{title}</span>}
    </button>;
}
