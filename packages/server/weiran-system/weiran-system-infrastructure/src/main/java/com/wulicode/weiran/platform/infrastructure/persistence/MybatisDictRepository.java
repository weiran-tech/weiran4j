package com.wulicode.weiran.platform.infrastructure.persistence;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.wulicode.weiran.framework.page.PageQuery;
import com.wulicode.weiran.framework.page.PageResult;
import com.wulicode.weiran.framework.persistence.Likes;
import com.wulicode.weiran.framework.persistence.MybatisPages;
import com.wulicode.weiran.framework.status.EnableStatus;
import com.wulicode.weiran.platform.domain.dict.Dict;
import com.wulicode.weiran.platform.domain.dict.DictCriteria;
import com.wulicode.weiran.platform.domain.dict.DictItem;
import com.wulicode.weiran.platform.domain.dict.DictRepository;
import com.wulicode.weiran.platform.infrastructure.persistence.entity.SysDictItemDO;
import com.wulicode.weiran.platform.infrastructure.persistence.entity.SysGroupDO;
import com.wulicode.weiran.platform.infrastructure.persistence.mapper.SysDictItemMapper;
import com.wulicode.weiran.platform.infrastructure.persistence.mapper.SysGroupMapper;
import java.util.List;
import java.util.Optional;

/** {@link DictRepository} 的 MyBatis-Plus 实现。 */
public class MybatisDictRepository implements DictRepository {

    private final SysGroupMapper dictMapper;

    private final SysDictItemMapper itemMapper;

    /** 构造仓储。 */
    public MybatisDictRepository(final SysGroupMapper dictMapper, final SysDictItemMapper itemMapper) {
        this.dictMapper = dictMapper;
        this.itemMapper = itemMapper;
    }

    @Override
    public Optional<Dict> findById(final long id) {
        return Optional.ofNullable(this.dictMapper.selectOne(Wrappers.lambdaQuery(SysGroupDO.class)
                        .eq(SysGroupDO::getId, id)
                        .eq(SysGroupDO::getType, "dict")))
                .map(MybatisDictRepository::toDomain);
    }

    @Override
    public Optional<Dict> findByCode(final String code) {
        return Optional.ofNullable(this.dictMapper.selectOne(Wrappers.lambdaQuery(SysGroupDO.class)
                        .eq(SysGroupDO::getType, "dict")
                        .eq(SysGroupDO::getCode, code)))
                .map(MybatisDictRepository::toDomain);
    }

    @Override
    public boolean existsByCode(final String code) {
        return this.dictMapper.exists(Wrappers.lambdaQuery(SysGroupDO.class)
                .eq(SysGroupDO::getType, "dict")
                .eq(SysGroupDO::getCode, code));
    }

    @Override
    public long save(final Dict dict) {
        final SysGroupDO row = new SysGroupDO();
        row.setId(dict.getId());
        row.setType("dict");
        row.setGroupKey("dict");
        row.setName(dict.getName());
        row.setCode(dict.getCode());
        row.setDescription(dict.getDescription());
        row.setStatus(dict.getStatus().value());
        row.setIsBuiltin(dict.isBuiltin());
        if (row.getId() == null) {
            this.dictMapper.insert(row);
        } else {
            this.dictMapper.update(
                    row,
                    Wrappers.lambdaUpdate(SysGroupDO.class)
                            .eq(SysGroupDO::getId, row.getId())
                            .eq(SysGroupDO::getType, "dict"));
        }
        return row.getId();
    }

    @Override
    public void deleteById(final long id) {
        if (this.findById(id).isPresent()) {
            this.itemMapper.delete(Wrappers.lambdaQuery(SysDictItemDO.class).eq(SysDictItemDO::getDictId, id));
            this.dictMapper.delete(Wrappers.lambdaQuery(SysGroupDO.class)
                    .eq(SysGroupDO::getId, id)
                    .eq(SysGroupDO::getType, "dict"));
        }
    }

    @Override
    public PageResult<Dict> page(final DictCriteria criteria, final PageQuery pageQuery) {
        final String keyword = criteria.keyword();
        final EnableStatus status = criteria.status();
        final LambdaQueryWrapper<SysGroupDO> wrapper = Wrappers.lambdaQuery(SysGroupDO.class)
                .eq(SysGroupDO::getType, "dict")
                .and(
                        keyword != null,
                        w -> w.like(SysGroupDO::getName, Likes.escape(keyword))
                                .or()
                                .like(SysGroupDO::getCode, Likes.escape(keyword)))
                .eq(status != null, SysGroupDO::getStatus, status == null ? null : status.value())
                .orderByAsc(SysGroupDO::getId);
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

    private static Dict toDomain(final SysGroupDO row) {
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
