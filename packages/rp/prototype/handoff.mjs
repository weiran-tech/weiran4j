import { repository } from './project.mjs';
import { reviewReference } from './review-source.mjs';
export const phases = { preparation: '制作中', review: '评审中', finalized: '已定稿', accepted: '已验收', development: '业务研发', acceptance: '待验收', delivered: '业务已交付' };
export const taskStates = { pending: '待接单', working: '研发中', verifying: '待验收', accepted: '已验收', deferred: '已暂缓', unnecessary: '无需研发' };
const url = (value) => { try { return ['http:', 'https:'].includes(new URL(value).protocol); } catch { return false; } };
const time = (value) => typeof value === 'string' && /^\d{4}-\d\d-\d\dT/.test(value) && Number.isFinite(Date.parse(value));
const buildId = (value) => typeof value === 'string' && /^[\w.-]{1,128}$/.test(value);
const login = (value) => typeof value === 'string' && /^[\w-]+$/.test(value);
export function blankHandoff(release) {
    return { schemaVersion: 2, version: release.id, phase: 'preparation', productOwner: '', technicalOwner: '', candidateId: '', candidateCommit: '', candidateFingerprint: '', candidateUrl: '', testData: '', publication: { url: '', environment: '', build: '', publishedBy: '', publishedAt: '', rollback: '', scope: [], noReleaseReason: '', verifiedBy: '', verifiedAt: '' }, changes: release.changes.map((change) => ({ id: change.id, owner: '', task: '', pr: '', noCodeReason: '', environment: '', build: '', state: 'pending', reason: '', followUp: '', acceptedBy: '', acceptedAt: '', acceptedBuild: '', acceptance: change.acceptance.map((text) => ({ text, result: 'pending', evidence: '' })) })) };
}
/** 旧记录可继续查看；新增字段留空，不补造批准、验收或发布事实。 */
export function normalizeHandoff(value, release) {
    const blank = blankHandoff(release);
    if (!value || value.version !== release.id || ![1, 2].includes(value.schemaVersion) || !Array.isArray(value.changes)) throw new Error('交接记录结构或版本不匹配');
    if (value.changes.length !== release.changes.length || new Set(value.changes.map((item) => item?.id)).size !== release.changes.length || value.changes.some((item) => !release.changes.some((entry) => entry.id === item?.id))) throw new Error('交接记录 CHG 与版本说明不一致，请保留备份后重新对齐');
    const result = { ...blank, ...value, schemaVersion: 2, publication: { ...blank.publication, ...value.publication }, changes: release.changes.map((change, index) => { const old = value.changes.find((item) => item?.id === change.id) || {}; return { ...blank.changes[index], ...old, id: change.id, acceptance: Array.isArray(old.acceptance) ? old.acceptance : blank.changes[index].acceptance }; }) };
    const strings = (actual, defaults) => Object.entries(defaults).every(([key, expected]) => typeof expected !== 'string' || typeof actual[key] === 'string');
    if (!strings(result, blank) || !strings(result.publication, blank.publication) || !Array.isArray(result.publication.scope) || result.publication.scope.some((id) => typeof id !== 'string') || result.changes.some((item, index) => !strings(item, blank.changes[index]) || !Array.isArray(item.acceptance) || item.acceptance.some((entry) => !entry || !['text', 'result', 'evidence'].every((key) => typeof entry[key] === 'string')))) throw new Error('交接字段类型无效，请保留备份后修正');
    return result;
}
export function updateDelivery(item, patch) {
    const next = { ...item, ...patch };
    // 更换构建、环境、实现或验收证据后保留历史在 GitHub，本机必须重新复核。
    const changed = ['owner', 'build', 'environment', 'pr', 'task', 'noCodeReason', 'acceptance'].some((key) => key in patch && JSON.stringify(patch[key]) !== JSON.stringify(item[key]));
    if (changed && (item.acceptedBy || item.state === 'accepted')) return { ...next, state: 'verifying', acceptedBy: '', acceptedAt: '', acceptedBuild: '', acceptance: next.acceptance.map((entry) => ({ ...entry, result: 'pending' })) };
    if (patch.state && patch.state !== 'accepted' && item.acceptedBy) return { ...next, acceptedBy: '', acceptedAt: '', acceptedBuild: '' };
    return next;
}
export function handoffErrors(value, release) {
    if (!value || value.schemaVersion !== 2 || value.version !== release.id || !Array.isArray(value.changes) || !value.publication) return ['交接记录结构或版本不匹配，请迁移旧记录'];
    const errors = [];
    if (!Object.hasOwn(phases, value.phase)) errors.push('交接阶段无效');
    if (release.supersededBy) errors.push(`本版已由 ${release.supersededBy} 承接，请在新版本维护交接`);
    const formal = ['finalized', 'accepted', 'development', 'acceptance', 'delivered'].includes(value.phase);
    if (formal && release.status !== 'finalized') errors.push('正式接单、验收或交付前，原型必须已定稿；技术预研请留在需求整理阶段');
    if (value.phase !== 'preparation') {
        if (!login(value.productOwner) || !login(value.technicalOwner)) errors.push('发起评审前请填写产品与技术 GitHub 确认人');
        if (!/^v[\w.-]+-rc-[a-f0-9]{40}$/.test(value.candidateId) || !value.candidateId.startsWith(`${release.id}-rc-`) || !value.candidateId.endsWith(value.candidateCommit) || !/^[a-f0-9]{40}$/.test(value.candidateCommit) || !/^[a-f0-9]{64}$/.test(value.candidateFingerprint) || !url(value.candidateUrl) || !value.candidateUrl.startsWith('https://') || new URL(value.candidateUrl).pathname !== `/releases/${value.candidateId}/prototype/workflow` || ['localhost', '127.0.0.1', '0.0.0.0', '[::1]'].includes(new URL(value.candidateUrl).hostname)) errors.push('发起评审前需要固定候选及团队 HTTPS 地址');
        if (!value.testData?.trim()) errors.push('请填写演示 / 验收数据初始化方式');
    }
    if (value.changes.length !== release.changes.length || new Set(value.changes.map((item) => item?.id)).size !== release.changes.length) errors.push('交接记录必须逐项覆盖全部 CHG，不得重复');
    for (const change of release.changes) {
        const item = value.changes.find((entry) => entry?.id === change.id);
        if (!item || !Object.hasOwn(taskStates, item.state)) { errors.push(`${change.id} 缺少有效研发去向`); continue; }
        if (!Array.isArray(item.acceptance) || item.acceptance.length !== change.acceptance.length || item.acceptance.some((entry, index) => entry?.text !== change.acceptance[index] || !['pending', 'pass', 'fail'].includes(entry.result))) errors.push(`${change.id} 验收条件必须与版本说明一致`);
        if (['deferred', 'unnecessary'].includes(item.state) && !item.reason?.trim()) errors.push(`${change.id} 暂缓或无需研发必须填写原因`);
        if (item.state === 'deferred' && !url(item.followUp)) errors.push(`${change.id} 暂缓需提供后续任务或版本 Issue URL`);
        if (['working', 'verifying', 'accepted'].includes(item.state) && (!item.owner?.trim() || !url(item.task))) errors.push(`${change.id} 接单需填写负责人和真实业务任务 URL`);
        if (['verifying', 'accepted'].includes(item.state) && (!url(item.environment) || !buildId(item.build) || (!url(item.pr) && !item.noCodeReason?.trim()))) errors.push(`${change.id} 提测需填写环境、业务构建、PR 或无需代码原因`);
        if (['verifying', 'accepted'].includes(item.state) && release.status !== 'finalized') errors.push(`${change.id} 正式提测 / 验收必须关联已定稿原型`);
        if (item.state === 'accepted' && (!login(item.acceptedBy) || item.acceptedBy.toLowerCase() !== String(value.productOwner).toLowerCase() || !time(item.acceptedAt) || item.acceptedBuild !== item.build || !item.acceptance?.every((entry) => entry.result === 'pass' && url(entry.evidence)))) errors.push(`${change.id} 已验收需填写产品本人确认、准确构建、时间及全部通过证据 URL`);
        for (const key of ['task', 'pr', 'environment', 'followUp']) if (item[key] && !url(item[key])) errors.push(`${change.id} ${key} 必须为 HTTP 地址`);
    }
    if (['development', 'acceptance', 'delivered'].includes(value.phase) && value.changes.some((item) => item.state === 'pending')) errors.push('进入业务研发前全部改动必须接单或有明确暂缓 / 无需研发去向');
    if (['accepted', 'delivered'].includes(value.phase)) {
        if (value.changes.some((item) => !['accepted', 'deferred', 'unnecessary'].includes(item.state))) errors.push('完成需求验收前全部改动需要有验收结论或明确去向');
    }
    if (value.phase === 'delivered' || value.publication.verifiedBy || value.publication.verifiedAt) errors.push(...publicationErrors(value));
    return errors;
}
async function digest(value) {
    const canonical = (item) => Array.isArray(item) ? item.map(canonical) : item && typeof item === 'object' ? Object.fromEntries(Object.keys(item).sort().map((key) => [key, canonical(item[key])])) : item;
    const data = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(canonical(value))));
    return [...new Uint8Array(data)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}
