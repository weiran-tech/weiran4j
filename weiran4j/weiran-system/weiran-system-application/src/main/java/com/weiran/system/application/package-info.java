/**
 * weiran-system 应用层：用例编排与事务边界。
 *
 * <p>本层负责「一次业务动作要按什么顺序调哪些端口」，不含业务规则本身——规则属于领域层。
 * 事务注解只出现在这一层：领域层不知道事务，基础设施层的事务边界由调用方决定。
 */
@NullMarked
package com.weiran.system.application;

import org.jspecify.annotations.NullMarked;
