import { config } from '@/config';
import './AppLogo.css';

interface AppLogoProps {
    size?: number;
    /** solid：主色渐变；glass：主色底上的磨砂半透明 */
    variant?: 'solid' | 'glass';
    className?: string;
}

/** 应用标志：取 appTitle 首字母的方块徽标，颜色跟随主题色（仓库里没有图片素材，不引用 img） */
export function AppLogo({ size = 28, variant = 'solid', className }: AppLogoProps) {
    const cls = ['app-logo', `app-logo--${variant}`, className].filter(Boolean).join(' ');
    return (
        <span
            className={cls}
            aria-hidden="true"
            style={{ width: size, height: size, borderRadius: Math.round(size * 0.25), fontSize: Math.round(size * 0.5) }}
        >
            {config.appTitle.trim().slice(0, 1).toUpperCase() || 'W'}
        </span>
    );
}
