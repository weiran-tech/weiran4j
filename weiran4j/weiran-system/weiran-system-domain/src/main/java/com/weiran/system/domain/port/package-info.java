/**
 * 领域端口：由 infrastructure 层实现的出向接口。
 *
 * <p>依赖方向在这里反转——领域层定义需要什么，基础设施层提供怎么做。
 * 端口签名里不允许出现任何框架类型（Entity、DO、IPage、HttpServletRequest），
 * 一旦出现，这层反转就白做了。
 */
@NullMarked
package com.weiran.system.domain.port;

import org.jspecify.annotations.NullMarked;
