import { Avatar } from '@douyinfe/semi-ui';
export interface TextAvatarValue {
    text?: string | null;
    background?: string | null;
}

export interface TextAvatarProps {
    avatar: TextAvatarValue | null | undefined;
    fallback: string;
    size: 'extra-small' | 'large';
    className?: string | undefined;
}

/** 用户头像只渲染文字和背景色，不读取图片地址。 */
export function TextAvatar({ avatar, fallback, size, className }: TextAvatarProps) {
    return (
        <Avatar size={size} className={className} style={{ backgroundColor: avatar?.background ?? '#0064FA' }}>
            {avatar?.text || Array.from(fallback)[0] || '?'}
        </Avatar>
    );
}
