package com.wulicode.weiran.demo.sequence;

import com.wulicode.weiran.framework.auth.RequiresPermission;
import com.wulicode.weiran.framework.log.OperationLog;
import com.wulicode.weiran.system.api.sequence.SequenceService;
import com.wulicode.weiran.system.api.sequence.SequenceValue;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** 仅供 local/test 查看分类型序号的实际分配结果。 */
@RestController
@RequestMapping("/api-backend/demo/sequence")
public class DemoSequenceController {

    private final SequenceService sequences;

    public DemoSequenceController(final SequenceService sequences) {
        this.sequences = sequences;
    }

    @PostMapping("/next")
    @RequiresPermission("system:sequence:next")
    @OperationLog(module = "组件演示", description = "分配演示序号")
    public SequenceValue next(@RequestBody final NextRequest request) {
        return this.sequences.next(request.type());
    }

    public record NextRequest(String type) {}
}
