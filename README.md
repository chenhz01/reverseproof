# reverseproof — 逆向/竞品分析的合规化中间层

[![selftest](https://img.shields.io/badge/selftest-10%2F10%20PASS-brightgreen)](./test/selftest.mjs) [![license](https://img.shields.io/badge/license-MIT-blue)](./LICENSE)

**解决什么问题**：逆向需求真实存在（rea 7 个月 456k★），但直接爬取=法律灰区+ToS 违约风险。中间层空缺：没有工具回答「这个分析动作合不合规」。reverseproof 是**评估器，不是爬虫**——它不抓任何东西，只回答：给定你的证据，你的分析动作能否合规成立。

## 四道闸

1. **robots.txt 闸**：无快照=默认阻止（无法证明允许）；Disallow 路径=阻断
2. **ToS 闸**：明文禁止采集/抓取 → 阻断自动化分析，只许人工浏览引用
3. **公开性闸**：每条证据必须显式 `isPublic: true`，缺 capturedAt = 缺陷证据 = 阻断
4. **证据链闸**：逐条 sha256 + prevHash 哈希链，首条 GENESIS，链可验证

## 快速开始

```bash
node src/reverseproof.mjs selftest   # 10/10 PASS
```

```js
import { assess, renderMarkdown } from './src/reverseproof.mjs';
const r = assess('shop.example.com', {
  robotsTxt: 'User-agent: *\nDisallow: /admin\n',
  evidence: [{ url: 'https://shop.example.com/p/1', capturedAt: '2026-11-13T09:00:00Z', isPublic: true, quote: '...' }],
});
r.verdict // 'allowed' | 'blocked'，blockers 数组给出每条阻止理由
```

## 设计

按《70 维设计标准》自查评分见 [DESIGN.md](./DESIGN.md)。

## 未做清单（边界）

- **不提供任何抓取/请求能力**——这是合规中间层的立身之本，永远不做
- 不做 ToS 法律语义解析（正则启发式 + 人工确认）
- 不做 OpenTimestamps 链上存证（哈希链本地闭环，上链是后续版本）
