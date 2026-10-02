package com.weiran.cqt.infrastructure.persistence;

import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.weiran.cqt.domain.setting.SettingRepository;
import com.weiran.cqt.infrastructure.persistence.entity.CqtSettingDO;
import com.weiran.cqt.infrastructure.persistence.mapper.CqtSettingMapper;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.jspecify.annotations.Nullable;

/** {@link SettingRepository} 的 MyBatis-Plus 实现。 */
public class MybatisSettingRepository implements SettingRepository {

    private final CqtSettingMapper settingMapper;

    /** 构造仓储。 */
    public MybatisSettingRepository(final CqtSettingMapper settingMapper) {
        this.settingMapper = settingMapper;
    }

    @Override
    public Map<Integer, @Nullable String> findContentsByIdentRange(final int from, final int to) {
        // 与原实现一致：不过滤 deleted_at；同一编号有多行时取 id 最大的一行（原实现按字典覆盖，结果取决于返回顺序）。
        final List<CqtSettingDO> rows = this.settingMapper.selectList(Wrappers.lambdaQuery(CqtSettingDO.class)
                .select(CqtSettingDO::getId, CqtSettingDO::getIdent, CqtSettingDO::getContents)
                .between(CqtSettingDO::getIdent, from, to)
                .orderByAsc(CqtSettingDO::getId));
        final Map<Integer, @Nullable String> result = new HashMap<>();
        for (final CqtSettingDO row : rows) {
            final Integer ident = row.getIdent();
            if (ident != null) {
                result.put(ident, row.getContents());
            }
        }
        return result;
    }
}
