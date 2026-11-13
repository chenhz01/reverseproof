# reverseproof · Agent 第二入口

- **这是什么**：逆向/竞品分析的**合规化中间层**——评估器，不是爬虫。四道闸：robots.txt / ToS / 公开性 / 证据链。不提供任何抓取能力，永远不做。
- **入口**：人类读 [README.md](./README.md)；机器先跑 `node test/selftest.mjs`（10/10 PASS exit=0）再读 `src/reverseproof.mjs`。
- **证据目录**：逐维门禁表 [DESIGN.md](./DESIGN.md)（REV70 双七制，无综合分）。
- **改动约定**：ToS 正则模式改动必须留 git 提交理由；新增闸必须带阻断用例；**禁止向本仓添加任何 HTTP 请求/抓取功能**（架构约束，PR 直接拒）。
- **讨论入口**：认为某类违规模式漏判（如 robots 通配符、ToS 中文的更多表述）？开 issue 附反例，逐条对账。请勿刷 issue。
