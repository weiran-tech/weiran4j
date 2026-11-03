/** 契约 §6.1：新密码 8–64 位，含字母与数字 */
export const PASSWORD_RULE = /^(?=.*[A-Za-z])(?=.*\d).{8,64}$/;

export const PASSWORD_RULE_MESSAGE = '8–64 位，须同时包含字母与数字';
