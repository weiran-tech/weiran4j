import { Navigate, useLocation } from 'react-router-dom';
export default function LegacyRefundPage() {
    const location = useLocation();
    return <Navigate to={{ pathname: '/manage/refund-demo', search: location.search }} replace />;
}
