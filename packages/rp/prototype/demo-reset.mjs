/** 只清理原型退款示例，不清登录、偏好、业务 Mock 或其他版本。 */
export function resetDemo(storage, versions) {
    for (const version of new Set(versions)) {
        if (!/^v[\w.-]+$/.test(version)) continue;
        storage.removeItem(`prototype_refund_${version}`);
        storage.removeItem(`prototype_mobile_${version}`);
    }
}
