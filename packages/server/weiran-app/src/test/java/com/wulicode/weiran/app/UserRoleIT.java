package com.wulicode.weiran.app;

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
import java.util.concurrent.atomic.AtomicLong;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

/** 用户与角色：CRUD、角色授权、权限拦截、令牌吊销。 */
class UserRoleIT extends IntegrationTestSupport {

    private static final String PASSWORD = "Passw0rd1";

    private static final AtomicLong PHONE_SEQUENCE = new AtomicLong(10_000_000L);

    private static Map<String, Object> newUser(final String username, final List<Long> roleIds) {
        final Map<String, Object> body = new HashMap<>();
        body.put("username", username);
        body.put("nickname", "测试" + username);
        body.put("password", UserRoleIT.PASSWORD);
        body.put("phone", "138" + String.format("%08d", UserRoleIT.PHONE_SEQUENCE.getAndIncrement()));
        body.put("gender", "male");
        body.put("roleIds", roleIds);
        return body;
    }

    private long createRole(final String admin, final String code, final List<Long> menuIds) {
        final long roleId =
                this.create("/api-backend/system/role/create", admin, Map.of("name", "角色" + code, "code", code));
        IntegrationTestSupport.assertOk(
                this.put("/api-backend/system/role/assignMenus/" + roleId, admin, Map.of("menuIds", menuIds)));
        return roleId;
    }

    @Test
    @DisplayName("普通用户只拥有角色授予的权限：可查用户列表，新增用户与查角色返回 403")
    void regularUserPermissions() {
        final String admin = this.adminToken();
        // 只勾选「用户管理」菜单（id 3），不勾父目录，验证可见菜单会自动补齐父目录。
        final long roleId = this.createRole(admin, IntegrationTestSupport.unique("viewer"), List.of(3L));
        final String username = IntegrationTestSupport.unique("viewer");
        this.create("/api-backend/system/user/create", admin, UserRoleIT.newUser(username, List.of(roleId)));
        final String token = this.tokenOf(username, UserRoleIT.PASSWORD);

        IntegrationTestSupport.assertOk(this.get("/api-backend/system/user/list", token));
        IntegrationTestSupport.assertError(
                this.post(
                        "/api-backend/system/user/create",
                        token,
                        UserRoleIT.newUser(IntegrationTestSupport.unique("x"), List.of())),
                HttpStatus.FORBIDDEN,
                100102);
        IntegrationTestSupport.assertError(
                this.get("/api-backend/system/role/list", token), HttpStatus.FORBIDDEN, 100102);
        IntegrationTestSupport.assertOk(this.get("/api-backend/system/role/listOptions", token));

        final JsonNode me = IntegrationTestSupport.data(this.get("/api-backend/system/auth/getCurrentUser", token));
        assertThat(AuthIT.texts(me.path("permissions"))).containsExactly("system:user:list");
        final JsonNode menus =
                IntegrationTestSupport.data(this.get("/api-backend/system/auth/listCurrentMenus", token));
        assertThat(AuthIT.ids(menus)).containsExactly(2L);
        assertThat(AuthIT.ids(menus.get(0).path("children"))).containsExactly(3L);

        // 追加按钮权限后立即生效（授权快照缓存被失效）。
        IntegrationTestSupport.assertOk(this.put(
                "/api-backend/system/role/assignMenus/" + roleId, admin, Map.of("menuIds", List.of(2L, 3L, 100L))));
        IntegrationTestSupport.assertOk(this.post(
                "/api-backend/system/user/create",
                token,
                UserRoleIT.newUser(IntegrationTestSupport.unique("made"), List.of())));
        // 有新增用户权限但不是超管：不能授予 super_admin（防提权）。
        IntegrationTestSupport.assertError(
                this.post(
                        "/api-backend/system/user/create",
                        token,
                        UserRoleIT.newUser(IntegrationTestSupport.unique("esc"), List.of(1L))),
                HttpStatus.FORBIDDEN,
                100102);
    }

