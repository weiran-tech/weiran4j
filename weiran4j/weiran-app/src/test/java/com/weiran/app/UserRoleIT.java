package com.weiran.app;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.JsonNode;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

/** 用户与角色：CRUD、角色授权、权限拦截、令牌吊销。 */
class UserRoleIT extends IntegrationTestSupport {

    private static final String PASSWORD = "Passw0rd1";

    private static Map<String, Object> newUser(final String username, final List<Long> roleIds) {
        final Map<String, Object> body = new HashMap<>();
        body.put("username", username);
        body.put("nickname", "测试" + username);
        body.put("password", UserRoleIT.PASSWORD);
        body.put("email", username + "@example.com");
        body.put("phone", "13800000000");
        body.put("gender", "male");
        body.put("departmentId", 1);
        body.put("roleIds", roleIds);
        return body;
    }

    private long createRole(final String admin, final String code, final List<Long> menuIds) {
        final long roleId = this.create("/api/roles", admin, Map.of("name", "角色" + code, "code", code));
        IntegrationTestSupport.assertOk(this.put("/api/roles/" + roleId + "/menus", admin, Map.of("menuIds", menuIds)));
        return roleId;
    }

    @Test
    @DisplayName("普通用户只拥有角色授予的权限：可查用户列表，新增用户与查角色返回 403")
    void regularUserPermissions() {
        final String admin = this.adminToken();
        // 只勾选「用户管理」菜单（id 3），不勾父目录，验证可见菜单会自动补齐父目录。
        final long roleId = this.createRole(admin, IntegrationTestSupport.unique("viewer"), List.of(3L));
        final String username = IntegrationTestSupport.unique("viewer");
        this.create("/api/users", admin, UserRoleIT.newUser(username, List.of(roleId)));
        final String token = this.tokenOf(username, UserRoleIT.PASSWORD);

        IntegrationTestSupport.assertOk(this.get("/api/users", token));
        IntegrationTestSupport.assertError(
                this.post("/api/users", token, UserRoleIT.newUser(IntegrationTestSupport.unique("x"), List.of())),
                HttpStatus.FORBIDDEN,
                40300);
        IntegrationTestSupport.assertError(this.get("/api/roles", token), HttpStatus.FORBIDDEN, 40300);
        IntegrationTestSupport.assertOk(this.get("/api/roles/options", token));
        IntegrationTestSupport.assertOk(this.get("/api/departments", token));

        final JsonNode me = IntegrationTestSupport.data(this.get("/api/auth/me", token));
        assertThat(AuthIT.texts(me.path("permissions"))).containsExactly("system:user:list");
        final JsonNode menus = IntegrationTestSupport.data(this.get("/api/auth/menus", token));
        assertThat(AuthIT.ids(menus)).containsExactly(2L);
        assertThat(AuthIT.ids(menus.get(0).path("children"))).containsExactly(3L);

        // 追加按钮权限后立即生效（授权快照缓存被失效）。
        IntegrationTestSupport.assertOk(
                this.put("/api/roles/" + roleId + "/menus", admin, Map.of("menuIds", List.of(2L, 3L, 100L))));
        IntegrationTestSupport.assertOk(
                this.post("/api/users", token, UserRoleIT.newUser(IntegrationTestSupport.unique("made"), List.of())));
        // 有新增用户权限但不是超管：不能授予 super_admin（防提权）。
        IntegrationTestSupport.assertError(
                this.post("/api/users", token, UserRoleIT.newUser(IntegrationTestSupport.unique("esc"), List.of(1L))),
                HttpStatus.FORBIDDEN,
                40300);
    }