export async function acceptanceCommand(version, item) {
    const payload = [version, item.id, item.owner, item.task, item.pr, item.noCodeReason, item.environment, item.build, item.acceptance];
    return `/prototype accept ${version} ${item.id} ${item.build} ${await digest(payload)}`;
}
export async function deliveryCommand(value) {
    const { verifiedBy, verifiedAt, ...publication } = value.publication;
    const payload = [publication, await Promise.all(value.changes.filter((item) => item.state === 'accepted').map((item) => acceptanceCommand(value.version, item)))];
    return `/prototype deliver ${value.version} ${value.publication.build} ${await digest(payload)}`;
}
function latestCommand(comments, owner, prefix) { return comments.filter((item) => item.user?.login?.toLowerCase() === owner?.toLowerCase() && item.body?.trim().startsWith(prefix)).sort((a, b) => Date.parse(a.updated_at || a.created_at) - Date.parse(b.updated_at || b.created_at)).at(-1); }
export async function signedConfirmations(value, comments, policy) {
    const owner = value.productOwner;
    if (!owner || !policy.product?.some((name) => name.toLowerCase() === owner.toLowerCase())) return { acceptances: {}, publication: null };
    const acceptances = {};
    for (const item of value.changes) {
        const last = latestCommand(comments, owner, `/prototype accept ${value.version} ${item.id} `);
        if (last?.body.trim() === await acceptanceCommand(value.version, item)) acceptances[item.id] = { by: last.user.login, at: last.updated_at || last.created_at, build: item.build, url: last.html_url, command: last.body.trim() };
    }
    const last = latestCommand(comments, owner, `/prototype deliver ${value.version} `);
    return { acceptances, publication: last?.body.trim() === await deliveryCommand(value) ? { by: last.user.login, at: last.updated_at || last.created_at, build: value.publication.build, url: last.html_url, command: last.body.trim() } : null };
}
export async function deliveryApprovalErrors(value, comments, policy) {
    const confirmed = await signedConfirmations(value, comments, policy); const errors = [];
    for (const item of value.changes.filter((entry) => entry.state === 'accepted')) { const proof = confirmed.acceptances[item.id]; if (!proof || proof.by !== item.acceptedBy || proof.at !== item.acceptedAt || proof.build !== item.acceptedBuild) errors.push(`${item.id} 尚无此业务构建的产品本人 GitHub 验收确认或确认已改变`); }
    if (value.phase === 'delivered' || value.publication.verifiedBy || value.publication.verifiedAt) { const proof = confirmed.publication; if (!proof || proof.by !== value.publication.verifiedBy || proof.at !== value.publication.verifiedAt) errors.push('业务发布尚无产品本人 GitHub 上线复核确认'); }
    return errors;
}
export function handoffMarkdown(value, release) {
    const errors = handoffErrors(value, release); if (errors.length) throw new Error(errors.join('\n'));
    return `评审标识：prototype-review:${release.id}\n\n# ${release.id} 产品与研发交接\n\n阶段：${phases[value.phase]}\n产品负责人：${value.productOwner || '待填写'}\n技术负责人：${value.technicalOwner || '待填写'}\n固定候选：${value.candidateUrl || '待生成'}\n提交：${value.candidateCommit || '待生成'}\n基线：${release.baseline || '无'}\n\n${engineeringSummary(value, release)}\n\n## 改动交付矩阵\n\n| 改动 | 负责人 | 状态 | 任务 | PR | 测试环境 / 构建 | 验收人 / 时间 |\n|---|---|---|---|---|---|---|\n${value.changes.map((item) => `| ${item.id} | ${item.owner || '待接单'} | ${taskStates[item.state]} | ${item.task} | ${item.pr} | ${item.environment} / ${item.build} | ${item.acceptedBy} / ${item.acceptedAt} |`).join('\n')}\n\n演示 / 验收数据初始化：${value.testData || '待填写'}\n\n## 决策与复核\n\n产品与技术批准绑定固定候选。产品验收评论：\`/prototype accept ${release.id} <CHG> <业务构建> <内容指纹>\`；请复制工作台完整命令，撤回时同命令将构建替换为 revoked。上线复核：\`/prototype deliver ${release.id} <发布构建> <内容指纹>\`。请用本人账号评论，再从工作台载入真实确认。任务 PR 使用 Refs，产品验收和发布完成后关闭。\n\n<!-- prototype-handoff -->\n\`\`\`json\n${JSON.stringify(value, null, 2)}\n\`\`\`\n`;
}
export function parseHandoff(body) { const match = body?.match(/<!-- prototype-handoff -->\s*```json\s*([\s\S]*?)```/); if (!match) throw new Error('主评审记录缺少交接工作台导出的结构化记录'); return JSON.parse(match[1]); }
export function approvalCommand(role, candidate) { return `/prototype ${role === 'product' ? 'approve' : 'confirm'} ${candidate.version} ${candidate.fingerprint}`; }
export function approvalErrors(handoff, candidate, comments, policy, after = 0) {
    const errors = [];
    for (const [role, ownerKey] of [['product', 'productOwner'], ['technical', 'technicalOwner']]) {
        const owner = handoff[ownerKey];
        if (!owner || !policy[role]?.some((name) => name.toLowerCase() === owner.toLowerCase())) { errors.push(`${role === 'product' ? '产品' : '技术'}确认人尚未配置或不在允许名单`); continue; }
        const relevant = comments.filter((item) => item.user?.login?.toLowerCase() === owner.toLowerCase() && typeof item.body === 'string' && item.body.trim().startsWith('/prototype ')).sort((a, b) => Date.parse(a.updated_at || a.created_at) - Date.parse(b.updated_at || b.created_at));
        const command = approvalCommand(role, candidate);
        const last = relevant.filter((item) => item.body.trim() === command || item.body.trim() === `/prototype revoke ${candidate.version}` || item.body.trim().startsWith(`/prototype ${role === 'product' ? 'approve' : 'confirm'} `)).at(-1);
        if (last?.body.trim() !== command) errors.push(`${role === 'product' ? '产品批准' : '技术确认'}缺失、已撤回或不属于此候选`);
        else if (role === 'product' && Date.parse(last.updated_at || last.created_at) < after) errors.push('产品最终批准必须晚于全部阻塞问题关闭及复核结论');
    }
    return errors;
}
export function blockerDecision(issue, comments, owner, version) {
    if (issue.state !== 'closed') return { errors: [`阻塞评审问题 #${issue.number} 尚未关闭`], at: 0 };
    const prefix = `/prototype resolve ${version} `; const last = latestCommand(comments, owner, prefix);
    const first = last?.body.trim().split('\n')[0];
    if (!first || !new RegExp(`^/prototype resolve ${version.replaceAll('.', '\\.')} (adopted|rejected|deferred)$`).test(first) || !/原因[：:]\s*\S/.test(last.body) || !/证据[：:]\s*https?:\/\/\S+/.test(last.body) || (first.endsWith('deferred') && !/承接[：:]\s*https?:\/\/\S+/.test(last.body))) return { errors: [`阻塞问题 #${issue.number} 缺少产品本人决策、原因、复核证据或暂缓承接`], at: 0 };
    return { errors: [], at: Math.max(Date.parse(issue.closed_at) || 0, Date.parse(last.updated_at || last.created_at) || 0) };
}

