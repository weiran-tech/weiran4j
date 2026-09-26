package com.weiran.platform.application.dict;

import com.weiran.common.error.BizException;
import com.weiran.common.page.PageQuery;
import com.weiran.common.page.PageResult;
import com.weiran.common.status.EnableStatus;
import com.weiran.common.text.Texts;
import com.weiran.platform.api.dict.DictItemView;
import com.weiran.platform.api.dict.DictQuery;
import com.weiran.platform.api.dict.DictService;
import com.weiran.platform.api.dict.DictView;
import com.weiran.platform.api.dict.SaveDictCommand;
import com.weiran.platform.api.dict.SaveDictItemCommand;
import com.weiran.platform.domain.dict.Dict;
import com.weiran.platform.domain.dict.DictCriteria;
import com.weiran.platform.domain.dict.DictItem;
import com.weiran.platform.domain.dict.DictRepository;
import java.util.List;
import org.jspecify.annotations.Nullable;
import org.springframework.transaction.annotation.Transactional;

/** 字典管理用例。 */
public class DictApplicationService implements DictService {

    private final DictRepository dictRepository;

    /** 构造服务。 */
    public DictApplicationService(final DictRepository dictRepository) {
        this.dictRepository = dictRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public PageResult<DictView> page(final DictQuery query, final PageQuery pageQuery) {
        final DictCriteria criteria =
                new DictCriteria(Texts.trimToNull(query.keyword()), EnableStatus.filterOf(query.status()));
        return this.dictRepository.page(criteria, pageQuery).map(DictApplicationService::toView);
    }

    @Override
    @Transactional(readOnly = true)
    public DictView get(final long id) {
        return DictApplicationService.toView(this.requireDict(id));
    }

    @Override
    @Transactional
    public long create(final SaveDictCommand command) {
        final String code = command.code().strip();
        if (this.dictRepository.existsByCode(code)) {
            throw BizException.duplicate("字典编码已存在");
        }
        return this.dictRepository.save(Dict.builder()
                .name(command.name().strip())
                .code(code)
                .description(Texts.trimToNull(command.description()))
                .status(EnableStatus.ofNullable(command.status(), EnableStatus.ENABLED))
                .builtin(false)
                .build());
    }

    @Override
    @Transactional
    public void update(final long id, final SaveDictCommand command) {
        final Dict dict = this.requireDict(id);
        final String code = command.code().strip();
        final Dict updated = dict.withDetails(
                command.name().strip(),
                code,
                Texts.trimToNull(command.description()),
                EnableStatus.ofNullable(command.status(), dict.getStatus()));
        if (!dict.getCode().equals(code) && this.dictRepository.existsByCode(code)) {
            throw BizException.duplicate("字典编码已存在");
        }
        this.dictRepository.save(updated);
    }

    @Override
    @Transactional
    public void delete(final long id) {
        this.requireDict(id).ensureDeletable();
        this.dictRepository.deleteById(id);
    }

    @Override
    @Transactional(readOnly = true)
    public List<DictItemView> items(final long dictId) {
        this.requireDict(dictId);
        return this.dictRepository.findItems(dictId).stream()
                .map(DictApplicationService::toView)
                .toList();
    }

    @Override
    @Transactional
    public long createItem(final long dictId, final SaveDictItemCommand command) {
        this.requireDict(dictId);
        final String value = command.value().strip();
        if (this.dictRepository.existsItemValue(dictId, value)) {
            throw BizException.duplicate("字典项值已存在");
        }
        return this.dictRepository.saveItem(
                DictApplicationService.apply(DictItem.builder().dictId(dictId), command, value, null)
                        .build());
    }

    @Override
    @Transactional
    public void updateItem(final long dictId, final long itemId, final SaveDictItemCommand command) {
        final DictItem item = this.requireItem(dictId, itemId);
        final String value = command.value().strip();
        if (!item.getValue().equals(value) && this.dictRepository.existsItemValue(dictId, value)) {
            throw BizException.duplicate("字典项值已存在");
        }
        this.dictRepository.saveItem(DictApplicationService.apply(item.toBuilder(), command, value, item)
                .build());
    }

    @Override
    @Transactional
    public void deleteItem(final long dictId, final long itemId) {
        this.requireItem(dictId, itemId);
        this.dictRepository.deleteItem(itemId);
    }

    @Override
    @Transactional(readOnly = true)
    public List<DictItemView> enabledItemsByCode(final String code) {
        final Dict dict = this.dictRepository.findByCode(code).orElseThrow(() -> BizException.notFound("字典不存在"));
        if (!dict.isEnabled()) {
            return List.of();
        }
        return this.dictRepository.findItems(dict.requireId()).stream()
                .filter(item -> item.getStatus() == EnableStatus.ENABLED)
                .map(DictApplicationService::toView)
                .toList();
    }

    private Dict requireDict(final long id) {
        return this.dictRepository.findById(id).orElseThrow(() -> BizException.notFound("字典不存在"));
    }

    private DictItem requireItem(final long dictId, final long itemId) {
        this.requireDict(dictId);
        return this.dictRepository
                .findItem(itemId)
                .filter(item -> item.getDictId() == dictId)
                .orElseThrow(() -> BizException.notFound("字典项不存在"));
    }

    private static DictItem.DictItemBuilder apply(
            final DictItem.DictItemBuilder builder,
            final SaveDictItemCommand command,
            final String value,
            final @Nullable DictItem base) {
        return builder.label(command.label().strip())
                .value(value)
                .color(Texts.trimToNull(command.color()))
                .sort(command.sort() != null ? command.sort() : base == null ? 0 : base.getSort())
                .status(EnableStatus.ofNullable(
                        command.status(), base == null ? EnableStatus.ENABLED : base.getStatus()))
                .remark(Texts.trimToNull(command.remark()));
    }

    private static DictView toView(final Dict dict) {
        return new DictView(
                dict.requireId(),
                dict.getName(),
                dict.getCode(),
                dict.getDescription(),
                dict.getStatus().value(),
                dict.isBuiltin(),
                dict.getCreatedAt(),
                dict.getUpdatedAt());
    }

    private static DictItemView toView(final DictItem item) {
        return new DictItemView(
                item.requireId(),
                item.getDictId(),
                item.getLabel(),
                item.getValue(),
                item.getColor(),
                item.getSort(),
                item.getStatus().value(),
                item.getRemark());
    }
}
