import { spawn } from 'node:child_process';

// 子进程组允许超时/取消时连同工具派生进程一起退出；先给工具留出写报告的时间。
export function executeProcess(args, { cwd, env = process.env, timeoutMs = 120_000, graceMs = 2000, stdio = 'inherit' } = {}) {
    return new Promise((resolve) => {
        const grouped = process.platform !== 'win32';
        const child = spawn(process.execPath, args, { cwd, env, stdio, detached: grouped });
        let reason = null;
        let error = null;
        let escalation;
        const signalGroup = (signal) => {
            try { if (grouped && child.pid) process.kill(-child.pid, signal); else child.kill(signal); }
            catch { /* 进程已结束。 */ }
        };
        const stop = (next) => {
            if (reason) return;
            reason = next;
            signalGroup('SIGTERM');
            escalation = setTimeout(() => signalGroup('SIGKILL'), graceMs);
        };
        const onInterrupt = () => stop('interrupted');
        process.on('SIGINT', onInterrupt);
        process.on('SIGTERM', onInterrupt);
        const timer = setTimeout(() => stop('timed_out'), timeoutMs);
        child.on('error', () => { error = '进程无法启动'; });
        child.on('close', (exitCode, signal) => {
            clearTimeout(timer);
            // 父工具先退出时，仍清理同组中未结束的派生进程。
            if (reason) signalGroup('SIGKILL');
            clearTimeout(escalation);
            process.off('SIGINT', onInterrupt);
            process.off('SIGTERM', onInterrupt);
            resolve({ exitCode, signal, error, status: reason ?? (exitCode === 0 && !error ? 'passed' : 'failed') });
        });
    });
}