export function handoffIssueUrl(repository, release, draft = blankHandoff(release)) {
    const target = new URL(`https://github.com/${repository}/discussions/new`);
    target.searchParams.set('category', 'general');
    target.searchParams.set('title', `[产品与研发交接][${release.id}] ${release.title}`);
    target.searchParams.set('body', handoffMarkdown(draft, { ...release, supersededBy: undefined }));
    return target.href;
}

export function participantErrors(value, policy) {
    if (value.phase === 'preparation') return [];
    return [['product', 'productOwner'], ['technical', 'technicalOwner']].flatMap(([role, key]) => !policy[role]?.some((name) => name.toLowerCase() === String(value[key]).toLowerCase()) ? [`${role === 'product' ? '产品' : '技术'}确认人未在团队允许名单中登记`] : []);
}

/** 日常只显示四阶段；旧阶段原值保留，展示时映射。 */
export const workflowStages = { preparation: '制作中', review: '评审中', finalized: '已定稿', accepted: '已验收' };
export function workflowStage(value, release) {
    if (['accepted', 'delivered'].includes(value.phase)) return 'accepted';
    if (release.status === 'finalized' || ['finalized', 'development', 'acceptance'].includes(value.phase)) return 'finalized';
    return value.phase === 'review' ? 'review' : 'preparation';
}
export function acceptanceComplete(value) { return value.changes.every((item) => ['accepted', 'deferred', 'unnecessary'].includes(item.state)); }
export function publicationStarted(pub) { return Object.entries(pub).some(([key, value]) => key !== 'scope' && typeof value === 'string' && value.trim()); }
export function publicationStatus(value) {
    const pub = value.publication;
    if (!publicationStarted(pub)) return '未记录发布';
    if (pub.verifiedBy && pub.verifiedAt) return '已记录上线复核（待核对本人确认）';
    if (pub.noReleaseReason && pub.build === 'no-release') return '无需业务发布';
    return publicationErrors(value).length === 0 ? '已记录发布' : '发布信息未完整';
}
export function engineeringSummary(value, release) {
    let comparison = '待固定';
    try { const target = new URL(value.candidateUrl); target.pathname = target.pathname.replace(/workflow$/, 'versions'); target.search = new URLSearchParams({ version: release.id, baseline: release.baseline || '', compare: '1' }).toString(); comparison = target.href; } catch { /* 草稿允许尚无固定地址 */ }
    const review = reviewReference(release.id)?.url || '待登记 Discussion';
    return `## 需求与研发依据\n\n目标：${release.goal}\n原型：${value.candidateUrl || '待固定'}\n基线：${release.baseline || '无'}\n对比：${comparison}\n评审记录：${review}\n评审结论：以本版评审记录及关联问题的采用 / 暂缓 / 不采用结论为准。\n\n${release.changes.map((change) => {
        const item = value.changes.find((entry) => entry.id === change.id);
        return `### ${change.id} ${change.title}\n页面：${change.pageTitle || change.location}（${change.platform === 'mobile' ? '手机端 Vant' : '管理端 Semi'}）\n原来：${change.before}\n修改为：${change.after}\n业务规则：\n${change.rules.map((rule) => `- ${rule}`).join('\n')}\n异常：${change.exceptions}\n验收条件：\n${change.acceptance.map((text) => `- ${text}`).join('\n')}\n负责人：${item?.owner || '待接单'}；任务：${item?.task || '待登记'}\n研发去向：${taskStates[item?.state] || '待接单'}${item?.reason ? `；原因：${item.reason}` : ''}${item?.followUp ? `；承接：${item.followUp}` : ''}`;
    }).join('\n\n')}\n\n定稿后的新增需求、业务规则或验收条件变更进入下一版本；实现偏差登记缺陷并关联原改动编号。`;
}

export function publicationErrors(value) {
    const errors = [];
    const pub = value.publication; const accepted = value.changes.filter((item) => item.state === 'accepted').map((item) => item.id).sort();
    if (accepted.length) {
        if (!url(pub.url) || !url(pub.environment) || !buildId(pub.build) || !pub.publishedBy?.trim() || !time(pub.publishedAt) || !pub.rollback?.trim()) errors.push('业务交付需提供发布记录、生产环境、业务构建、发布人、时间和回退方式');
        if (!Array.isArray(pub.scope) || JSON.stringify([...pub.scope].sort()) !== JSON.stringify(accepted)) errors.push('本次发布范围必须准确覆盖已验收 CHG');
    } else if (!pub.noReleaseReason?.trim() || pub.build !== 'no-release') errors.push('无需业务发布时请填写产品确认的原因，发布构建使用 no-release');
    if ((value.phase === 'delivered' || pub.verifiedBy || pub.verifiedAt) && (String(pub.verifiedBy).toLowerCase() !== String(value.productOwner).toLowerCase() || !time(pub.verifiedAt) || (accepted.length && Date.parse(pub.verifiedAt) < Date.parse(pub.publishedAt)))) errors.push('业务交付需由产品在发布后本人复核，记录身份与时间');
    return errors;
}
