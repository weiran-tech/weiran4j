package com.weiran.platform.infrastructure.persistence;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.weiran.common.page.PageQuery;
import com.weiran.common.page.PageResult;
import com.weiran.common.status.EnableStatus;
import com.weiran.framework.persistence.Likes;
import com.weiran.framework.persistence.MybatisPages;
import com.weiran.platform.domain.dict.Dict;
import com.weiran.platform.domain.dict.DictCriteria;
import com.weiran.platform.domain.dict.DictItem;
import com.weiran.platform.domain.dict.DictRepository;
import com.weiran.platform.infrastructure.persistence.entity.SysDictDO;
import com.weiran.platform.infrastructure.persistence.entity.SysDictItemDO;
import com.weiran.platform.infrastructure.persistence.mapper.SysDictItemMapper;
import com.weiran.platform.infrastructure.persistence.mapper.SysDictMapper;
import java.util.List;
import java.util.Optional;

/** {@link DictRepository} 的 MyBatis-Plus 实现。 */
public class MybatisDictRepository implements DictRepository {

    private final SysDictMapper dictMapper;

    private final SysDictItemMapper itemMapper;

    /** 构造仓储。 */
    public MybatisDictRepository(final SysDictMapper dictMapper, final SysDictItemMapper itemMapper) {
        this.dictMapper = dictMapper;
        this.itemMapper = itemMapper;
    }

    @Override
    public Optional<Dict> findById(final long id) {
        return Optional.ofNullable(this.dictMapper.selectById(id)).map(MybatisDictRepository::toDomain);
    }

    @Override
    public Optional<Dict> findByCode(final String code) {
        return Optional.ofNullable(this.dictMapper.selectOne(
                        Wrappers.lambdaQuery(SysDictDO.class).eq(SysDictDO::getCode, code)))
                .map(MybatisDictRepository::toDomain);
    }

    @Override
    public boolean existsByCode(final String code) {
        return this.dictMapper.exists(Wrappers.lambdaQuery(SysDictDO.class).eq(SysDictDO::getCode, code));
    }

    @Override
    public long save(final Dict dict) {
        final SysDictDO row = new SysDictDO();
        row.setId(dict.getId());
        row.setName(dict.getName());
        row.setCode(dict.getCode());
        row.setDescription(dict.getDescription());
        row.setStatus(dict.getStatus().value());
        row.setIsBuiltin(dict.isBuiltin());
        if (row.getId() == null) {
            this.dictMapper.insert(row);
        } else {
            this.dictMapper.updateById(row);
        }
        return row.getId();
    }

    @Override
    public void deleteById(final long id) {
        this.itemMapper.delete(Wrappers.lambdaQuery(SysDictItemDO.class).eq(SysDictItemDO::getDictId, id));
        this.dictMapper.deleteById(id);
    }

    @Override
    public PageResult<Dict> page(final DictCriteria criteria, final PageQuery pageQuery) {
        final String keyword = criteria.keyword();
        final EnableStatus status = criteria.status();
        final LambdaQueryWrapper<SysDictDO> wrapper = Wrappers.lambdaQuery(SysDictDO.class)
                .and(
                        keyword != null,
                        w -> w.like(SysDictDO::getName, Likes.escape(keyword))
                                .or()
                                .like(SysDictDO::getCode, Likes.escape(keyword)))
                .eq(status != null, SysDictDO::getStatus, status == null ? null : status.value())
                .orderByAsc(SysDictDO::getId);
        return MybatisPages.toResult(
                this.dictMapper.selectPage(MybatisPages.of(pageQuery), wrapper),
                pageQuery,
                MybatisDictRepository::toDomain);
    }

    @Override
    public List<DictItem> findItems(final long dictId) {
        return this.itemMapper
                .selectList(Wrappers.lambdaQuery(SysDictItemDO.class)
                        .eq(SysDictItemDO::getDictId, dictId)
                        .orderByAsc(SysDictItemDO::getSort)
                        .orderByAsc(SysDictItemDO::getId))
                .stream()
                .map(MybatisDictRepository::toDomain)
                .toList();
    }

    @Override
    public Optional<DictItem> findItem(final long itemId) {
        return Optional.ofNullable(this.itemMapper.selectById(itemId)).map(MybatisDictRepository::toDomain);
    }

    @Override
    public boolean existsItemValue(final long dictId, final String value) {
        return this.itemMapper.exists(Wrappers.lambdaQuery(SysDictItemDO.class)
                .eq(SysDictItemDO::getDictId, dictId)
                .eq(SysDictItemDO::getValue, value));
    }

    @Override
    public long saveItem(final DictItem item) {
        final SysDictItemDO row = new SysDictItemDO();
        row.setId(item.getId());
        row.setDictId(item.getDictId());
        row.setLabel(item.getLabel());
        row.setValue(item.getValue());
        row.setColor(item.getColor());
        row.setSort(item.getSort());
        row.setStatus(item.getStatus().value());
        row.setRemark(item.getRemark());
        if (row.getId() == null) {
            this.itemMapper.insert(row);
        } else {
            this.itemMapper.updateById(row);
        }
        return row.getId();
    }

    @Override
    public void deleteItem(final long itemId) {
        this.itemMapper.deleteById(itemId);
    }

    private static Dict toDomain(final SysDictDO row) {
        return Dict.builder()
                .id(row.getId())
                .name(row.getName())
                .code(row.getCode())
                .description(row.getDescription())
                .status(EnableStatus.of(row.getStatus()))
                .builtin(Boolean.TRUE.equals(row.getIsBuiltin()))
                .createdAt(row.getCreatedAt())
                .updatedAt(row.getUpdatedAt())
                .build();
    }

    private static DictItem toDomain(final SysDictItemDO row) {
        return DictItem.builder()
                .id(row.getId())
                .dictId(row.getDictId())
                .label(row.getLabel())
                .value(row.getValue())
                .color(row.getColor())
                .sort(row.getSort() == null ? 0 : row.getSort())
                .status(EnableStatus.of(row.getStatus()))
                .remark(row.getRemark())
                .build();
    }
}
