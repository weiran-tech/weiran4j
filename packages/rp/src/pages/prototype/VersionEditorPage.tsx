import { Navigate } from 'react-router-dom';

/** 旧创建和编辑链接统一进入源码维护指南，保留本机历史草稿。 */
export default function VersionEditorPage() {
    return <Navigate to="/help/versions" replace />;
}
