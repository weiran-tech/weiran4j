package com.wulicode.weiran.app;

import static org.assertj.core.api.Assertions.assertThat;

import com.wulicode.weiran.framework.error.CommonErrors;
import com.wulicode.weiran.framework.error.ErrorCode;
import com.wulicode.weiran.region.api.region.RegionErrors;
import com.wulicode.weiran.system.api.auth.SystemAuthErrors;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class ErrorCodeContractTest {

    @Test
    @DisplayName("错误码是唯一的六位服务资源错误码，HTTP 状态独立定义")
    void codesAreUniqueSixDigitValues() {
        final List<ErrorCode> codes = new ArrayList<>();
        Collections.addAll(codes, CommonErrors.values());
        Collections.addAll(codes, SystemAuthErrors.values());
        Collections.addAll(codes, RegionErrors.values());

        assertThat(codes).extracting(ErrorCode::code).doesNotHaveDuplicates();
        for (final ErrorCode code : codes) {
            assertThat(code.code()).isBetween(100_000, 999_999);
            assertThat(code.httpStatus()).isBetween(400, 599);
        }
        for (final CommonErrors code : CommonErrors.values()) {
            assertThat(code.code() / 10_000).isEqualTo(10);
        }
        for (final SystemAuthErrors code : SystemAuthErrors.values()) {
            assertThat(code.code() / 10_000).isEqualTo(11);
        }
        for (final RegionErrors code : RegionErrors.values()) {
            assertThat(code.code() / 10_000).isEqualTo(12);
        }
    }
}
