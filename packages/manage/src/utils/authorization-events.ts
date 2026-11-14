type Listener = (session: string) => void;
const listeners = new Set<Listener>();
/** 事件只通知校准，不重放业务请求；调用方负责会话隔离。 */
export function notifyPermissionRejected(session: string) { for (const listener of listeners) listener(session); }
export function subscribePermissionRejected(listener: Listener) { listeners.add(listener); return () => { listeners.delete(listener); }; }