    @Test
    @DisplayName("用户 CRUD：新增、详情、分页筛选、修改、删除；视图不含密码与令牌版本")
    void userCrud() {
        final String admin = this.adminToken();
        final long roleId = this.createRole(admin, IntegrationTestSupport.unique("crud"), List.of());
        final String username = IntegrationTestSupport.unique("crud");
        final long id = this.create("/api/users", admin, UserRoleIT.newUser(username, List.of(roleId)));

        final JsonNode view = IntegrationTestSupport.data(this.get("/api/users/" + id, admin));
        assertThat(view.path("username").asText()).isEqualTo(username);
        assertThat(view.path("departmentName").asText()).isEqualTo("总公司");
        assertThat(view.path("status").asText()).isEqualTo("enabled");
        assertThat(view.path("isBuiltin").isBoolean()).isTrue();
        assertThat(view.path("isBuiltin").asBoolean()).isFalse();
        assertThat(view.path("roleIds").get(0).asLong()).isEqualTo(roleId);
        assertThat(view.path("roleNames").get(0).asText()).startsWith("角色");
        assertThat(view.path("createdAt").asText()).matches("\\d{4}-\\d{2}-\\d{2} \\d{2}:\\d{2}:\\d{2}");
        assertThat(view.has("password")).isFalse();
        assertThat(view.has("tokenVersion")).isFalse();
        final Map<String, Object> audit =
                this.jdbc.queryForMap("SELECT created_by, updated_by FROM sys_user WHERE id = ?", id);
        assertThat(audit.get("created_by")).isEqualTo(1L);

        final ResponseEntity<JsonNode> page =
                this.get("/api/users?keyword=" + username + "&status=enabled&departmentId=1&pageSize=10", admin);
        IntegrationTestSupport.assertOk(page);
        assertThat(IntegrationTestSupport.data(page).path("total").asLong()).isEqualTo(1L);

        final Map<String, Object> update = new HashMap<>();
        update.put("nickname", "改名");
        update.put("email", null);
        update.put("gender", "female");
        update.put("status", "enabled");
        update.put("roleIds", List.of());
        IntegrationTestSupport.assertOk(this.put("/api/users/" + id, admin, update));
        final JsonNode updated = IntegrationTestSupport.data(this.get("/api/users/" + id, admin));
        assertThat(updated.path("nickname").asText()).isEqualTo("改名");
        assertThat(updated.path("email").isNull()).isTrue();
        assertThat(updated.path("departmentId").isNull()).isTrue();
        assertThat(updated.path("roleIds").isEmpty()).isTrue();

        final JsonNode options = IntegrationTestSupport.data(this.get("/api/users/options", admin));
        assertThat(options.findValuesAsText("username")).contains(username, "admin");

        IntegrationTestSupport.assertOk(this.delete("/api/users/" + id, admin));
        IntegrationTestSupport.assertError(this.get("/api/users/" + id, admin), HttpStatus.NOT_FOUND, 40400);
        final Integer links =
                this.jdbc.queryForObject("SELECT COUNT(*) FROM sys_user_role WHERE user_id = ?", Integer.class, id);
        assertThat(links).isZero();
    }

    @Test
    @DisplayName("用户名重复 40900，弱密码与非法角色 40000，内置用户删除 / 禁用 40901")
    void userRules() {
        final String admin = this.adminToken();
        final String username = IntegrationTestSupport.unique("dup");
        this.create("/api/users", admin, UserRoleIT.newUser(username, List.of()));

        IntegrationTestSupport.assertError(
                this.post("/api/users", admin, UserRoleIT.newUser(username, List.of())), HttpStatus.CONFLICT, 40900);

        final Map<String, Object> weak = UserRoleIT.newUser(IntegrationTestSupport.unique("weak"), List.of());
        weak.put("password", "abcdefgh");
        final ResponseEntity<JsonNode> weakResponse = this.post("/api/users", admin, weak);
        IntegrationTestSupport.assertError(weakResponse, HttpStatus.BAD_REQUEST, 40000);
        assertThat(IntegrationTestSupport.body(weakResponse).path("message").asText())
                .startsWith("password: ");

        IntegrationTestSupport.assertError(
                this.post(
                        "/api/users", admin, UserRoleIT.newUser(IntegrationTestSupport.unique("r"), List.of(999_999L))),
                HttpStatus.BAD_REQUEST,
                40000);

        IntegrationTestSupport.assertError(this.delete("/api/users/1", admin), HttpStatus.CONFLICT, 40901);
        final Map<String, Object> disableAdmin = new HashMap<>();
        disableAdmin.put("nickname", "超级管理员");
        disableAdmin.put("departmentId", 1);
        disableAdmin.put("status", "disabled");
        disableAdmin.put("roleIds", List.of(1L));
        IntegrationTestSupport.assertError(this.put("/api/users/1", admin, disableAdmin), HttpStatus.CONFLICT, 40901);
        final Map<String, Object> stripAdmin = new HashMap<>(disableAdmin);
        stripAdmin.put("status", "enabled");
        stripAdmin.put("roleIds", List.of());
        IntegrationTestSupport.assertError(this.put("/api/users/1", admin, stripAdmin), HttpStatus.CONFLICT, 40901);
        final Map<String, Object> missingRoles = UserRoleIT.newUser(IntegrationTestSupport.unique("nr"), List.of());
        missingRoles.remove("roleIds");
        IntegrationTestSupport.assertError(this.post("/api/users", admin, missingRoles), HttpStatus.BAD_REQUEST, 40000);
    }