    @Test
    @DisplayName("用户 CRUD：新增、详情、分页筛选、修改、删除；视图不含密码与令牌版本")
    void userCrud() {
        final String admin = this.adminToken();
        final long roleId = this.createRole(admin, IntegrationTestSupport.unique("crud"), List.of());
        final String username = IntegrationTestSupport.unique("crud");
        final long id =
                this.create("/api-backend/system/user/create", admin, UserRoleIT.newUser(username, List.of(roleId)));

        final JsonNode view = IntegrationTestSupport.data(this.get("/api-backend/system/user/get/" + id, admin));
        assertThat(view.path("username").asText()).isEqualTo(username);
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
                this.get("/api-backend/system/user/list?keyword=" + username + "&status=enabled&pageSize=10", admin);
        IntegrationTestSupport.assertOk(page);
        assertThat(IntegrationTestSupport.data(page).path("total").asLong()).isEqualTo(1L);

        final Map<String, Object> update = new HashMap<>();
        update.put("nickname", "改名");
        update.put("gender", "female");
        update.put("status", "enabled");
        update.put("roleIds", List.of());
        IntegrationTestSupport.assertOk(this.put("/api-backend/system/user/update/" + id, admin, update));
        final JsonNode updated = IntegrationTestSupport.data(this.get("/api-backend/system/user/get/" + id, admin));
        assertThat(updated.path("nickname").asText()).isEqualTo("改名");
        assertThat(updated.has("email")).isFalse();
        assertThat(updated.path("roleIds").isEmpty()).isTrue();

        final JsonNode options = IntegrationTestSupport.data(this.get("/api-backend/system/user/listOptions", admin));
        assertThat(options.findValuesAsText("username")).contains(username, "admin");

        IntegrationTestSupport.assertOk(this.delete("/api-backend/system/user/delete/" + id, admin));
        IntegrationTestSupport.assertError(
                this.get("/api-backend/system/user/get/" + id, admin), HttpStatus.NOT_FOUND, 100002);
        final Integer links =
                this.jdbc.queryForObject("SELECT COUNT(*) FROM sys_user_role WHERE user_id = ?", Integer.class, id);
        assertThat(links).isZero();
    }

    /** 用户分页结果里的用户 ID（保持返回顺序，便于断言重复）。 */
    private List<Long> userIds(final String admin, final String query) {
        final ResponseEntity<JsonNode> response =
                this.get("/api-backend/system/user/list?pageSize=100&" + query, admin);
        IntegrationTestSupport.assertOk(response);
        final List<Long> ids = new ArrayList<>();
        IntegrationTestSupport.data(response)
                .path("list")
                .forEach(node -> ids.add(node.path("id").asLong()));
        return ids;
    }

