package com.weiran.cqt.adapter.portal;

import com.weiran.cqt.adapter.portal.request.LoginRequest;
import com.weiran.cqt.adapter.portal.request.RegisterRequest;
import com.weiran.cqt.adapter.portal.request.ResetPasswordRequest;
import com.weiran.cqt.adapter.portal.request.UpdateProfileRequest;
import com.weiran.cqt.api.account.AccountProfileView;
import com.weiran.cqt.api.account.AccountService;
import com.weiran.cqt.api.account.LoginResult;
import com.weiran.cqt.api.account.RegisterCommand;
import com.weiran.cqt.api.account.ResetPasswordCommand;
import com.weiran.cqt.api.account.UpdateProfileCommand;
import com.weiran.cqt.api.sms.SmsSendResult;
import com.weiran.cqt.api.sms.SmsService;
import jakarta.servlet.http.HttpServletRequest;
import java.util.LinkedHashMap;
import java.util.Map;
import org.jspecify.annotations.Nullable;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RequestParam;

/** 前台账号接口（沿用原系统 {@code /api/auth/*} 的路径与字段名）。 */
@PortalController
@RequestMapping("/api-web/auth")
public class AuthController {

    private final AccountService accountService;

    private final SmsService smsService;

    /** 构造 Controller。 */
    public AuthController(final AccountService accountService, final SmsService smsService) {
        this.accountService = accountService;
        this.smsService = smsService;
    }

    /**
     * 发送短信验证码。客户端 IP 取 {@code remoteAddr}：经 Tomcat 原生转发头处理（{@code server.forward-headers-strategy: native}），
     * 只有内网代理转发的 {@code X-Forwarded-For} 才被采信；不用框架 {@code ClientIpResolver}，它信任可伪造的头，只适合日志。
     */
    @PortalPublic
    @GetMapping("/sendSms")
    public PortalResult<Map<String, Object>> sendSms(
            @RequestParam(required = false) final @Nullable String phone, final HttpServletRequest request) {
        final SmsSendResult result = this.smsService.send(phone, request.getRemoteAddr());
        final Map<String, Object> data = new LinkedHashMap<>();
        data.put("sent", result.sent());
        if (result.code() != null) {
            data.put("code", result.code());
        }
        return PortalResult.ok(data);
    }

    /** 手机号 + 密码 + 验证码登录。 */
    @PortalPublic
    @PostMapping("/login")
    public PortalResult<Map<String, Object>> login(@RequestBody final LoginRequest request) {
        return PortalResult.ok(
                AuthController.token(this.accountService.login(request.phone(), request.password(), request.code())));
    }

    /** 手机号 + 密码登录（注册成功后自动登录）。 */
    @PortalPublic
    @PostMapping("/autologin")
    public PortalResult<Map<String, Object>> autologin(@RequestBody final LoginRequest request) {
        return PortalResult.ok(
                AuthController.token(this.accountService.autologin(request.phone(), request.password())));
    }

    /** 注册个人或学校账号。 */
    @PortalPublic
    @PostMapping("/register")
    public PortalResult<Boolean> register(@RequestBody final RegisterRequest request) {
        this.accountService.register(new RegisterCommand(
                PortalParams.integer("type", request.type()),
                request.name(),
                request.phone(),
                request.code(),
                request.password(),
                request.passwordConfirmation(),
                PortalParams.integer("sex", request.sex()),
                request.idcard(),
                request.credentialType(),
                PortalParams.integer("cities", request.cities()),
                request.school(),
                request.schoolid(),
                request.contact(),
                request.address(),
                request.email(),
                request.zhizhao(),
                request.chengnuoshu()));
        return PortalResult.ok(true);
    }

    /** 本人资料。 */
    @RequestMapping(
            value = "/userinfo",
            method = {RequestMethod.GET, RequestMethod.POST})
    public PortalResult<Map<String, @Nullable Object>> userinfo() {
        final AccountProfileView view =
                this.accountService.profile(PortalAccount.current().orElseThrow());
        final Map<String, @Nullable Object> data = new LinkedHashMap<>();
        data.put("id", view.id());
        data.put("name", view.name());
        data.put("type", view.type());
        data.put("uniid", view.uniid());
        data.put("phone", view.phone());
        data.put("schoolid", view.schoolId());
        data.put("idcard", view.idCard());
        data.put("credential_type", view.credentialType());
        data.put("cities", view.cityId());
        data.put("cityname", view.cityName());
        data.put("sex", view.sex());
        data.put("school", view.school());
        data.put("contact", view.contact());
        data.put("address", view.address());
        data.put("email", view.email());
        data.put("status", view.status());
        data.put("zhizhao", view.license());
        data.put("chengnuoshu", view.commitment());
        data.put("rejectreason", view.rejectionReason());
        data.put("source_database", view.sourceDatabase());
        return PortalResult.ok(data);
    }

    /** 修改本人资料。 */
    @PostMapping("/updateuserinfo")
    public PortalResult<Boolean> updateUserinfo(@RequestBody final UpdateProfileRequest request) {
        this.accountService.updateProfile(
                PortalAccount.current().orElseThrow(),
                new UpdateProfileCommand(
                        request.name(),
                        request.phone(),
                        request.schoolid(),
                        request.idcard(),
                        request.credentialType(),
                        PortalParams.integer("cities", request.cities()),
                        PortalParams.integer("sex", request.sex()),
                        request.school(),
                        request.contact(),
                        request.address(),
                        request.email(),
                        request.zhizhao(),
                        request.chengnuoshu()));
        return PortalResult.ok(true);
    }

    /** 用短信验证码重置密码。 */
    @PortalPublic
    @PostMapping("/resetPassword")
    public PortalResult<Boolean> resetPassword(@RequestBody final ResetPasswordRequest request) {
        this.accountService.resetPassword(new ResetPasswordCommand(
                request.phone(), request.code(), request.password(), request.passwordConfirmation()));
        return PortalResult.ok(true);
    }

    /** 承诺书模板链接。 */
    @PortalPublic
    @RequestMapping(
            value = "/getlinkinfo",
            method = {RequestMethod.GET, RequestMethod.POST})
    public PortalResult<String> getLinkInfo() {
        return PortalResult.ok(this.accountService.commitmentTemplateUrl());
    }

    private static Map<String, Object> token(final LoginResult result) {
        final Map<String, Object> data = new LinkedHashMap<>();
        data.put("access_token", result.accessToken());
        data.put("token_type", result.tokenType());
        data.put("expires_in", result.expiresIn());
        return data;
    }
}
