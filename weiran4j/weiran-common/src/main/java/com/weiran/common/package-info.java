/**
 * weiran4j 跨模块通用能力。
 *
 * <p>只放真正跨业务模块复用的东西：错误码基座、分页契约。业务语义一律留在各自模块，
 * 这里一旦开始堆业务，模块边界就失效了。
 */
@NullMarked
package com.weiran.common;

import org.jspecify.annotations.NullMarked;
