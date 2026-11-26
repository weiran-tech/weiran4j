import { IconPicker as BaseIconPicker } from '@weiran-tech/manage';
import '@weiran-tech/manage/style.css';
import { MENU_ICON_NAMES, renderIcon } from '@/utils/icons';

interface IconPickerProps {
    value?: string | null | undefined;
    onChange?: (icon: string) => void;
}

/** 菜单图标选择器：项目图标表交给独立表单控件。 */
export function IconPicker({ value, onChange }: IconPickerProps) {
    return <BaseIconPicker value={value} onChange={onChange} icons={MENU_ICON_NAMES} renderIcon={renderIcon} />;
}
