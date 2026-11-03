package com.wulicode.weiran.system.adapter.web.request;

import com.wulicode.weiran.system.domain.user.UsernamePolicy;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.util.List;
import org.jspecify.annotations.Nullable;

/**
 * 新增用户请求。
 *
 * @param username 用户名（2–32 位，仅小写英文字母、数字、下划线）
 * @param nickname 昵称
 * @param password 初始密码
 * @param phone 手机号
 * @param gender 性别
 * @param status 状态
 * @param roleIds 角色 ID，必填（可为空数组）
 */
public record CreateUserRequest(
        @NotBlank @Size(min = 2, max = 32) @Pattern(regexp = UsernamePolicy.PATTERN, message = "只能包含小写英文字母、数字和下划线")
        String username,

        @NotBlank @Size(max = 32) String nickname,
        @NotBlank String password,
        @Nullable @Size(max = 20) String phone,
        @Nullable String gender,
        @Nullable String status,
        @NotNull List<Long> roleIds) {}
