# 维护约定

- 这里的扩展使用 Manifest V3，安装目录为 `extension`。在仓库源代码中维护改动。
- 用户要求更新时，先同步当前远程分支，再验证、提交和推送到 `origin/main`。推送后核对远程提交，交付时提供提交链接。
- 当前可运行的验证包括 `node tests/rules.cjs` 和 Chrome 中的 `tests/site-fixture.html`。
- 测试使用合成数据或停在真实预约页的提交前。真实预约需要用户提供目标日期、时段、可接受厨房及人数并授权。