    @Test
    @DisplayName("高级筛选：用户名 / ID / 手机精确匹配，角色去重，性别，时间闭区间与从未登录，多条件交集，非法值 100001")
    void advancedFilters() {
        final String admin = this.adminToken();
        final long role1 = this.createRole(admin, IntegrationTestSupport.unique("adv"), List.of());
        final long role2 = this.createRole(admin, IntegrationTestSupport.unique("adv"), List.of());
        final String nameA = IntegrationTestSupport.unique("adva");
        final String phoneA = "139" + String.format("%08d", Math.floorMod(System.nanoTime(), 100_000_000L));
        final Map<String, Object> bodyA = UserRoleIT.newUser(nameA, List.of(role1, role2));
        bodyA.put("phone", phoneA);
        bodyA.put("gender", "female");
        final long idA = this.create("/api-backend/system/user/create", admin, bodyA);
        final long idB = this.create(
                "/api-backend/system/user/create",
                admin,
                UserRoleIT.newUser(IntegrationTestSupport.unique("advb"), List.of(role1)));

        // 单字段精确匹配：前缀不命中
        assertThat(this.userIds(admin, "username=" + nameA)).containsExactly(idA);
        assertThat(this.userIds(admin, "username=" + nameA.substring(0, nameA.length() - 1)))
                .doesNotContain(idA);
        assertThat(this.userIds(admin, "userId=" + idA)).containsExactly(idA);
        final ResponseEntity<JsonNode> missing = this.get("/api-backend/system/user/list?userId=999999999", admin);
        IntegrationTestSupport.assertOk(missing);
        assertThat(IntegrationTestSupport.data(missing).path("total").asLong()).isZero();
        assertThat(this.userIds(admin, "phone=" + phoneA)).containsExactly(idA);
        assertThat(this.userIds(admin, "phone=" + phoneA.substring(0, 7))).doesNotContain(idA);

        // 角色：一人多角色也只出现一次，total 与去重后条数一致
        final ResponseEntity<JsonNode> byRole =
                this.get("/api-backend/system/user/list?pageSize=100&roleId=" + role1, admin);
        assertThat(IntegrationTestSupport.data(byRole).path("total").asLong()).isEqualTo(2L);
        assertThat(this.userIds(admin, "roleId=" + role1)).containsExactlyInAnyOrder(idA, idB);
        assertThat(this.userIds(admin, "roleId=" + role2)).containsExactly(idA);

        // 性别：按值过滤，非法值 100001；不传性别时不过滤（B 为 male 仍在）
        final ResponseEntity<JsonNode> females =
                this.get("/api-backend/system/user/list?pageSize=100&gender=female", admin);
        assertThat(IntegrationTestSupport.data(females).path("list").findValuesAsText("gender"))
                .containsOnly("female");
        assertThat(this.userIds(admin, "gender=female")).contains(idA).doesNotContain(idB);
        assertThat(this.userIds(admin, "roleId=" + role1)).contains(idB);
        IntegrationTestSupport.assertError(
                this.get("/api-backend/system/user/list?gender=x", admin), HttpStatus.BAD_REQUEST, 100001);

        // 创建时间闭区间：边界时刻包含
        final String createdAt = IntegrationTestSupport.data(this.get("/api-backend/system/user/get/" + idA, admin))
                .path("createdAt")
                .asText();
        assertThat(this.userIds(
                        admin, "username=" + nameA + "&createdStartTime=" + createdAt + "&createdEndTime=" + createdAt))
                .containsExactly(idA);
        assertThat(this.userIds(admin, "username=" + nameA + "&createdEndTime=2000-01-01 00:00:00"))
                .isEmpty();
        // 前端 URLSearchParams 把空格编码成 +，后端须按空格解析
        assertThat(this.userIds(admin, "username=" + nameA + "&createdStartTime=" + createdAt.replace(' ', '+')))
                .containsExactly(idA);

        // 最后登录时间：从未登录的用户被排除，登录后命中
        final String since = "lastLoginStartTime=2000-01-01 00:00:00";
        assertThat(this.userIds(admin, "username=" + nameA + "&" + since)).isEmpty();
        this.tokenOf(nameA, UserRoleIT.PASSWORD);
        assertThat(this.userIds(admin, "username=" + nameA + "&" + since)).containsExactly(idA);
        assertThat(this.userIds(admin, "username=admin&" + since)).hasSize(1);

        // 多条件交集
        assertThat(this.userIds(admin, "keyword=" + nameA + "&gender=female&roleId=" + role1))
                .containsExactly(idA);
        assertThat(this.userIds(admin, "keyword=" + nameA + "&gender=male")).isEmpty();

        // 非法数字与时间格式
        IntegrationTestSupport.assertError(
                this.get("/api-backend/system/user/list?userId=abc", admin), HttpStatus.BAD_REQUEST, 100001);
        IntegrationTestSupport.assertError(
                this.get("/api-backend/system/user/list?createdStartTime=2026-13-01", admin),
                HttpStatus.BAD_REQUEST,
                100001);
    }

    @Test
    @DisplayName("用户名重复 100003，弱密码与非法角色 100001，内置用户删除 / 禁用 100004")
    void userRules() {
        final String admin = this.adminToken();
        final String username = IntegrationTestSupport.unique("dup");
        this.create("/api-backend/system/user/create", admin, UserRoleIT.newUser(username, List.of()));

        IntegrationTestSupport.assertError(
                this.post("/api-backend/system/user/create", admin, UserRoleIT.newUser(username, List.of())),
                HttpStatus.CONFLICT,
                100003);

        final Map<String, Object> weak = UserRoleIT.newUser(IntegrationTestSupport.unique("weak"), List.of());
        weak.put("password", "abcdefgh");
        final ResponseEntity<JsonNode> weakResponse = this.post("/api-backend/system/user/create", admin, weak);
        IntegrationTestSupport.assertError(weakResponse, HttpStatus.BAD_REQUEST, 100001);
        assertThat(IntegrationTestSupport.body(weakResponse).path("message").asText())
                .startsWith("password: ");

        IntegrationTestSupport.assertError(
                this.post(
                        "/api-backend/system/user/create",
                        admin,
                        UserRoleIT.newUser(IntegrationTestSupport.unique("r"), List.of(999_999L))),
                HttpStatus.BAD_REQUEST,
                100001);

        IntegrationTestSupport.assertError(
                this.delete("/api-backend/system/user/delete/1", admin), HttpStatus.CONFLICT, 100004);
        final Map<String, Object> disableAdmin = new HashMap<>();
        disableAdmin.put("nickname", "超级管理员");
        disableAdmin.put("status", "disabled");
        disableAdmin.put("roleIds", List.of(1L));
        IntegrationTestSupport.assertError(
                this.put("/api-backend/system/user/update/1", admin, disableAdmin), HttpStatus.CONFLICT, 100004);
        final Map<String, Object> stripAdmin = new HashMap<>(disableAdmin);
        stripAdmin.put("status", "enabled");
        stripAdmin.put("roleIds", List.of());
        IntegrationTestSupport.assertError(
                this.put("/api-backend/system/user/update/1", admin, stripAdmin), HttpStatus.CONFLICT, 100004);
        final Map<String, Object> missingRoles = UserRoleIT.newUser(IntegrationTestSupport.unique("nr"), List.of());
        missingRoles.remove("roleIds");
        IntegrationTestSupport.assertError(
                this.post("/api-backend/system/user/create", admin, missingRoles), HttpStatus.BAD_REQUEST, 100001);
    }

