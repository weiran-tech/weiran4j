import { Popover, Toast, Tooltip } from '@douyinfe/semi-ui';
import { Star, X } from 'lucide-react';
import { useCallback, useMemo } from 'react';
import { useFavoriteMenus, useSaveFavoriteMenus } from '@/hooks/queries/auth';
import { renderIcon } from '@/utils/icons';
import type { FlatMenu } from '@/utils/menu';

/** 契约 §6.1：去重后最多 50 个 */
export const MAX_FAVORITES = 50;

/**
 * 收藏菜单（偏好 showFavorites）：数据走 `GET/PUT /api/auth/favorite-menus`，
 * 保存是乐观更新，失败回滚并提示（见 `hooks/queries/auth.ts` 的 `useSaveFavoriteMenus`）。
 */
export function useFavorites(pages: readonly FlatMenu[], enabled: boolean) {
    const { data, isSuccess } = useFavoriteMenus(enabled);
    const save = useSaveFavoriteMenus();
    const ids = useMemo(() => data ?? [], [data]);
    const byId = useMemo(() => new Map(pages.map((p) => [p.id, p])), [pages]);
    const favorites = useMemo(() => ids.map((id) => byId.get(id)).filter((p): p is FlatMenu => !!p), [ids, byId]);

    const { mutate } = save;
    const toggle = useCallback(
        (id: number) => {
            // 保存是全量覆盖：列表没加载成功前改动会把服务端已有的收藏整批冲掉
            if (!isSuccess) return;
            if (ids.includes(id)) {
                mutate(ids.filter((x) => x !== id));
            } else if (ids.length >= MAX_FAVORITES) {
                Toast.warning(`最多收藏 ${MAX_FAVORITES} 个菜单`);
            } else {
                mutate([...ids, id]);
            }
        },
        [ids, mutate, isSuccess],
    );
    const isFavorite = useCallback((id: number) => ids.includes(id), [ids]);
    /** 收藏列表已从服务端加载成功；之前不显示星标与入口 */
    return { ready: isSuccess, favorites, toggle, isFavorite };
}

interface FavoriteToggleProps {
    page: FlatMenu;
    favorite: boolean;
    onToggle: (id: number) => void;
}

/** 面包屑右侧的收藏星标 */
export function FavoriteToggle({ page, favorite, onToggle }: FavoriteToggleProps) {
    const label = favorite ? '取消收藏' : '收藏此页';
    return (
        <Tooltip content={label} position="bottom">
            <button
                type="button"
                className={`admin-favorite-toggle${favorite ? ' admin-favorite-toggle--active' : ''}`}
                aria-label={label}
                aria-pressed={favorite}
                onClick={() => onToggle(page.id)}
            >
                <Star size={14} fill={favorite ? 'currentColor' : 'none'} strokeWidth={favorite ? 0 : 1.8} />
            </button>
        </Tooltip>
    );
}

interface FavoritesButtonProps {
    favorites: FlatMenu[];
    onOpen: (page: FlatMenu) => void;
    onRemove: (id: number) => void;
}

/** 顶栏「我的收藏」入口：点击弹出收藏列表，点条目跳转，× 移除 */
export function FavoritesButton({ favorites, onOpen, onRemove }: FavoritesButtonProps) {
    const content = (
        <div className="admin-favorites" aria-label="我的收藏">
            <div className="admin-favorites__title">我的收藏</div>
            {favorites.length === 0 ? (
                <div className="admin-favorites__empty">暂无收藏，点面包屑右侧的星标收藏当前页</div>
            ) : (
                <ul className="admin-favorites__list">
                    {favorites.map((p) => (
                        <li key={p.id} className="admin-favorites__item">
                            <button type="button" className="admin-favorites__link" onClick={() => onOpen(p)}>
                                <span className="admin-favorites__icon">{renderIcon(p.icon, 14) ?? <Star size={13} />}</span>
                                <span className="admin-favorites__name">{p.title}</span>
                                {p.parents.length > 0 && <span className="admin-favorites__path">{p.parents.at(-1)}</span>}
                            </button>
                            <button type="button" className="admin-favorites__remove" aria-label={`移除收藏 ${p.title}`} onClick={() => onRemove(p.id)}>
                                <X size={13} />
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
    return (
        <Popover trigger="click" position="bottomRight" showArrow content={content}>
            <button type="button" className="admin-theme-btn" aria-label="我的收藏">
                <Star size={16} strokeWidth={1.8} />
            </button>
        </Popover>
    );
}
