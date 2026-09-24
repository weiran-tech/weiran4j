package com.weiran.system.api.auth;

/**
 * 认证对外服务。
 *
 * <p>适配层与其他业务模块只依赖这个接口，实现在 application 层。
 *
 * <p>这里没有「按令牌取当前用户」的方法：令牌解析已经由适配层的
 * {@code WeiranAuthContextResolver} 在请求入口完成一次，结果放在请求级的授权快照里。
 * 再开一个按令牌查询的入口，等于让同一件事有两条路径——两条路径迟早会在
 * 「令牌失效判定」这类细节上分叉。跨模块需要「当前是谁」时读授权快照，不要重新解析令牌。
 */
public interface AuthService {

    /** 用通行证与密码登录，成功返回访问令牌。 */
    LoginResult login(LoginCommand command);
}
