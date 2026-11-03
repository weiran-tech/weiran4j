package com.wulicode.weiran.system.adapter.web;

import com.wulicode.weiran.framework.auth.CurrentUser;
import com.wulicode.weiran.framework.response.ApiResponse;
import com.wulicode.weiran.system.adapter.web.request.BindPhoneCodeRequest;
import com.wulicode.weiran.system.adapter.web.request.BindPhoneRequest;
import com.wulicode.weiran.system.application.auth.PhoneBindingApplicationService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** 本人手机号验证与绑定。 */
@RestController
@RequestMapping("/api-backend/system/auth")
public class PhoneBindingController {

    private final PhoneBindingApplicationService service;

    public PhoneBindingController(final PhoneBindingApplicationService service) {
        this.service = service;
    }

    @PostMapping("/sendBindPhoneCode")
    public ApiResponse<Void> sendCode(
            @Valid @RequestBody final BindPhoneCodeRequest request, final HttpServletRequest http) {
        this.service.sendCode(CurrentUser.require().id(), request.phone(), AuthController.clientOf(http));
        return ApiResponse.ok();
    }

    @PutMapping("/bindPhone")
    public ApiResponse<Void> bind(@Valid @RequestBody final BindPhoneRequest request) {
        this.service.confirm(CurrentUser.require().id(), request.phone(), request.code());
        return ApiResponse.ok();
    }
}
