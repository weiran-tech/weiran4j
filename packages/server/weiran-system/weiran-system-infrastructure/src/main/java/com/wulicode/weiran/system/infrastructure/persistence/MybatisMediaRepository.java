package com.wulicode.weiran.system.infrastructure.persistence;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.wulicode.weiran.framework.page.PageQuery;
import com.wulicode.weiran.framework.page.PageResult;
import com.wulicode.weiran.system.domain.media.MediaAsset;
import com.wulicode.weiran.system.domain.media.MediaRepository;
import com.wulicode.weiran.system.infrastructure.persistence.entity.SysMediaDO;
import com.wulicode.weiran.system.infrastructure.persistence.mapper.SysMediaMapper;
import java.time.Instant;
import java.util.Optional;
import org.jspecify.annotations.Nullable;
import org.springframework.stereotype.Repository;

/** MyBatis 媒体资产仓储。 */
@Repository
public class MybatisMediaRepository implements MediaRepository {

    private final SysMediaMapper mapper;

    public MybatisMediaRepository(final SysMediaMapper mapper) {
        this.mapper = mapper;
    }

    @Override
    public MediaAsset save(final MediaAsset asset) {
        final SysMediaDO data = new SysMediaDO();
        data.setOriginalName(asset.originalName());
        data.setUrl(asset.url());
        data.setObjectName(asset.objectName());
        data.setSize(asset.size());
        data.setUploadedBy(asset.uploadedBy());
        data.setCreatedAt(asset.createdAt());
        this.mapper.insert(data);
        return new MediaAsset(
                data.getId().longValue(),
                asset.originalName(),
                asset.url(),
                asset.objectName(),
                asset.size(),
                asset.uploadedBy(),
                asset.createdAt());
    }

    @Override
    public PageResult<MediaAsset> page(
            final @Nullable String keyword, final @Nullable String category, final PageQuery pageQuery) {
        final LambdaQueryWrapper<SysMediaDO> query = new LambdaQueryWrapper<SysMediaDO>()
                .like(keyword != null && !keyword.isBlank(), SysMediaDO::getOriginalName, keyword)
                .orderByDesc(SysMediaDO::getCreatedAt)
                .orderByDesc(SysMediaDO::getId);
        if ("image".equals(category)) {
            query.apply("LOWER(original_name) REGEXP '[.](jpg|jpeg|png|gif|webp)$'");
        } else if ("video".equals(category)) {
            query.apply("LOWER(original_name) REGEXP '[.](mp4|webm|mov)$'");
        } else if ("archive".equals(category)) {
            query.apply("LOWER(original_name) REGEXP '[.]zip$'");
        } else if ("document".equals(category)) {
            query.apply("LOWER(original_name) REGEXP '[.](pdf|txt|csv|doc|docx|xls|xlsx|ppt|pptx)$'");
        }
        final Page<SysMediaDO> page = this.mapper.selectPage(new Page<>(pageQuery.page(), pageQuery.pageSize()), query);
        return new PageResult<>(
                page.getRecords().stream().map(MybatisMediaRepository::toDomain).toList(),
                page.getTotal(),
                Math.toIntExact(page.getCurrent()),
                Math.toIntExact(page.getSize()));
    }

    @Override
    public Optional<MediaAsset> findById(final long id) {
        return Optional.ofNullable(this.mapper.selectById(id)).map(MybatisMediaRepository::toDomain);
    }

    @Override
    public void deleteById(final long id) {
        this.mapper.deleteById(id);
    }

    private static MediaAsset toDomain(final SysMediaDO data) {
        return new MediaAsset(
                data.getId().longValue(),
                data.getOriginalName(),
                data.getUrl(),
                data.getObjectName(),
                data.getSize(),
                data.getUploadedBy(),
                data.getCreatedAt() == null ? Instant.EPOCH : data.getCreatedAt());
    }
}
