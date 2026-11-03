package com.wulicode.weiran.region.application.region;

import com.wulicode.weiran.framework.error.BizException;
import com.wulicode.weiran.framework.error.ErrorCode;
import com.wulicode.weiran.framework.status.EnableStatus;
import com.wulicode.weiran.region.api.region.RegionErrors;
import com.wulicode.weiran.region.api.region.RegionLookupService;
import com.wulicode.weiran.region.api.region.RegionNode;
import com.wulicode.weiran.region.api.region.RegionView;
import com.wulicode.weiran.region.domain.region.Region;
import com.wulicode.weiran.region.domain.region.RegionHierarchy;
import com.wulicode.weiran.region.domain.region.RegionLevel;
import com.wulicode.weiran.region.domain.region.RegionRepository;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import org.jspecify.annotations.Nullable;
import org.springframework.transaction.annotation.Transactional;

/** 行政区划管理与 lookup 用例。 */
public class RegionApplicationService implements RegionLookupService {

    private static final Comparator<Region> MANAGEMENT_ORDER =
            Comparator.comparingLong(Region::requireId).reversed();

    private static final Comparator<Region> LOOKUP_ORDER =
            Comparator.comparingInt(Region::getSort).thenComparing(Region::getCode);

    private final RegionRepository regionRepository;

    /** 构造地区用例服务。 */
    public RegionApplicationService(final RegionRepository regionRepository) {
        this.regionRepository = regionRepository;
    }

    /** 查询管理树，匹配结果会补齐祖先节点。 */
    @Transactional(readOnly = true)
    public List<RegionNode> tree(final RegionFilter filter) {
        final List<Region> all = this.regionRepository.findAll();
        final List<Region> included = RegionApplicationService.withAncestors(all, filter, true);
        return RegionApplicationService.toTree(included, RegionApplicationService.MANAGEMENT_ORDER);
    }

    /** 查询筛选后的全量平铺地区。 */
    @Transactional(readOnly = true)
    public List<RegionView> flat(final RegionFilter filter) {
        return RegionApplicationService.matching(this.regionRepository.findAll(), filter).stream()
                .sorted(RegionApplicationService.LOOKUP_ORDER)
                .map(RegionApplicationService::toView)
                .toList();
    }

    /** 按 ID 查询地区。 */
    @Transactional(readOnly = true)
    public RegionView get(final long id) {
        return RegionApplicationService.toView(this.requireRegion(id));
    }

    /** 新建地区。 */
    @Transactional
    public RegionView create(final CreateRegionCommand command) {
        final String code = command.code().strip();
        final String name = command.name().strip();
        final RegionLevel level = RegionLevel.of(command.level());
        final String parentCode = RegionApplicationService.trimToNull(command.parentCode());
        RegionApplicationService.ensureValid(code, name, level, parentCode);
        if (this.regionRepository.findByCode(code).isPresent()) {
            throw new BizException(RegionErrors.DUPLICATE_CODE);
        }
        final List<Region> all = this.regionRepository.findAll();
        RegionApplicationService.ensureHierarchy(all, null, code, level, parentCode);
        final Region region = Region.builder()
                .code(code)
                .name(name)
                .level(level)
                .parentCode(parentCode)
                .sort(command.sort() == null ? 0 : command.sort())
                .status(EnableStatus.ofNullable(command.status(), EnableStatus.ENABLED))
                .build();
        final long id = this.regionRepository.save(region);
        return this.get(id);
    }