    @Test
    @DisplayName("用户名创建和管理员修改仅接受 2–32 位小写字母、数字和下划线")
    void usernameCharacterRules() {
        final String admin = this.adminToken();
        final String username = "9_" + IntegrationTestSupport.unique("user");
        final long userId =
                this.create("/api-backend/system/user/create", admin, UserRoleIT.newUser(username, List.of()));
        assertThat(IntegrationTestSupport.data(this.get("/api-backend/system/user/get/" + userId, admin))
                        .path("username")
                        .asText())
                .isEqualTo(username);

        for (final String invalid : List.of("Alice", "alice.name", "alice-name")) {
            IntegrationTestSupport.assertError(
                    this.post("/api-backend/system/user/create", admin, UserRoleIT.newUser(invalid, List.of())),
                    HttpStatus.BAD_REQUEST,
                    100001);
            IntegrationTestSupport.assertError(
                    this.put(
                            "/api-backend/system/user/updateAccountField/" + userId,
                            admin,
                            Map.of("field", "username", "value", invalid)),
                    HttpStatus.BAD_REQUEST,
                    100001);
        }

        final String next = "_" + IntegrationTestSupport.unique("next");
        IntegrationTestSupport.assertOk(this.put(
                "/api-backend/system/user/updateAccountField/" + userId,
                admin,
                Map.of("field", "username", "value", next)));
        assertThat(IntegrationTestSupport.data(this.get("/api-backend/system/user/get/" + userId, admin))
                        .path("username")
                        .asText())
                .isEqualTo(next);
    }

    @Test
    @DisplayName("自己改密后旧令牌失效、新密码可登录；原密码错误返回 100001")
    void changeOwnPasswordRevokesToken() {
        final String admin = this.adminToken();
        final String username = IntegrationTestSupport.unique("pwd");
        this.create("/api-backend/system/user/create", admin, UserRoleIT.newUser(username, List.of()));
        final String oldToken = this.tokenOf(username, UserRoleIT.PASSWORD);

        IntegrationTestSupport.assertError(
                this.put(
                        "/api-backend/system/auth/updatePassword",
                        oldToken,
                        Map.of("oldPassword", "wrong-1234", "newPassword", "NewPass123")),
                HttpStatus.BAD_REQUEST,
                100001);
        IntegrationTestSupport.assertError(
                this.put(
                        "/api-backend/system/auth/updatePassword",
                        oldToken,
                        Map.of("oldPassword", UserRoleIT.PASSWORD, "newPassword", "short")),
                HttpStatus.BAD_REQUEST,
                100001);
        IntegrationTestSupport.assertOk(this.put(
                "/api-backend/system/auth/updatePassword",
                oldToken,
                Map.of("oldPassword", UserRoleIT.PASSWORD, "newPassword", "NewPass123")));

        IntegrationTestSupport.assertError(
                this.get("/api-backend/system/auth/getCurrentUser", oldToken), HttpStatus.UNAUTHORIZED, 100101);
        IntegrationTestSupport.assertError(this.login(username, UserRoleIT.PASSWORD), HttpStatus.UNAUTHORIZED, 110101);
        IntegrationTestSupport.assertOk(
                this.get("/api-backend/system/auth/getCurrentUser", this.tokenOf(username, "NewPass123")));
    }