    @Test
    @DisplayName("自己改密后旧令牌失效、新密码可登录；原密码错误返回 40000")
    void changeOwnPasswordRevokesToken() {
        final String admin = this.adminToken();
        final String username = IntegrationTestSupport.unique("pwd");
        this.create("/api/users", admin, UserRoleIT.newUser(username, List.of()));
        final String oldToken = this.tokenOf(username, UserRoleIT.PASSWORD);

        IntegrationTestSupport.assertError(
                this.put(
                        "/api/auth/password",
                        oldToken,
                        Map.of("oldPassword", "wrong-1234", "newPassword", "NewPass123")),
                HttpStatus.BAD_REQUEST,
                40000);
        IntegrationTestSupport.assertError(
                this.put(
                        "/api/auth/password",
                        oldToken,
                        Map.of("oldPassword", UserRoleIT.PASSWORD, "newPassword", "short")),
                HttpStatus.BAD_REQUEST,
                40000);
        IntegrationTestSupport.assertOk(this.put(
                "/api/auth/password",
                oldToken,
                Map.of("oldPassword", UserRoleIT.PASSWORD, "newPassword", "NewPass123")));

        IntegrationTestSupport.assertError(this.get("/api/auth/me", oldToken), HttpStatus.UNAUTHORIZED, 40100);
        IntegrationTestSupport.assertError(this.login(username, UserRoleIT.PASSWORD), HttpStatus.UNAUTHORIZED, 40101);
        IntegrationTestSupport.assertOk(this.get("/api/auth/me", this.tokenOf(username, "NewPass123")));
    }

    @Test
    @DisplayName("管理员重置密码与禁用用户都会让旧令牌失效，禁用后登录返回 40301")
    void resetAndDisableRevokeTokens() {
        final String admin = this.adminToken();
        final String username = IntegrationTestSupport.unique("reset");
        final long id = this.create("/api/users", admin, UserRoleIT.newUser(username, List.of()));
        final String firstToken = this.tokenOf(username, UserRoleIT.PASSWORD);
        IntegrationTestSupport.assertOk(this.get("/api/auth/me", firstToken));

        IntegrationTestSupport.assertOk(
                this.put("/api/users/" + id + "/password", admin, Map.of("password", "Reset1234")));
        IntegrationTestSupport.assertError(this.get("/api/auth/me", firstToken), HttpStatus.UNAUTHORIZED, 40100);

        final String secondToken = this.tokenOf(username, "Reset1234");
        final Map<String, Object> disable = new HashMap<>();
        disable.put("nickname", "禁用");
        disable.put("status", "disabled");
        disable.put("roleIds", List.of());
        IntegrationTestSupport.assertOk(this.put("/api/users/" + id, admin, disable));
        IntegrationTestSupport.assertError(this.get("/api/auth/me", secondToken), HttpStatus.UNAUTHORIZED, 40100);
        IntegrationTestSupport.assertError(this.login(username, "Reset1234"), HttpStatus.FORBIDDEN, 40301);

        // PUT 中省略 status 时保持原值，不会把禁用用户悄悄启用。
        final Map<String, Object> rename = new HashMap<>();
        rename.put("nickname", "改名但不改状态");
        rename.put("roleIds", List.of());
        IntegrationTestSupport.assertOk(this.put("/api/users/" + id, admin, rename));
        assertThat(IntegrationTestSupport.data(this.get("/api/users/" + id, admin))
                        .path("status")
                        .asText())
                .isEqualTo("disabled");
    }