    /** 更新地区；已有地区的区划代码固定不变。 */
    @Transactional
    public RegionView update(final long id, final UpdateRegionCommand command) {
        final Region existing = this.requireRegion(id);
        if (command.code() != null && !existing.getCode().equals(command.code().strip())) {
            throw BizException.conflict("区划代码不可修改");
        }
        final String name =
                command.name() == null ? existing.getName() : command.name().strip();
        final RegionLevel level = command.level() == null ? existing.getLevel() : RegionLevel.of(command.level());
        final String parentCode = command.parentCodeProvided()
                ? RegionApplicationService.trimToNull(command.parentCode())
                : existing.getParentCode();
        RegionApplicationService.ensureValid(existing.getCode(), name, level, parentCode);
        final List<Region> all = this.regionRepository.findAll();
        final boolean invalidatesChildren = all.stream()
                .filter(region -> existing.getCode().equals(region.getParentCode()))
                .anyMatch(child -> !child.getLevel().isChildOf(level));
        if (invalidatesChildren) {
            throw new BizException(RegionErrors.INVALID_HIERARCHY);
        }
        RegionApplicationService.ensureHierarchy(all, existing.getCode(), existing.getCode(), level, parentCode);
        final Region updated = existing.toBuilder()
                .name(name)
                .level(level)
                .parentCode(parentCode)
                .sort(command.sort() == null ? existing.getSort() : command.sort())
                .status(EnableStatus.ofNullable(command.status(), existing.getStatus()))
                .build();
        this.regionRepository.save(updated);
        return this.get(id);
    }

    /** 删除地区；存在子级时冲突。 */
    @Transactional
    public void delete(final long id) {
        final Region region = this.requireRegion(id);
        if (this.regionRepository.hasChildren(region.getCode())) {
            throw new BizException(RegionErrors.HAS_CHILDREN);
        }
        this.regionRepository.deleteById(id);
    }

    /** 仅返回启用地区以及其启用祖先链。 */
    @Override
    @Transactional(readOnly = true)
    public List<RegionNode> enabledTree() {
        final List<Region> enabled = RegionApplicationService.withAncestors(
                this.regionRepository.findAll(), new RegionFilter(null, null, EnableStatus.ENABLED.value()), false);
        return RegionApplicationService.toTree(enabled, RegionApplicationService.LOOKUP_ORDER);
    }

    private static List<Region> withAncestors(
            final List<Region> all, final RegionFilter filter, final boolean management) {
        final List<Region> matched = RegionApplicationService.matching(all, filter);
        final Map<String, Region> byCode = RegionApplicationService.index(all);
        final Set<String> included = new HashSet<>();
        for (final Region region : matched) {
            String currentCode = region.getCode();
            final Set<String> visited = new HashSet<>();
            final List<String> path = new ArrayList<>();
            boolean validPath = true;
            while (currentCode != null && visited.add(currentCode)) {
                final Region current = byCode.get(currentCode);
                if (current == null) {
                    break;
                }
                if (!management && current.getStatus() != EnableStatus.ENABLED) {
                    validPath = false;
                    break;
                }
                path.add(currentCode);
                currentCode = current.getParentCode();
            }
            if (validPath) {
                included.addAll(path);
            }
        }
        return all.stream()
                .filter(region -> included.contains(region.getCode()))
                .toList();
    }

    private static List<Region> matching(final List<Region> all, final RegionFilter filter) {
        final String keyword =
                filter.keyword() == null ? null : filter.keyword().strip().toLowerCase(Locale.ROOT);
        final RegionLevel level =
                filter.level() == null || filter.level().isBlank() ? null : RegionLevel.of(filter.level());
        final EnableStatus status = EnableStatus.filterOf(filter.status());
        return all.stream()
                .filter(region -> keyword == null
                        || keyword.isEmpty()
                        || region.getName().toLowerCase(Locale.ROOT).contains(keyword)
                        || region.getCode().toLowerCase(Locale.ROOT).contains(keyword))
                .filter(region -> level == null || region.getLevel() == level)
                .filter(region -> status == null || region.getStatus() == status)
                .toList();
    }

