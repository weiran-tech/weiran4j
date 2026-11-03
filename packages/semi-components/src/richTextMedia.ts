export type MediaAlign = 'left' | 'center' | 'right';

/** 宽度仅接受安全的百分比或像素值，避免把任意样式写入保存的 HTML。 */
export function normalizeMediaWidth(value: unknown): string {
    if (typeof value !== 'string' && typeof value !== 'number') return '100%';
    const raw = String(value).trim().toLowerCase();
    const match = /^(\d{1,4})(%|px)?$/.exec(raw);
    if (!match) return '100%';
    const amount = Number(match[1]);
    const unit = match[2] ?? 'px';
    if (amount < 1 || amount > (unit === '%' ? 100 : 2000)) return '100%';
    return `${amount}${unit}`;
}

export function normalizeMediaAlign(value: unknown): MediaAlign {
    return value === 'center' || value === 'right' ? value : 'left';
}

export function readMediaWidth(element: HTMLElement): string {
    return normalizeMediaWidth(element.getAttribute('data-media-width') || element.style.width || element.getAttribute('width'));
}

export function readMediaAlign(element: HTMLElement): MediaAlign {
    const explicit = element.getAttribute('data-media-align');
    if (explicit === 'left' || explicit === 'center' || explicit === 'right') return explicit;
    if (element.style.marginLeft === 'auto') return element.style.marginRight === 'auto' ? 'center' : 'right';
    return 'left';
}

export function mediaStyle(width: unknown, align: unknown): string {
    const margins = normalizeMediaAlign(align) === 'center' ? 'auto; margin-right: auto'
        : normalizeMediaAlign(align) === 'right' ? 'auto; margin-right: 0' : '0; margin-right: auto';
    return `display: block; width: ${normalizeMediaWidth(width)}; max-width: 100%; height: auto; margin-left: ${margins};`;
}

export const mediaAttributes = {
    width: {
        default: '100%',
        parseHTML: (element: HTMLElement) => readMediaWidth(element),
        renderHTML: (attributes: { width: unknown }) => ({ 'data-media-width': normalizeMediaWidth(attributes.width) }),
    },
    align: {
        default: 'left',
        parseHTML: (element: HTMLElement) => readMediaAlign(element),
        renderHTML: (attributes: { align: unknown }) => ({ 'data-media-align': normalizeMediaAlign(attributes.align) }),
    },
};
