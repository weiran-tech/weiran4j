package com.wulicode.weiran.system.application.batch;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.wulicode.weiran.system.api.batch.BatchFileException;
import com.wulicode.weiran.system.api.batch.BatchInputMode;
import com.wulicode.weiran.system.api.batch.BatchItemResult;
import com.wulicode.weiran.system.api.batch.BatchProcessor;
import com.wulicode.weiran.system.domain.batch.BatchFileStorage;
import com.wulicode.weiran.system.domain.batch.BatchJobRepository;
import com.wulicode.weiran.system.domain.batch.BatchTaskDetail;
import java.io.ByteArrayInputStream;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.stream.IntStream;
import java.util.stream.Stream;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.SimpleTransactionStatus;

class BatchJobWorkerTransactionTest {

    @Test
    @DisplayName("23 项按 10、10、3 分为三个事务")
    void groupsItemsIntoTransactionsOfTen() throws Exception {
        final Fixture fixture = new Fixture();
        fixture.worker.consume();
        verify(fixture.transactions, times(3)).commit(any());
        verify(fixture.jobs, times(23)).succeeded(eq(1L), anyString(), anyLong(), any(), any());
        fixture.worker.close();
    }

    @Test
    @DisplayName("组内一项失败时回滚整组并逐项重试")
    void retriesFailedGroupIndividually() throws Exception {
        final Fixture fixture = new Fixture();
        doThrow(new BatchFileException("无效项")).when(fixture.processor).processItem(any(), eq(1L), eq(5L), anyString());
        fixture.worker.consume();
        verify(fixture.transactions, times(2)).rollback(any());
        verify(fixture.transactions, times(11)).commit(any());
        verify(fixture.jobs).failedItem(eq(1L), anyString(), eq(5L), eq("无效项"));
        fixture.worker.close();
    }

    private static final class Fixture {
        private final BatchJobRepository jobs = mock(BatchJobRepository.class);
        private final BatchProcessor processor = mock(BatchProcessor.class);
        private final PlatformTransactionManager transactions = mock(PlatformTransactionManager.class);
        private final BatchJobWorker worker;

        @SuppressWarnings("unchecked")
        private Fixture() throws Exception {
            final ObjectProvider<BatchProcessor> processors = mock(ObjectProvider.class);
            when(processors.orderedStream()).thenReturn(Stream.of(this.processor));
            when(this.processor.kind()).thenReturn("test");
            when(this.processor.inputMode()).thenReturn(BatchInputMode.REFERENCE);
            when(this.processor.referenceFingerprint("source")).thenReturn("fingerprint");
            when(this.processor.referenceSource("source")).thenReturn(() -> new ByteArrayInputStream(new byte[0]));
            when(this.processor.transactionBatchSize()).thenReturn(10);
            when(this.processor.processItem(any(), anyLong(), anyLong(), anyString()))
                    .thenReturn(BatchItemResult.withoutReference());
            when(this.jobs.claim(anyString()))
                    .thenReturn(new BatchJobRepository.BatchWork(
                            1, "test", "source", "source", "reference", "fingerprint", "processing", 23L));
            final List<BatchTaskDetail> pending = IntStream.rangeClosed(1, 23)
                    .mapToObj(index -> new BatchTaskDetail(
                            index,
                            index,
                            "item",
                            "processing",
                            "pending",
                            null,
                            "row",
                            "key-" + index,
                            null,
                            null,
                            null,
                            LocalDateTime.now(ZoneOffset.UTC)))
                    .toList();
            when(this.jobs.pending(1L)).thenReturn(pending);
            when(this.transactions.getTransaction(any())).thenAnswer(invocation -> new SimpleTransactionStatus());
            this.worker = new BatchJobWorker(this.jobs, mock(BatchFileStorage.class), processors, this.transactions);
        }
    }
}