    @Test
    @DisplayName("管理员重置密码与禁用用户都会让旧令牌失效，禁用后登录返回 110103")
    void resetAndDisableRevokeTokens() {
        final String admin = this.adminToken();
        final String username = IntegrationTestSupport.unique("reset");
        final long id = this.create("/api-backend/system/user/create", admin, UserRoleIT.newUser(username, List.of()));
        final String firstToken = this.tokenOf(username, UserRoleIT.PASSWORD);
        IntegrationTestSupport.assertOk(this.get("/api-backend/system/auth/getCurrentUser", firstToken));

        IntegrationTestSupport.assertOk(
                this.put("/api-backend/system/user/updatePassword/" + id, admin, Map.of("password", "Reset1234")));
        IntegrationTestSupport.assertError(
                this.get("/api-backend/system/auth/getCurrentUser", firstToken), HttpStatus.UNAUTHORIZED, 100101);

        final String secondToken = this.tokenOf(username, "Reset1234");
        final Map<String, Object> disable = new HashMap<>();
        disable.put("nickname", "禁用");
        disable.put("status", "disabled");
        disable.put("roleIds", List.of());
        IntegrationTestSupport.assertOk(this.put("/api-backend/system/user/update/" + id, admin, disable));
        IntegrationTestSupport.assertError(
                this.get("/api-backend/system/auth/getCurrentUser", secondToken), HttpStatus.UNAUTHORIZED, 100101);
        IntegrationTestSupport.assertError(this.login(username, "Reset1234"), HttpStatus.FORBIDDEN, 110103);

        // PUT 中省略 status 时保持原值，不会把禁用用户悄悄启用。
        final Map<String, Object> rename = new HashMap<>();
        rename.put("nickname", "改名但不改状态");
        rename.put("roleIds", List.of());
        IntegrationTestSupport.assertOk(this.put("/api-backend/system/user/update/" + id, admin, rename));
        assertThat(IntegrationTestSupport.data(this.get("/api-backend/system/user/get/" + id, admin))
                        .path("status")
                        .asText())
                .isEqualTo("disabled");
    }

