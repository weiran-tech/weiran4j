CREATE TABLE sys_auth_throttle (
    scope VARCHAR(16) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    subject_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    attempts INT NOT NULL,
    window_started_at DATETIME(6) NOT NULL,
    expires_at DATETIME(6) NOT NULL,
    PRIMARY KEY (scope, subject_hash),
    INDEX idx_auth_throttle_expiry (expires_at),
    CONSTRAINT chk_auth_throttle_attempts CHECK (attempts > 0)
) ENGINE=InnoDB;
CREATE TABLE sys_auth_throttle_guard (
    id INT NOT NULL PRIMARY KEY,
    tracked_keys INT NOT NULL,
    CONSTRAINT chk_auth_throttle_singleton CHECK (id = 1),
    CONSTRAINT chk_auth_throttle_keys CHECK (tracked_keys >= 0)
) ENGINE=InnoDB;
INSERT INTO sys_auth_throttle_guard(id, tracked_keys) VALUES (1, 0);
