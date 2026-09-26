package com.weiran.app;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.JsonNode;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

/** 菜单树与部门树：组树、环检测、删除保护、含子部门查询。 */
class TreeIT extends IntegrationTestSupport {

    private static Map<String, Object> department(final long parentId, final String code) {
        final Map<String, Object> body = new HashMap<>();
        body.put("parentId", parentId);
        body.put("name", "部门" + code);
        body.put("code", code);
        body.put("leaderId", 1);
        body.put("sort", 1);
        return body;
    }

    private static Map<String, Object> menu(final long parentId, final String type, final String title) {
        final Map<String, Object> body = new HashMap<>();
        body.put("parentId", parentId);
        body.put("title", title);
        body.put("type", type);
        return body;
    }

    @Test
    @DisplayName("部门：挂到自己或后代下返回 40901，有子部门或有用户时不可删，按部门查用户包含子部门")
    void departmentTree() {
        final String admin = this.adminToken();
        final long parent =
                this.create("/api/departments", admin, TreeIT.department(1, IntegrationTestSupport.unique("DA")));
        final long child =
                this.create("/api/departments", admin, TreeIT.department(parent, IntegrationTestSupport.unique("DB")));

        final JsonNode node = IntegrationTestSupport.data(this.get("/api/departments/" + child, admin));
        assertThat(node.path("parentId").asLong()).isEqualTo(parent);
        assertThat(node.path("leaderName").asText()).isEqualTo("超级管理员");
        assertThat(node.path("children").isEmpty()).isTrue();

        final Map<String, Object> toDescendant = TreeIT.department(child, "ignored_" + parent);
        toDescendant.put("code", node.path("code").asText() + "_p");
        IntegrationTestSupport.assertError(
                this.put("/api/departments/" + parent, admin, toDescendant), HttpStatus.CONFLICT, 40901);
        IntegrationTestSupport.assertError(
                this.put("/api/departments/" + parent, admin, TreeIT.department(parent, "self_" + parent)),
                HttpStatus.CONFLICT,
                40901);
        IntegrationTestSupport.assertError(
                this.delete("/api/departments/" + parent, admin), HttpStatus.CONFLICT, 40901);

        final String username = IntegrationTestSupport.unique("deptuser");
        final Map<String, Object> user = new HashMap<>();
        user.put("username", username);
        user.put("nickname", "部门成员");
        user.put("password", "Passw0rd1");
        user.put("departmentId", child);
        user.put("roleIds", List.of());
        this.create("/api/users", admin, user);
        final JsonNode byParent = IntegrationTestSupport.data(this.get("/api/users?departmentId=" + parent, admin));
        assertThat(byParent.path("list").findValuesAsText("username")).containsExactly(username);
        IntegrationTestSupport.assertError(this.delete("/api/departments/" + child, admin), HttpStatus.CONFLICT, 40901);

        final JsonNode tree = IntegrationTestSupport.data(this.get("/api/departments?status=enabled", admin));
        final JsonNode root = tree.get(0);
        assertThat(root.path("code").asText()).isEqualTo("HQ");
        assertThat(root.path("children").findValuesAsText("id")).contains(String.valueOf(parent));

        IntegrationTestSupport.assertError(
                this.post("/api/departments", admin, TreeIT.department(1, "HQ")), HttpStatus.CONFLICT, 40900);
    }

    @Test
    @DisplayName("菜单：成环返回 40901，有子节点不可删，类型必填字段校验 40000，删除时清理角色关联")
    void menuTree() {
        final String admin = this.adminToken();
        final Map<String, Object> directory = TreeIT.menu(0, "directory", "测试目录");
        directory.put("path", "/it");
        directory.put("icon", "Folder");
        final long dirId = this.create("/api/menus", admin, directory);
        final Map<String, Object> page = TreeIT.menu(dirId, "menu", "测试页面");
        page.put("path", "/it/page");
        page.put("component", "it/Page");
        page.put("visible", false);
        page.put("keepAlive", true);
        final long pageId = this.create("/api/menus", admin, page);

        final JsonNode created = IntegrationTestSupport.data(this.get("/api/menus/" + pageId, admin));
        assertThat(created.path("visible").asBoolean()).isFalse();
        assertThat(created.path("keepAlive").asBoolean()).isTrue();
        assertThat(created.path("isExternal").asBoolean()).isFalse();

        directory.put("parentId", pageId);
        IntegrationTestSupport.assertError(
                this.put("/api/menus/" + dirId, admin, directory), HttpStatus.CONFLICT, 40901);
        IntegrationTestSupport.assertError(this.delete("/api/menus/" + dirId, admin), HttpStatus.CONFLICT, 40901);

        IntegrationTestSupport.assertError(
                this.post("/api/menus", admin, TreeIT.menu(dirId, "menu", "缺路径")), HttpStatus.BAD_REQUEST, 40000);
        IntegrationTestSupport.assertError(
                this.post("/api/menus", admin, TreeIT.menu(pageId, "button", "缺权限码")), HttpStatus.BAD_REQUEST, 40000);
        IntegrationTestSupport.assertError(
                this.post("/api/menus", admin, TreeIT.menu(0, "page", "非法类型")), HttpStatus.BAD_REQUEST, 40000);

        final Map<String, Object> button = TreeIT.menu(pageId, "button", "测试按钮");
        button.put("permission", "it:page:do");
        final long buttonId = this.create("/api/menus", admin, button);
        final Map<String, Object> pageAsButton = new HashMap<>(page);
        pageAsButton.put("type", "button");
        pageAsButton.put("permission", "it:page:view");
        IntegrationTestSupport.assertError(
                this.put("/api/menus/" + pageId, admin, pageAsButton), HttpStatus.BAD_REQUEST, 40000);

        final JsonNode all = IntegrationTestSupport.data(this.get("/api/menus", admin));
        final JsonNode itDir = TreeIT.findById(all, dirId);
        assertThat(itDir.path("children")
                        .get(0)
                        .path("children")
                        .get(0)
                        .path("id")
                        .asLong())
                .isEqualTo(buttonId);
        // 超管的动态菜单包含新菜单（visible=false 也返回），但不含按钮。
        final JsonNode adminMenus = IntegrationTestSupport.data(this.get("/api/auth/menus", admin));
        assertThat(TreeIT.findById(adminMenus, dirId)
                        .path("children")
                        .get(0)
                        .path("children")
                        .isEmpty())
                .isTrue();

        final long roleId =
                this.create("/api/roles", admin, Map.of("name", "菜单角色", "code", IntegrationTestSupport.unique("m")));
        IntegrationTestSupport.assertOk(this.put(
                "/api/roles/" + roleId + "/menus", admin, Map.of("menuIds", List.of(dirId, pageId, buttonId))));
        IntegrationTestSupport.assertOk(this.delete("/api/menus/" + buttonId, admin));
        final Integer links = this.jdbc.queryForObject(
                "SELECT COUNT(*) FROM sys_role_menu WHERE menu_id = ?", Integer.class, buttonId);
        assertThat(links).isZero();
        IntegrationTestSupport.assertError(this.get("/api/menus/" + buttonId, admin), HttpStatus.NOT_FOUND, 40400);
    }

    private static JsonNode findById(final JsonNode nodes, final long id) {
        for (final JsonNode node : nodes) {
            if (node.path("id").asLong() == id) {
                return node;
            }
        }
        throw new AssertionError("树中找不到节点 " + id + ": " + nodes);
    }
}
