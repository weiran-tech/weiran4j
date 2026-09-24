package com.weiran.system.adapter.web;

import com.weiran.common.page.PageQuery;
import com.weiran.common.page.PageResult;
import com.weiran.system.adapter.auth.PrincipalHolder;
import com.weiran.system.adapter.web.dto.CreateBanRequest;
import com.weiran.system.adapter.web.dto.UpdateBanRequest;
import com.weiran.system.api.rbac.BanQuery;
import com.weiran.system.api.rbac.BanService;
import com.weiran.system.api.rbac.BanView;
import com.weiran.system.api.rbac.CreateBanCommand;
import com.weiran.system.api.rbac.UpdateBanCommand;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.jspecify.annotations.Nullable;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** 封禁管理接口。删除记录即视为解除该条封禁。 */
@RestController
@RequestMapping("/api/v1/bans")
@RequiredArgsConstructor
public class BanController {

    private static final String PERMISSION_INDEX = "weiran-system:ban.index";

    private static final String PERMISSION_MANAGE = "weiran-system:ban.manage";

    private final BanService banService;

    private final PrincipalHolder principalHolder;

    /** 分页查询封禁记录列表。 */
    @GetMapping
    public PageResult<BanView> list(
            @RequestParam(defaultValue = "1") final int page,
            @RequestParam(defaultValue = "20") final int size,
            @RequestParam(required = false) final @Nullable String type,
            @RequestParam(required = false) final @Nullable String accountType) {
        this.principalHolder.require().ensure(BanController.PERMISSION_INDEX);
        return this.banService.list(new BanQuery(new PageQuery(page, size), type, accountType));
    }

    /** 新增封禁记录。 */
    @PostMapping
    public BanView create(@Valid @RequestBody final CreateBanRequest request) {
        this.principalHolder.require().ensure(BanController.PERMISSION_MANAGE);
        return this.banService.create(new CreateBanCommand(
                request.accountType(),
                request.type(),
                request.value(),
                request.ipStart(),
                request.ipEnd(),
                request.note()));
    }

    /** 编辑封禁记录。 */
    @PostMapping("/{id}/update")
    public BanView update(@PathVariable final long id, @Valid @RequestBody final UpdateBanRequest request) {
        this.principalHolder.require().ensure(BanController.PERMISSION_MANAGE);
        return this.banService.update(
                id, new UpdateBanCommand(request.value(), request.ipStart(), request.ipEnd(), request.note()));
    }

    /** 删除封禁记录，即解除该条封禁。走 POST 语义化路径而非 DELETE 动词——design.md 已决定不引入 PUT/DELETE。 */
    @PostMapping("/{id}/delete")
    public void delete(@PathVariable final long id) {
        this.principalHolder.require().ensure(BanController.PERMISSION_MANAGE);
        this.banService.delete(id);
    }
}
