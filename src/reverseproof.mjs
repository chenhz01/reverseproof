// reverseproof —— 逆向/竞品分析的合规化中间层（A组真空③组件化）
// 定位：需求真实存在（rea 456k★），但直接逆向=法律灰区。本组件把「分析
// 竞品」约束在合规轨道上：robots.txt 检查 + ToS 引用 + 仅公开数据 + 证据链。
// 不提供任何抓取能力——它是「评估器」不是「爬虫」，这正是合规化中间层的边界。
// 零依赖。MIT。
import crypto from 'node:crypto';
import fs from 'node:fs';

const fp = s => crypto.createHash('sha256').update(String(s), 'utf8').digest('hex');

// robots.txt 解析：只实现 Disallow 精确/前缀匹配（够评估用）
export function parseRobots(txt) {
  const disallow = [];
  let appliesToUs = false;
  for (const raw of txt.split('\n')) {
    const line = raw.trim();
    if (/^user-agent:/i.test(line)) {
      const ua = line.slice(11).trim().toLowerCase();
      appliesToUs = ua === '*' || ua.includes('reverseproof'); // 组件以自身名义访问
    } else if (/^disallow:/i.test(line) && appliesToUs) {
      const p = line.slice(9).trim();
      if (p) disallow.push(p);
    }
  }
  return { disallow };
}

export function robotsAllows(robots, urlPath) {
  return !robots.disallow.some(p => urlPath.startsWith(p) || urlPath === p);
}

// 单条证据校验：必须有 url、capturedAt、isPublic=true、且内容自带原文
export function checkEvidence(ev, i) {
  const errs = [];
  if (!ev.url || !/^https?:\/\//.test(ev.url)) errs.push(`evidence[${i}] 缺合法 url`);
  if (!/^\d{4}-\d{2}-\d{2}T/.test(ev.capturedAt || '')) errs.push(`evidence[${i}] 缺 capturedAt（快照时间不可省）`);
  if (ev.isPublic !== true) errs.push(`evidence[${i}] isPublic 必须显式为 true（仅公开数据）`);
  if (!ev.quote || !String(ev.quote).trim()) errs.push(`evidence[${i}] 缺 quote 原文`);
  return errs;
}

// 总评估：合规分析报告。任何一项不合规 → verdict=blocked，附理由
export function assess(target, { robotsTxt, tosExcerpt, evidence = [], pathsToCheck = ['/'] }) {
  const blockers = [];
  const robots = robotsTxt != null ? parseRobots(robotsTxt) : null;
  if (robotsTxt == null) blockers.push('未提供 robots.txt 快照——无法证明访问路径被允许，默认阻止');
  for (const p of pathsToCheck) {
    if (robots && !robotsAllows(robots, p)) blockers.push(`路径 ${p} 被 robots.txt Disallow，禁止分析该路径`);
  }
  if (tosExcerpt && /( prohibit|forbid|不得|禁止|未经授权).{0,20}(scrap|crawl|爬|采集|抓取)/i.test(tosExcerpt)) {
    blockers.push('ToS 明文禁止采集/抓取——只能人工浏览引用，禁止任何自动化分析');
  }
  const evidenceErrors = evidence.flatMap((e, i) => checkEvidence(e, i));
  if (evidence.length === 0) blockers.push('证据列表为空——合规分析必须先有公开快照证据');
  // 证据有缺陷 = 分析前提不合规，一并阻断（D1：缺陷证据不许进入结论）
  if (evidenceErrors.length > 0) blockers.push(`存在 ${evidenceErrors.length} 条缺陷证据（见 evidenceErrors），缺陷证据不得作为分析依据`);

  // 证据链：逐条哈希 + prevHash 链
  let prev = 'GENESIS';
  const chain = evidence.map((e, i) => {
    const rec = { i, url: e.url, capturedAt: e.capturedAt, hash: fp(`${e.url}|${e.capturedAt}|${e.quote}`), prevHash: prev };
    prev = rec.hash;
    return rec;
  });

  return {
    target,
    verdict: blockers.length === 0 ? 'allowed' : 'blocked',
    blockers,
    evidenceErrors,
    chain,
    limitations: [
      '本报告仅证明"分析动作的合规前提"，不构成法律意见',
      'ToS 判定为正则启发式，命中后必须人工读原文确认',
      '证据仅限公开可见内容，登录/付费墙内容一律不得入链',
    ],
  };
}

export function renderMarkdown(r) {
  const lines = [`# 逆向合规评估 — ${r.target}`, '', `**结论: ${r.verdict === 'allowed' ? '✅ 允许分析' : '⛔ 阻止'}**`, ''];
  if (r.blockers.length) { lines.push('## 阻止理由', ''); r.blockers.forEach(b => lines.push(`- ${b}`)); }
  if (r.evidenceErrors.length) { lines.push('', '## 证据缺陷', ''); r.evidenceErrors.forEach(e => lines.push(`- ${e}`)); }
  if (r.chain.length) {
    lines.push('', '## 证据链', '', '| # | url | hash | prevHash |', '|---|---|---|---|');
    r.chain.forEach(c => lines.push(`| ${c.i} | ${c.url} | ${c.hash.slice(0, 12)}… | ${c.prevHash === 'GENESIS' ? 'GENESIS' : c.prevHash.slice(0, 12) + '…'} |`));
  }
  lines.push('', '## 局限声明', '');
  r.limitations.forEach(l => lines.push(`- ${l}`));
  return lines.join('\n');
}

if (import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}`) {
  const a = process.argv[2];
  if (a === 'selftest') await import('../test/selftest.mjs');
  else { console.error('用法: node reverseproof.mjs selftest'); process.exit(2); }
}
