package com.weiran.app.ops;

import com.weiran.system.domain.account.Account;
import com.weiran.system.domain.account.AccountType;
import com.weiran.system.domain.port.AccountRepository;
import com.weiran.system.domain.port.PasswordHasher;
import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

/**
 * 交互式重置密码工具，仅在 {@code reset-password} profile 下装配。
 *
 * <p>用 {@code -Pprofile=local,reset-password} 启动本应用即可进入交互流程（{@code reset-password}
 * 只负责把 {@code spring.main.web-application-type} 关成 {@code none}，数据源/JWT 等配置仍叠加自
 * {@code local} 之类的环境 profile 读取）：依次输入账号类型、账号（用户名/手机号/邮箱）、新密码，
 * 执行完立即退出，不起 web 容器。
 * 新密码一律走 {@link PasswordHasher#hash} 落成 BCrypt，符合 CP-8 的密码迁移策略——
 * 不会、也不应该去构造历史算法的哈希。
 */
@Slf4j
@Component
@Profile("reset-password")
@RequiredArgsConstructor
public class ResetPasswordRunner implements CommandLineRunner {

    private final AccountRepository accountRepository;

    private final PasswordHasher passwordHasher;

    private final ConfigurableApplicationContext context;

    @Override
    public void run(final String... args) throws IOException {
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(System.in, StandardCharsets.UTF_8))) {
            final AccountType accountType = this.readAccountType(reader);
            final Account account = this.readAccount(reader, accountType);
            final String newPassword = this.readNewPassword(reader);

            final PasswordHasher.HashedPassword hashed = this.passwordHasher.hash(newPassword);
            this.accountRepository.updatePassword(account.getId(), hashed.hash(), hashed.passwordKey());

            System.out.println("密码重置成功：账号 #" + account.getId() + "（" + account.getUsername() + "）");
        } finally {
            SpringApplication.exit(this.context, () -> 0);
        }
    }

    private AccountType readAccountType(final BufferedReader reader) throws IOException {
        System.out.print("账号类型（user/backend，回车默认 user）：");
        final String line = reader.readLine();
        final String code = line == null || line.isBlank() ? "user" : line.trim();
        return AccountType.fromCode(code);
    }

    private Account readAccount(final BufferedReader reader, final AccountType accountType) throws IOException {
        System.out.print("账号（用户名/手机号/邮箱）：");
        final String passport = reader.readLine();
        if (passport == null || passport.isBlank()) {
            throw new IllegalArgumentException("账号不能为空");
        }

        final Optional<Account> account = this.accountRepository.findByPassport(passport.trim(), accountType);
        return account.orElseThrow(() -> new IllegalArgumentException("未找到账号：" + passport));
    }

    private String readNewPassword(final BufferedReader reader) throws IOException {
        System.out.print("新密码：");
        final String password = reader.readLine();
        if (password == null || password.isBlank()) {
            throw new IllegalArgumentException("新密码不能为空");
        }
        return password;
    }
}
