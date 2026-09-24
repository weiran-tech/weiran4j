-- 集成测试用的最小 pam_* 表结构。
--
-- 列定义对齐 weiran-v1 的迁移文件，只有一处**有意的差异**：
-- password 从 varchar(45) 放宽到 varchar(72)。BCrypt 哈希固定 60 字符，
-- 45 列会静默截断，表现为「改密成功但从此登不进去」。
-- 真正迁移生产库时必须先执行这条 ALTER，见 docs/20-数据迁移注意事项.md。

CREATE TABLE pam_account (
    id               INT AUTO_INCREMENT PRIMARY KEY,
    username         VARCHAR(45)  NOT NULL DEFAULT '',
    mobile           VARCHAR(45)  NOT NULL DEFAULT '',
    email            VARCHAR(50)  NOT NULL DEFAULT '',
    parent_id        INT          NOT NULL DEFAULT 0,
    password         VARCHAR(72)  NOT NULL DEFAULT '',
    password_key     VARCHAR(10)  NOT NULL DEFAULT '',
    type             VARCHAR(20)  NOT NULL DEFAULT '',
    is_enable        TINYINT      NOT NULL DEFAULT 1,
    disable_reason   VARCHAR(255) NOT NULL DEFAULT '',
    disable_start_at DATETIME     NULL,
    disable_end_at   DATETIME     NULL,
    login_times      INT          NOT NULL DEFAULT 0,
    login_ip         VARCHAR(20)  NOT NULL DEFAULT '',
    reg_ip           VARCHAR(20)  NOT NULL DEFAULT '',
    reg_platform     VARCHAR(15)  NOT NULL DEFAULT '',
    logined_at       DATETIME     NULL,
    created_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE pam_role (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(100) NOT NULL DEFAULT '',
    title       VARCHAR(100) NOT NULL DEFAULT '',
    description VARCHAR(100) NOT NULL DEFAULT '',
    type        VARCHAR(20)  NOT NULL DEFAULT '',
    is_enable   TINYINT      NOT NULL DEFAULT 1,
    is_system   TINYINT      NOT NULL DEFAULT 0
);

CREATE TABLE pam_permission (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(255) NOT NULL DEFAULT '',
    title       VARCHAR(255) NOT NULL DEFAULT '',
    description VARCHAR(255) NOT NULL DEFAULT '',
    "GROUP"     VARCHAR(50)  NOT NULL DEFAULT '',
    root        VARCHAR(50)  NOT NULL DEFAULT '',
    module      VARCHAR(50)  NOT NULL DEFAULT '',
    type        VARCHAR(50)  NOT NULL DEFAULT '',
    CONSTRAINT u_permission_name UNIQUE (name)
);

CREATE TABLE pam_permission_role (
    permission_id INT NOT NULL DEFAULT 0,
    role_id       INT NOT NULL DEFAULT 0,
    PRIMARY KEY (permission_id, role_id)
);

CREATE TABLE pam_role_account (
    account_id INT NOT NULL DEFAULT 0,
    role_id    INT NOT NULL DEFAULT 0
);

-- "value" 是 H2 的保留关键字（与上面 pam_permission 的 "GROUP" 同理），必须加引号。
CREATE TABLE pam_ban (
    id           BIGINT AUTO_INCREMENT PRIMARY KEY,
    account_type VARCHAR(20)  NOT NULL DEFAULT 'user',
    type         VARCHAR(45)  NOT NULL DEFAULT '',
    "VALUE"      VARCHAR(45)  NOT NULL DEFAULT '',
    ip_start     BIGINT       NOT NULL DEFAULT 0,
    ip_end       BIGINT       NOT NULL DEFAULT 0,
    note         VARCHAR(255) NOT NULL DEFAULT '',
    created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
);