    @Test
    @DisplayName("并发登录不会把管理员刚重置的密码与令牌版本写回旧值（登录只定向更新登录信息）")
    void concurrentLoginsDoNotUndoPasswordResets() throws Exception {
        final String admin = this.adminToken();
        final String username = IntegrationTestSupport.unique("race");
        final long id = this.create("/api/users", admin, UserRoleIT.newUser(username, List.of()));
        final List<String> passwords = List.of(UserRoleIT.PASSWORD, "Reset1111", "Reset2222", "Reset3333", "Reset4444");
        final AtomicBoolean running = new AtomicBoolean(true);
        final ExecutorService pool = Executors.newFixedThreadPool(4);
        try {
            final List<Future<?>> loops = new ArrayList<>();
            for (int t = 0; t < 4; t++) {
                loops.add(pool.submit(() -> {
                    while (running.get()) {
                        // 用所有可能的密码轮流登录：总有请求在「读到旧行」与「写回」之间跨过一次重置。
                        passwords.forEach(password -> this.login(username, password));
                    }
                }));
            }
            for (final String password : passwords.subList(1, passwords.size())) {
                IntegrationTestSupport.assertOk(
                        this.put("/api/users/" + id + "/password", admin, Map.of("password", password)));
            }
            running.set(false);
            for (final Future<?> loop : loops) {
                loop.get(30, TimeUnit.SECONDS);
            }
        } finally {
            pool.shutdownNow();
        }

        final Integer tokenVersion =
                this.jdbc.queryForObject("SELECT token_version FROM sys_user WHERE id = ?", Integer.class, id);
        assertThat(tokenVersion).isEqualTo(passwords.size() - 1);
        IntegrationTestSupport.assertOk(this.login(username, "Reset4444"));
        IntegrationTestSupport.assertError(this.login(username, "Reset3333"), HttpStatus.UNAUTHORIZED, 40101);
    }

    @Test
    @DisplayName("只有超管能授予或移除 super_admin：用户管理员既不能给别人加，也不能把超管降级")
    void onlySuperAdminManagesSuperAdminRole() {
        final String admin = this.adminToken();
        final long superUser =
                this.create("/api/users", admin, UserRoleIT.newUser(IntegrationTestSupport.unique("sup"), List.of(1L)));
        final long managerRole =
                this.createRole(admin, IntegrationTestSupport.unique("mgr"), List.of(2L, 3L, 100L, 101L));
        final String manager = IntegrationTestSupport.unique("mgr");
        final long managerId = this.create("/api/users", admin, UserRoleIT.newUser(manager, List.of(managerRole)));
        final String token = this.tokenOf(manager, UserRoleIT.PASSWORD);

        final Map<String, Object> demote = new HashMap<>();
        demote.put("nickname", "降级");
        demote.put("roleIds", List.of());
        IntegrationTestSupport.assertError(
                this.put("/api/users/" + superUser, token, demote), HttpStatus.FORBIDDEN, 40300);

        final Map<String, Object> promoteSelf = new HashMap<>();
        promoteSelf.put("nickname", "提权");
        promoteSelf.put("roleIds", List.of(managerRole, 1L));
        IntegrationTestSupport.assertError(
                this.put("/api/users/" + managerId, token, promoteSelf), HttpStatus.FORBIDDEN, 40300);

        // 保留对方已有的 super_admin 不算授予 / 移除，改其它字段允许。
        final Map<String, Object> keep = new HashMap<>();
        keep.put("nickname", "只改昵称");
        keep.put("roleIds", List.of(1L));
        IntegrationTestSupport.assertOk(this.put("/api/users/" + superUser, token, keep));
        // 超管本人可以移除。
        IntegrationTestSupport.assertOk(this.put("/api/users/" + superUser, admin, demote));
    }

