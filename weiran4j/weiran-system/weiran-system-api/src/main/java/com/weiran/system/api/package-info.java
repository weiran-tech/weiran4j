/**
 * weiran-system 对外契约。
 *
 * <p>只放 DTO 与对外服务接口。本层不依赖 Spring、不依赖领域层——它是给别的模块和
 * 适配层看的那张脸，一旦引入实现依赖，跨模块调用方就会连带拖进整套实现。
 */
@NullMarked
package com.weiran.system.api;

import org.jspecify.annotations.NullMarked;