    private static List<RegionNode> toTree(final List<Region> regions, final Comparator<Region> order) {
        final Map<String, List<Region>> children = new HashMap<>();
        for (final Region region : regions) {
            if (region.getParentCode() != null) {
                children.computeIfAbsent(region.getParentCode(), ignored -> new ArrayList<>())
                        .add(region);
            }
        }
        children.values().forEach(nodes -> nodes.sort(order));
        return regions.stream()
                .filter(region -> region.getParentCode() == null
                        || regions.stream().noneMatch(parent -> parent.getCode().equals(region.getParentCode())))
                .sorted(order)
                .map(region -> RegionApplicationService.toNode(region, children))
                .toList();
    }

    private static RegionNode toNode(final Region region, final Map<String, List<Region>> children) {
        return new RegionNode(
                region.requireId(),
                region.getCode(),
                region.getName(),
                region.getLevel().value(),
                region.getParentCode(),
                region.getSort(),
                region.getStatus().value(),
                RegionApplicationService.timestamp(region.getCreatedAt()),
                RegionApplicationService.timestamp(region.getUpdatedAt()),
                children.getOrDefault(region.getCode(), List.of()).stream()
                        .map(child -> RegionApplicationService.toNode(child, children))
                        .toList());
    }

    private static RegionView toView(final Region region) {
        return new RegionView(
                region.requireId(),
                region.getCode(),
                region.getName(),
                region.getLevel().value(),
                region.getParentCode(),
                region.getSort(),
                region.getStatus().value(),
                RegionApplicationService.timestamp(region.getCreatedAt()),
                RegionApplicationService.timestamp(region.getUpdatedAt()));
    }

    private static LocalDateTime timestamp(final @Nullable LocalDateTime value) {
        if (value == null) {
            throw new IllegalStateException("已持久化地区缺少审计时间");
        }
        return value;
    }

    private static Map<String, Region> index(final List<Region> all) {
        final Map<String, Region> byCode = new HashMap<>();
        all.forEach(region -> byCode.put(region.getCode(), region));
        return byCode;
    }

    private static void ensureHierarchy(
            final List<Region> all,
            final @Nullable String currentCode,
            final String code,
            final RegionLevel level,
            final @Nullable String parentCode) {
        try {
            new RegionHierarchy(all).ensureValidParent(currentCode, level, parentCode);
        } catch (final BizException exception) {
            if (exception.getErrorCode().httpStatus() == 400) {
                final ErrorCode invalid = RegionErrors.INVALID_HIERARCHY;
                throw new BizException(invalid, invalid.message());
            }
            throw exception;
        }
        final RegionLevel expectedParent =
                switch (level) {
                    case PROVINCE -> null;
                    case CITY -> RegionLevel.PROVINCE;
                    case COUNTY -> RegionLevel.CITY;
                };
        if (expectedParent == null && parentCode != null) {
            throw new BizException(RegionErrors.INVALID_HIERARCHY);
        }
        if (parentCode != null
                && all.stream()
                        .filter(region -> region.getCode().equals(parentCode))
                        .anyMatch(parent -> parent.getLevel() != expectedParent)) {
            throw new BizException(RegionErrors.INVALID_HIERARCHY);
        }
        final List<Region> proposed = new ArrayList<>(all);
        proposed.removeIf(region -> region.getCode().equals(code));
        proposed.add(Region.builder()
                .code(code)
                .name("validation")
                .level(level)
                .parentCode(parentCode)
                .sort(0)
                .status(EnableStatus.ENABLED)
                .build());
        RegionHierarchy.ensureAcyclic(proposed);
    }

    private static void ensureValid(
            final String code, final String name, final RegionLevel level, final @Nullable String parentCode) {
        try {
            Region.ensureValid(code, name, level, parentCode);
        } catch (final BizException exception) {
            if (exception.getMessage() != null && exception.getMessage().startsWith("parentCode:")) {
                throw new BizException(RegionErrors.INVALID_HIERARCHY);
            }
            throw exception;
        }
    }

    private Region requireRegion(final long id) {
        return this.regionRepository.findById(id).orElseThrow(() -> BizException.notFound("地区不存在"));
    }

    private static @Nullable String trimToNull(final @Nullable String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.strip();
    }
}
