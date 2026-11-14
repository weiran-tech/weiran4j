/** 登录、锁屏和 docs 共用的持续认证错误反馈；只由主动提交触发重试。 */
export function AuthAttemptFeedback({ message }: { message: string | null }) {
    return message ? <div role="alert">{message}</div> : null;
}
