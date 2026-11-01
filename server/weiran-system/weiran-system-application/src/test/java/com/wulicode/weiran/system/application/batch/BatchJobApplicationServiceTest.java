package com.wulicode.weiran.system.application.batch;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.wulicode.weiran.framework.error.BizException;
import com.wulicode.weiran.system.api.batch.BatchInputMode;
import com.wulicode.weiran.system.api.batch.BatchProcessor;
import com.wulicode.weiran.system.domain.batch.BatchFileStorage;
import com.wulicode.weiran.system.domain.batch.BatchJobRepository;
import java.util.stream.Stream;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.ObjectProvider;

class BatchJobApplicationServiceTest {

    @Test
    @DisplayName("处理器已安装时，引用入队仍须授权并核对输入指纹")
    void installedProcessorChecksAuthorizationAndFingerprint() throws Exception {
        final BatchJobRepository jobs = mock(BatchJobRepository.class);
        final BatchProcessor processor = mock(BatchProcessor.class);
        @SuppressWarnings("unchecked")
        final ObjectProvider<BatchProcessor> processors = mock(ObjectProvider.class);
        when(processors.orderedStream()).thenReturn(Stream.of(processor));
        when(processor.kind()).thenReturn("test_reference");
        when(processor.inputMode()).thenReturn(BatchInputMode.REFERENCE);
        when(processor.referenceFingerprint("reference/1"))
                .thenReturn("bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb");
        final BatchJobApplicationService service =
                new BatchJobApplicationService(jobs, mock(BatchFileStorage.class), processors);

        assertThatThrownBy(() -> service.createQueuedReference(
                        "test_reference",
                        "input.zip",
                        "reference/1",
                        "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
                        1))
                .isInstanceOf(BizException.class)
                .hasMessageContaining("指纹不一致");
        verify(processor).authorize(1);
        verifyNoInteractions(jobs);
    }
}
