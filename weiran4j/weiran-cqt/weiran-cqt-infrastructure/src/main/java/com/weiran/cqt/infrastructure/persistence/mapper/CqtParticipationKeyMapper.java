package com.weiran.cqt.infrastructure.persistence.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.weiran.cqt.infrastructure.persistence.entity.CqtParticipationKeyDO;
import com.weiran.cqt.infrastructure.persistence.row.ConflictRow;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

/** {@link CqtParticipationKeyDO} 的 Mapper。 */
public interface CqtParticipationKeyMapper extends BaseMapper<CqtParticipationKeyDO> {

    /** 阶段冲突的已有参赛记录（任一方为 BOTH 或阶段相同即冲突）。 */
    @Select("SELECT k.source_database, e.entry_no, e.title FROM cqt_competition_participation_keys k"
            + " JOIN cqt_entries e ON e.id = k.entry_id"
            + " WHERE k.competition_id = #{competitionId} AND k.category_legacy_id = #{categoryId}"
            + " AND k.credential_type = #{credentialType} AND k.normalized_id_card = #{idCard}"
            + " AND (k.stage_scope = 'BOTH' OR #{stage} = 'BOTH' OR k.stage_scope = #{stage}) LIMIT 1")
    ConflictRow findConflict(
            @Param("competitionId") long competitionId,
            @Param("categoryId") long categoryId,
            @Param("credentialType") String credentialType,
            @Param("idCard") String idCard,
            @Param("stage") String stage);
}