    @Test
    @DisplayName("并发登录不会把管理员刚重置的密码与令牌版本写回旧值（登录只定向更新登录信息）")
    void concurrentLoginsDoNotUndoPasswordResets() throws Exception {
        final String admin = this.adminToken();
        final String username = IntegrationTestSupport.unique("race");
        final long id = this.create("/api-backend/system/user/create", admin, UserRoleIT.newUser(username, List.of()));
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
                        this.put("/api-backend/system/user/updatePassword/" + id, admin, Map.of("password", password)));
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
        IntegrationTestSupport.assertError(this.login(username, "Reset3333"), HttpStatus.UNAUTHORIZED, 110101);
    }

    @Test
    @DisplayName("只有超管能授予或移除 super_admin：用户管理员既不能给别人加，也不能把超管降级")
    void onlySuperAdminManagesSuperAdminRole() {
        final String admin = this.adminToken();
        final long superUser = this.create(
                "/api-backend/system/user/create",
                admin,
                UserRoleIT.newUser(IntegrationTestSupport.unique("sup"), List.of(1L)));
        final long managerRole =
                this.createRole(admin, IntegrationTestSupport.unique("mgr"), List.of(2L, 3L, 100L, 101L));
        final String manager = IntegrationTestSupport.unique("mgr");
        final long managerId = this.create(
                "/api-backend/system/user/create", admin, UserRoleIT.newUser(manager, List.of(managerRole)));
        final String token = this.tokenOf(manager, UserRoleIT.PASSWORD);

        final Map<String, Object> demote = new HashMap<>();
        demote.put("nickname", "降级");
        demote.put("roleIds", List.of());
        IntegrationTestSupport.assertError(
                this.put("/api-backend/system/user/update/" + superUser, token, demote), HttpStatus.FORBIDDEN, 100102);

        final Map<String, Object> promoteSelf = new HashMap<>();
        promoteSelf.put("nickname", "提权");
        promoteSelf.put("roleIds", List.of(managerRole, 1L));
        IntegrationTestSupport.assertError(
                this.put("/api-backend/system/user/update/" + managerId, token, promoteSelf),
                HttpStatus.FORBIDDEN,
                100102);

        // 保留对方已有的 super_admin 不算授予 / 移除，改其它字段允许。
        final Map<String, Object> keep = new HashMap<>();
        keep.put("nickname", "只改昵称");
        keep.put("roleIds", List.of(1L));
        IntegrationTestSupport.assertOk(this.put("/api-backend/system/user/update/" + superUser, token, keep));
        // 超管本人可以移除。
        IntegrationTestSupport.assertOk(this.put("/api-backend/system/user/update/" + superUser, admin, demote));
    }

    @Test
    @DisplayName("关键字中的 % 与 _ 按普通字符匹配")
    void keywordWildcardsAreEscaped() {
        final String admin = this.adminToken();
        this.create(
                "/api-backend/system/user/create",
                admin,
                UserRoleIT.newUser(IntegrationTestSupport.unique("like"), List.of()));
        IntegrationTestSupport.assertOk(this.get("/api-backend/system/user/list?keyword=%25", admin));
        assertThat(IntegrationTestSupport.data(this.get("/api-backend/system/user/list?keyword=%25", admin))
                        .path("total")
                        .asLong())
                .isZero();
        assertThat(IntegrationTestSupport.data(this.get("/api-backend/system/user/list?keyword=_", admin))
                        .path("total")
                        .asLong())
                .isPositive();
        assertThat(IntegrationTestSupport.data(this.get("/api-backend/system/role/list?keyword=%25", admin))
                        .path("total")
                        .asLong())
                .isZero();
    }

    @Test
    @DisplayName("角色 CRUD 与规则：编码格式 100001、重复 100003、内置或有用户时删除 100004")
    void roleRules() {
        final String admin = this.adminToken();
        final String code = IntegrationTestSupport.unique("editor");
        final long roleId = this.create(
                "/api-backend/system/role/create",
                admin,
                Map.of("name", "编辑", "code", code, "description", "内容编辑", "sort", 3));

        final JsonNode detail = IntegrationTestSupport.data(this.get("/api-backend/system/role/get/" + roleId, admin));
        assertThat(detail.path("code").asText()).isEqualTo(code);
        assertThat(detail.path("sort").asInt()).isEqualTo(3);
        assertThat(detail.path("userCount").asLong()).isZero();
        assertThat(detail.path("menuIds").isArray()).isTrue();

        IntegrationTestSupport.assertError(
                this.post("/api-backend/system/role/create", admin, Map.of("name", "x", "code", "Bad-Code")),
                HttpStatus.BAD_REQUEST,
                100001);
        IntegrationTestSupport.assertError(
                this.post("/api-backend/system/role/create", admin, Map.of("name", "x", "code", code)),
                HttpStatus.CONFLICT,
                100003);
        IntegrationTestSupport.assertError(
                this.delete("/api-backend/system/role/delete/1", admin), HttpStatus.CONFLICT, 100004);
        IntegrationTestSupport.assertError(
                this.put("/api-backend/system/role/update/1", admin, Map.of("name", "超管", "code", "root")),
                HttpStatus.CONFLICT,
                100004);

        this.create(
                "/api-backend/system/user/create",
                admin,
                UserRoleIT.newUser(IntegrationTestSupport.unique("member"), List.of(roleId)));
        final JsonNode page =
                IntegrationTestSupport.data(this.get("/api-backend/system/role/list?keyword=" + code, admin));
        assertThat(page.path("list").get(0).path("userCount").asLong()).isEqualTo(1L);
        IntegrationTestSupport.assertError(
                this.delete("/api-backend/system/role/delete/" + roleId, admin), HttpStatus.CONFLICT, 100004);

        final long emptyRole = this.createRole(admin, IntegrationTestSupport.unique("tmp"), List.of(2L, 3L));
        IntegrationTestSupport.assertOk(this.put(
                "/api-backend/system/role/update/" + emptyRole,
                admin,
                Map.of("name", "临时", "code", code + "_x", "status", "disabled")));
        IntegrationTestSupport.assertOk(this.delete("/api-backend/system/role/delete/" + emptyRole, admin));
        final Integer links = this.jdbc.queryForObject(
                "SELECT COUNT(*) FROM sys_role_menu WHERE role_id = ?", Integer.class, emptyRole);
        assertThat(links).isZero();
        IntegrationTestSupport.assertError(
                this.put("/api-backend/system/role/assignMenus/" + roleId, admin, Map.of("menuIds", List.of(987_654L))),
                HttpStatus.BAD_REQUEST,
                100001);
    }
}
