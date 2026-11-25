import { CreditCard, Receipt, UserRoundCheck } from 'lucide-react';

/**
 * 收付管理新增页面的菜单图标。
 *
 * 按 D-012 契约，下游不改基座 `utils/icons.tsx` 的白名单，而是把需要的图标
 * export 到这里 —— 构建时由 `import.meta.glob('../biz/icons*.ts')` 合并进注册表。
 */
export const icons = { CreditCard, Receipt, UserRoundCheck };
