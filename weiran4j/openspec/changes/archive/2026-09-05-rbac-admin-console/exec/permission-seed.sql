-- 本 change（rbac-admin-console）新增权限点录入脚本。
--
-- 本项目未选定 Flyway/Liquibase（见 openspec/project.json 的 checks-note），
-- 且本次不涉及表结构变更，因此这份权限点数据录入脚本不是 schema migration，
-- 而是发布阶段（design.md Rollout Plan 第 2 步 / tasks.md 4.14）需要人工在目标环境
-- 执行一次的数据初始化操作，随 change 一起保存以便追溯，不代表仓库已建立正式的
-- SQL 迁移管理机制。
--
-- 执行前提：确认目标环境已存在至少一个 system=true 的后台管理角色（tasks.md 0.2），
-- 将 <SUPER_ROLE_ID> 替换为该角色的实际 id 后再执行。

INSERT INTO pam_permission (name, title, description, `group`, root, module, type) VALUES
    ('weiran-system:role.index', '角色查看', '查看角色列表与详情', '账号管理', 'weiran-system', 'weiran-system', ''),
    ('weiran-system:role.manage', '角色管理', '新增/编辑/删除角色', '账号管理', 'weiran-system', 'weiran-system', ''),
    ('weiran-system:role.permissions', '角色权限分配', '分配角色的权限集合', '账号管理', 'weiran-system', 'weiran-system', ''),
    ('weiran-system:account.index', '账号查看', '查看账号列表与详情、登录日志', '账号管理', 'weiran-system', 'weiran-system', ''),
    ('weiran-system:account.manage', '账号管理', '新增/编辑账号、启禁用、重置密码', '账号管理', 'weiran-system', 'weiran-system', ''),
    ('weiran-system:ban.index', '风险拦截查看', '查看封禁记录列表', '风险拦截', 'weiran-system', 'weiran-system', ''),
    ('weiran-system:ban.manage', '风险拦截管理', '新增/编辑/删除封禁记录', '风险拦截', 'weiran-system', 'weiran-system', '');

-- 绑定到系统内置管理角色，使其立即可用；不绑定则新功能上线后无人能访问。
INSERT INTO pam_permission_role (permission_id, role_id)
SELECT id, <SUPER_ROLE_ID> FROM pam_permission
WHERE name IN (
    'weiran-system:role.index',
    'weiran-system:role.manage',
    'weiran-system:role.permissions',
    'weiran-system:account.index',
    'weiran-system:account.manage',
    'weiran-system:ban.index',
    'weiran-system:ban.manage'
);
