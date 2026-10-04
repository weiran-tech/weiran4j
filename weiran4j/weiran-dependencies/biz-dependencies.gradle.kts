// 下游（常青藤 weiran-cqt）第三方依赖版本清单（D-013，契约 §2.2）。上游永不创建本文件；存在时由 weiran-dependencies 自动 apply。
// 只登记框架 BOM 不管的业务依赖；框架已管理的依赖（Spring / Jackson 等）不得在这里约束，否则构建失败。
dependencies {
    constraints {
        // 阿里云短信官方 SDK（cqt-sms-aliyun）。传递依赖 tea / tea-openapi / tea-util 等随它解析。
        add("api", "com.aliyun:dysmsapi20170525:4.6.0")
        // 阿里云 OSS 官方 SDK（cqt-file-upload）。
        add("api", "com.aliyun.oss:aliyun-sdk-oss:3.18.5")
    }
}
