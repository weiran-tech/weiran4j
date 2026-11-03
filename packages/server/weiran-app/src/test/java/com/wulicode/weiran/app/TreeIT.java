package com.wulicode.weiran.app;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.JsonNode;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

/** 菜单树：组树、环检测与删除保护。 */
class TreeIT extends IntegrationTestSupport {

    private static Map<String, Object> menu(final long parentId, final String type, final String title) {
        final Map<String, Object> body = new HashMap<>();
        body.put("parentId", parentId);
        body.put("title", title);
        body.put("type", type);
        return body;
    }

    @Test
    @DisplayName("菜单：成环返回 100004，有子节点不可删，类型必填字段校验 100001，删除时清理角色关联")
    void menuTree() {
        final String admin = this.adminToken();
        final Map<String, Object> directory = TreeIT.menu(0, "directory", "测试目录");
        directory.put("path", "/it");
        directory.put("icon", "Folder");
        final long dirId = this.create("/api-backend/system/menu/create", admin, directory);
        final Map<String, Object> page = TreeIT.menu(dirId, "menu", "测试页面");
        page.put("path", "/it/page");
        page.put("component", "it/Page");
        page.put("visible", false);
        page.put("keepAlive", true);
        final long pageId = this.create("/api-backend/system/menu/create", admin, page);

        final JsonNode created = IntegrationTestSupport.data(this.get("/api-backend/system/menu/get/" + pageId, admin));
        assertThat(created.path("visible").asBoolean()).isFalse();
        assertThat(created.path("keepAlive").asBoolean()).isTrue();
        assertThat(created.path("isExternal").asBoolean()).isFalse();

        directory.put("parentId", pageId);
        IntegrationTestSupport.assertError(
                this.put("/api-backend/system/menu/update/" + dirId, admin, directory), HttpStatus.CONFLICT, 100004);
        IntegrationTestSupport.assertError(
                this.delete("/api-backend/system/menu/delete/" + dirId, admin), HttpStatus.CONFLICT, 100004);

        IntegrationTestSupport.assertError(
                this.post("/api-backend/system/menu/create", admin, TreeIT.menu(dirId, "menu", "缺路径")),
                HttpStatus.BAD_REQUEST,
                100001);
        IntegrationTestSupport.assertError(
                this.post("/api-backend/system/menu/create", admin, TreeIT.menu(pageId, "button", "缺权限码")),
                HttpStatus.BAD_REQUEST,
                100001);
        IntegrationTestSupport.assertError(
                this.post("/api-backend/system/menu/create", admin, TreeIT.menu(0, "page", "非法类型")),
                HttpStatus.BAD_REQUEST,
                100001);

        final Map<String, Object> button = TreeIT.menu(pageId, "button", "测试按钮");
        button.put("permission", "it:page:do");
        final long buttonId = this.create("/api-backend/system/menu/create", admin, button);
        final Map<String, Object> pageAsButton = new HashMap<>(page);
        pageAsButton.put("type", "button");
        pageAsButton.put("permission", "it:page:view");
        IntegrationTestSupport.assertError(
                this.put("/api-backend/system/menu/update/" + pageId, admin, pageAsButton),
                HttpStatus.BAD_REQUEST,
                100001);

        final JsonNode all = IntegrationTestSupport.data(this.get("/api-backend/system/menu/list", admin));
        final JsonNode itDir = TreeIT.findById(all, dirId);
        assertThat(itDir.path("children")
                        .get(0)
                        .path("children")
                        .get(0)
                        .path("id")
                        .asLong())
                .isEqualTo(buttonId);
        // 超管的动态菜单包含新菜单（visible=false 也返回），但不含按钮。
        final JsonNode adminMenus =
                IntegrationTestSupport.data(this.get("/api-backend/system/auth/listCurrentMenus", admin));
        assertThat(TreeIT.findById(adminMenus, dirId)
                        .path("children")
                        .get(0)
                        .path("children")
                        .isEmpty())
                .isTrue();

        final long roleId = this.create(
                "/api-backend/system/role/create",
                admin,
                Map.of("name", "菜单角色", "code", IntegrationTestSupport.unique("m")));
        IntegrationTestSupport.assertOk(this.put(
                "/api-backend/system/role/assignMenus/" + roleId,
                admin,
                Map.of("menuIds", List.of(dirId, pageId, buttonId))));
        IntegrationTestSupport.assertOk(this.delete("/api-backend/system/menu/delete/" + buttonId, admin));
        final Integer links = this.jdbc.queryForObject(
                "SELECT COUNT(*) FROM sys_role_menu WHERE menu_id = ?", Integer.class, buttonId);
        assertThat(links).isZero();
        IntegrationTestSupport.assertError(
                this.get("/api-backend/system/menu/get/" + buttonId, admin), HttpStatus.NOT_FOUND, 100002);
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
