// reverseproof selftest
import assert from 'node:assert';
import { parseRobots, robotsAllows, assess, renderMarkdown } from '../src/reverseproof.mjs';

const results = [];
const t = (name, fn) => { try { fn(); results.push(['PASS', name]); } catch (e) { results.push(['FAIL', `${name} :: ${e.message}`]); } };

const okEv = { url: 'https://shop.example.com/p/1', capturedAt: '2026-11-13T09:00:00Z', isPublic: true, quote: '天然成分洗发水 ¥59' };
const robotsTxt = 'User-agent: *\nDisallow: /admin\nAllow: /p/\n';

t('robots 解析: /admin 被禁 /p/ 允许', () => {
  const r = parseRobots(robotsTxt);
  assert.equal(robotsAllows(r, '/admin'), false);
  assert.equal(robotsAllows(r, '/p/1'), true);
});
t('证据齐全 → verdict=allowed', () => {
  const r = assess('example.com', { robotsTxt, evidence: [okEv] });
  assert.equal(r.verdict, 'allowed');
  assert.equal(r.blockers.length, 0);
});
t('缺 robots.txt 快照 → blocked（无法证明合规）', () => {
  const r = assess('example.com', { evidence: [okEv] });
  assert.equal(r.verdict, 'blocked');
  assert.ok(r.blockers.some(b => b.includes('robots.txt')));
});
t('Disallowed 路径进分析 → blocked', () => {
  const r = assess('example.com', { robotsTxt, evidence: [okEv], pathsToCheck: ['/admin/users'] });
  assert.equal(r.verdict, 'blocked');
});
t('ToS 明文禁止抓取 → blocked', () => {
  const tos = '用户不得使用自动化程序爬取本站内容。';
  const r = assess('example.com', { robotsTxt, tosExcerpt: tos, evidence: [okEv] });
  assert.equal(r.verdict, 'blocked');
  assert.ok(r.blockers.some(b => b.includes('ToS')));
});
t('证据缺 capturedAt → 逐条报错不静默', () => {
  const r = assess('example.com', { robotsTxt, evidence: [{ url: 'https://x.com/a', isPublic: true, quote: 'q' }] });
  assert.equal(r.verdict, 'blocked');
  assert.ok(r.evidenceErrors.some(e => e.includes('capturedAt')));
});
t('isPublic 未显式 true → 拒绝', () => {
  const r = assess('example.com', { robotsTxt, evidence: [{ url: 'https://x.com/a', capturedAt: '2026-11-13T09:00:00Z', quote: 'q' }] });
  assert.ok(r.evidenceErrors.some(e => e.includes('isPublic')));
});
t('证据链 prevHash 连续且首条 GENESIS', () => {
  const r = assess('example.com', { robotsTxt, evidence: [okEv, { ...okEv, url: 'https://shop.example.com/p/2' }] });
  assert.equal(r.chain[0].prevHash, 'GENESIS');
  assert.equal(r.chain[1].prevHash, r.chain[0].hash);
});
t('确定性：同输入两次评估哈希一致', () => {
  const a = assess('example.com', { robotsTxt, evidence: [okEv] });
  const b = assess('example.com', { robotsTxt, evidence: [okEv] });
  assert.deepEqual(a.chain, b.chain);
});
t('Markdown 报告含结论与局限声明', () => {
  const md = renderMarkdown(assess('example.com', { robotsTxt, evidence: [okEv] }));
  assert.ok(md.includes('✅ 允许分析') && md.includes('局限声明'));
});

let fail = 0;
for (const [s, n] of results) { console.log(`${s}  ${n}`); if (s === 'FAIL') fail++; }
console.log(`reverseproof selftest: ${results.length - fail}/${results.length} PASS`);
process.exit(fail ? 1 : 0);
