package com.wulicode.weiran.app;

import org.flywaydb.core.Flyway;

/** 仅供 Gradle 维护任务调用，不启动应用或执行迁移。 */
public final class FlywayRepairTool {

    private FlywayRepairTool() {}

    public static void main(final String[] args) {
        if (args.length != 1 || !(args[0].equals("local") || args[0].equals("test") || args[0].equals("prod"))) {
            throw new IllegalArgumentException("profile 必须为 local、test 或 prod");
        }
        final String url = FlywayRepairTool.required("WEIRAN_DB_URL");
        final String username = FlywayRepairTool.required("WEIRAN_DB_USERNAME");
        final String password = System.getenv("WEIRAN_DB_PASSWORD");
        if (password == null) {
            throw new IllegalArgumentException("必须显式设置 WEIRAN_DB_PASSWORD（空密码也要设置为空字符串）");
        }
        final String defaultLocations =
                args[0].equals("prod") ? "classpath:db/migration" : "classpath:db/migration,classpath:db/app-demo";
        final String locations = System.getenv().getOrDefault("SPRING_FLYWAY_LOCATIONS", defaultLocations);
        final String table = System.getenv().getOrDefault("SPRING_FLYWAY_TABLE", "sys_migration");
        final Flyway flyway = Flyway.configure()
                .dataSource(url, username, password)
                .table(table)
                .locations(locations.split(","))
                .failOnMissingLocations(false)
                .load();
        System.out.println("Flyway repair 历史表：" + table + "；迁移目录：" + locations);
        final var result = flyway.repair();
        System.out.println("Flyway repair 完成：" + result.repairActions);
    }

    private static String required(final String name) {
        final String value = System.getenv(name);
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException("必须显式设置 " + name);
        }
        return value;
    }
}
