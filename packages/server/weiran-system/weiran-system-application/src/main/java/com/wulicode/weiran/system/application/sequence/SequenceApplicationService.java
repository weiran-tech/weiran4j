package com.wulicode.weiran.system.application.sequence;

import com.wulicode.weiran.framework.error.BizException;
import com.wulicode.weiran.system.api.sequence.SequenceService;
import com.wulicode.weiran.system.api.sequence.SequenceValue;
import com.wulicode.weiran.system.domain.sequence.SequenceRepository;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/** 每次分配独立提交，外层业务回滚也不会重新使用已发出的序号。 */
public class SequenceApplicationService implements SequenceService {

    private final SequenceRepository sequences;

    public SequenceApplicationService(final SequenceRepository sequences) {
        this.sequences = sequences;
    }

    @Override
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public SequenceValue next(final String type) {
        if (type == null || !type.matches("[a-z][a-z0-9_-]{0,63}")) {
            throw BizException.badRequest("序号类型必须以小写字母开头，仅包含小写字母、数字、下划线或短横线，最长 64 位");
        }
        final SequenceRepository.Allocation allocation = this.sequences.next(type);
        return new SequenceValue(allocation.id(), type, allocation.sequence());
    }
}
