# 可信客户端 IP 与代理配置

访问日志、登录日志、操作日志和短信 IP 限流使用同一套客户端 IP。默认可信代理列表为空：只采用直接连接对端，忽略访客提交的转发头。使用反向代理时，发布前必须配置实际代理来源，否则所有访客会共享代理 IP 的限流桶。

## 配置边界

```dotenv
# 默认留空，直连无需配置；不要直接复制一个示例网段到生产
WEIRAN_TRUSTED_PROXIES=
```

支持逗号分隔的 IPv4/IPv6 字面量与 CIDR，例如单个代理地址 `10.0.0.2/32`、`2001:db8:1::2/128`。这些都是示例地址，必须换成后端实际连接对端。loopback、私网和 Docker 网段不会自动获得信任；应限制网络入口，只允许指定代理连接后端。Compose 的容器地址可能变化，部署者应在自己的网络规划中提供稳定的代理来源，不能直接信任整个共享私网。

地址不接受主机名、端口、方括号、IPv6 zone id 或非标准 IPv4 简写；配置空项和非法前缀会导致启动失败。IPv6 压缩/展开表示输出一致，IPv4-mapped IPv6 归一为 IPv4；mapped CIDR 仅接受 `/96`～`/128`，对应 IPv4 `/0`～`/32`。不要用 `/0` 作为生产可信范围。

应用显式设置 `server.forward-headers-strategy=none`。改为 `native`/`framework` 或注册 `ForwardedHeaderFilter` 会启动失败；不要额外安装 `RemoteIpValve` 或其他先行改写 `remoteAddr` 的自定义包装器。该约束保证策略看到原始连接对端。对外 SSO 回调地址仍使用 `WEIRAN_PUBLIC_BASE_URL`，不依赖访客转发头推断。

## 直连与单层 Nginx

直连保持空列表。单层代理时，后端仅信任实际 Nginx 来源。仓内 `packages/manage/nginx.conf` 默认作为边缘代理，覆盖访客的 IP 声明：

```nginx
proxy_set_header X-Forwarded-For $remote_addr;
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header Forwarded "";
proxy_set_header X-Forwarded-Proto $scheme;
```

`Cookie`、`Set-Cookie`、`X-CSRF-Token` 和合法 `X-Request-Id` 继续透传。不要仅以 `$proxy_add_x_forwarded_for` 加上后端取首项的方式实现 IP 判断。

## 多层可信代理

例如「访客 → 负载均衡器 → 仓内 Nginx → 后端」，先在 Nginx 的 `server` 中限定负载均衡器，再使用上面的覆盖配置：

```nginx
# 换成真正的负载均衡器来源，不能设为全部私网或 0.0.0.0/0
set_real_ip_from 10.0.0.3/32;
real_ip_header X-Forwarded-For;
real_ip_recursive on;
```

此时 `$remote_addr` 为经可信上游链定位的地址；后端仍只信任与自己直接连接的 Nginx 来源。负载均衡器必须正确追加实际对端或清洗访客声明，不能原样转发访客伪造的头。参考 [Nginx realip 文档](https://nginx.org/en/docs/http/ngx_http_realip_module.html)。

使用自己的多跳网关时，后端也能从 XFF 右侧开始剥离显式可信节点，在首个不可信地址停止；该地址左侧声明不再影响结果。每个被信任的节点都必须在部署者控制下正确构造转发链。

## 请求与状态示例

以下示例只使用保留示例地址。`peer` 指后端看到的直接连接对端；所有结果均适用于日志及短信 IP 限流。

| 场景 | 可信配置 | peer | XFF / X-Real-IP | 结果 |
| --- | --- | --- | --- | --- |
| 直连伪造 | 空 | `203.0.113.7` | XFF=`192.0.2.66` | `203.0.113.7` |
| 单层代理 | `10.0.0.2/32` | `10.0.0.2` | XFF=`203.0.113.7` | `203.0.113.7` |
| 多层可信链 | `10.0.0.2/32,10.0.0.3/32` | `10.0.0.2` | XFF=`192.0.2.66,203.0.113.7,10.0.0.3` | `203.0.113.7`，忽略左侧声明 |
| 未配置代理 | 空 | `10.0.0.2` | XFF=`203.0.113.7` | `10.0.0.2`，访客共享代理桶 |
| 非法链回退 | `10.0.0.2/32` | `10.0.0.2` | XFF=`unknown`，Real-IP=`203.0.113.7` | `10.0.0.2`，不改读 Real-IP |
| XFF 空值 | `10.0.0.2/32` | `10.0.0.2` | XFF 为空，Real-IP=`203.0.113.7` | `10.0.0.2` |
| 兼容单值头 | `10.0.0.2/32` | `10.0.0.2` | XFF 缺失，Real-IP=`203.0.113.7` | `203.0.113.7` |

XFF 最多 4096 字符和 32 项。重复同名头、超长/超跳数或参与判定的空项/非法地址均退回直接对端。X-Real-IP 也必须是单个合法字面量；只有 XFF 完全缺失时才考虑它。标准 `Forwarded` 不参与本项目的 IP 解析。

发布前分别经代理和直接访问后端，发送两组不同的伪造声明，用请求号核对日志：

```bash
curl -i -H 'X-Request-Id: ip-boundary-a' -H 'X-Forwarded-For: 192.0.2.66' \
  -H 'X-Real-IP: 192.0.2.77' -H 'Forwarded: for=192.0.2.88' \
  http://localhost:5202/api-backend/system/auth/getCurrentUser
curl -i -H 'X-Request-Id: ip-boundary-b' -H 'X-Forwarded-For: 192.0.2.99' \
  http://localhost:5202/api-backend/system/auth/getCurrentUser
```

未登录返回 401 是预期，仍会产生访问日志。两次记录的 IP 应相同，且不是伪造的示例地址。还应验证合法多层代理恢复的 IP 与预期一致。IP 反映网络来源，不能代替账号身份或授权校验。
