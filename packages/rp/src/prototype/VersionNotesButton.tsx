import { Button } from '@douyinfe/semi-ui';
import { notebookContext } from './notebook-context';
import { openVersionNotebook } from './version-notes';
export function VersionNotesButton({ version }: { version: string }) {
    return <Button onClick={() => { const context = notebookContext(version); if (context) openVersionNotebook(context); }}>版本介绍与评审备注 · 导出</Button>;
}
