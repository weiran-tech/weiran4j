import index from '../../prototype/releases.json';
import { assembleManifest } from '../../prototype/manifest.mjs';

/** 所有浏览器入口共用此读取层，不直接导入单个版本或页面分组。 */
export const sourceCatalog = assembleManifest(index, import.meta.glob('../../prototype/versions/**/*.json', { eager: true, import: 'default' }));
