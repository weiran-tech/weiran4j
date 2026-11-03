import { describe, expect, it } from 'vitest';
import { ssoAuthorizeUrl, ssoErrorMessage } from '../identities';

describe('ssoAuthorizeUrl', () => {
    it('拼出 authorize 地址，redirect 与提供方 id 做 URL 编码', () => {
        expect(ssoAuthorizeUrl('keycloak', { redirect: '/system/users?a=1&b=中', mode: 'login' })).toBe(
            '/api-backend/n/system/auth/authorizeSso/keycloak?redirect=%2Fsystem%2Fusers%3Fa%3D1%26b%3D%E4%B8%AD&mode=login',
        );
        expect(ssoAuthorizeUrl('a/b', { redirect: '/profile', mode: 'bind' })).toBe('/api-backend/system/auth/authorizeSso/a%2Fb?redirect=%2Fprofile&mode=bind');
    });
});

describe('ssoErrorMessage', () => {
    it('已知错误码给中文提示，未知的带出错误码', () => {
        expect(ssoErrorMessage('110102')).toBe('外部身份校验失败，请重新登录');
        expect(ssoErrorMessage('110104')).toBe('账号未开通，请联系管理员');
        expect(ssoErrorMessage('110103')).toBe('账号已禁用');
        expect(ssoErrorMessage('100101')).toBe('请先登录');
        expect(ssoErrorMessage('100004')).toBe('该外部账号已绑定其他用户');
        expect(ssoErrorMessage('x')).toBe('外部登录失败（错误码 x）');
    });
});