    @Test
    @DisplayName("关键字中的 % 与 _ 按普通字符匹配")
    void keywordWildcardsAreEscaped() {
        final String admin = this.adminToken();
        this.create("/api/users", admin, UserRoleIT.newUser(IntegrationTestSupport.unique("like"), List.of()));
        IntegrationTestSupport.assertOk(this.get("/api/users?keyword=%25", admin));
        assertThat(IntegrationTestSupport.data(this.get("/api/users?keyword=%25", admin))
                        .path("total")
                        .asLong())
                .isZero();
        assertThat(IntegrationTestSupport.data(this.get("/api/users?keyword=_", admin))
                        .path("total")
                        .asLong())
                .isPositive();
        assertThat(IntegrationTestSupport.data(this.get("/api/roles?keyword=%25", admin))
                        .path("total")
                        .asLong())
                .isZero();
    }

    @Test
    @DisplayName("角色 CRUD 与规则：编码格式 40000、重复 40900、内置或有用户时删除 40901")
    void roleRules() {
        final String admin = this.adminToken();
        final String code = IntegrationTestSupport.unique("editor");
        final long roleId =
                this.create("/api/roles", admin, Map.of("name", "编辑", "code", code, "description", "内容编辑", "sort", 3));

        final JsonNode detail = IntegrationTestSupport.data(this.get("/api/roles/" + roleId, admin));
        assertThat(detail.path("code").asText()).isEqualTo(code);
        assertThat(detail.path("sort").asInt()).isEqualTo(3);
        assertThat(detail.path("userCount").asLong()).isZero();
        assertThat(detail.path("menuIds").isArray()).isTrue();

        IntegrationTestSupport.assertError(
                this.post("/api/roles", admin, Map.of("name", "x", "code", "Bad-Code")), HttpStatus.BAD_REQUEST, 40000);
        IntegrationTestSupport.assertError(
                this.post("/api/roles", admin, Map.of("name", "x", "code", code)), HttpStatus.CONFLICT, 40900);
        IntegrationTestSupport.assertError(this.delete("/api/roles/1", admin), HttpStatus.CONFLICT, 40901);
        IntegrationTestSupport.assertError(
                this.put("/api/roles/1", admin, Map.of("name", "超管", "code", "root")), HttpStatus.CONFLICT, 40901);

        this.create("/api/users", admin, UserRoleIT.newUser(IntegrationTestSupport.unique("member"), List.of(roleId)));
        final JsonNode page = IntegrationTestSupport.data(this.get("/api/roles?keyword=" + code, admin));
        assertThat(page.path("list").get(0).path("userCount").asLong()).isEqualTo(1L);
        IntegrationTestSupport.assertError(this.delete("/api/roles/" + roleId, admin), HttpStatus.CONFLICT, 40901);

        final long emptyRole = this.createRole(admin, IntegrationTestSupport.unique("tmp"), List.of(2L, 3L));
        IntegrationTestSupport.assertOk(this.put(
                "/api/roles/" + emptyRole, admin, Map.of("name", "临时", "code", code + "_x", "status", "disabled")));
        IntegrationTestSupport.assertOk(this.delete("/api/roles/" + emptyRole, admin));
        final Integer links = this.jdbc.queryForObject(
                "SELECT COUNT(*) FROM sys_role_menu WHERE role_id = ?", Integer.class, emptyRole);
        assertThat(links).isZero();
        IntegrationTestSupport.assertError(
                this.put("/api/roles/" + roleId + "/menus", admin, Map.of("menuIds", List.of(987_654L))),
                HttpStatus.BAD_REQUEST,
                40000);
    }
}
