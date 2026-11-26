# 更新日志 · Changelog

ZSTU Lixiang Kitchen Reservation

本文件记录理享厨房预约助手的重要功能更新、缺陷修复、兼容性改进、文档维护及公开发布历史。

## 版本管理 · Versioning

项目采用 `MAJOR.MINOR.PATCH` 形式管理 Chrome 扩展内部版本号。

- MAJOR：重大功能或兼容性变化。
- MINOR：新增功能。
- PATCH：缺陷修复及较小的功能改进。

GitHub Release 标签用于区分正式发布版本及公开测试版本。

Beta 版本可能包含尚未完全稳定的功能。

仅涉及项目文档、政策说明及维护规范的发布，可能沿用相同的扩展内部版本号。

完整发布记录请参阅 [GitHub Releases](https://github.com/XuZihao-py/ZSTU-Lixiang-Kitchen-Reservation/releases)。

---

## [v1.4.0] — 2026-11-26

发布类型：正式版

扩展内部版本：1.4.0

- 工具栏弹窗展示预约摘要，预约设置、环境检测和预约日志集中到同一个工作台。校园认证后返回工作台，保留预约草稿。
- 使用新图标标识 Chrome 工具栏和插件标签页。
- 登录类环境检测报错会提示使用「从门户检测」。
- 右上角只显示待预约、预约中、预约成功或预约失败，并以颜色区分。预约结果以学校回执为准。

[查看完整变更](https://github.com/XuZihao-py/ZSTU-Lixiang-Kitchen-Reservation/compare/v1.3.8-beta...v1.4.0)

## [v1.3.8-beta] — 2026-11-26

发布类型：Beta 公开测试版

扩展内部版本：1.3.8

- 修复 Chrome 隐藏标签页延迟渲染导致的环境检测及预约时段查询超时。
- 手动环境检测、预约前自动检测和日期时段查询会让临时预约页在后台继续渲染。
- 自动检测和时段查询保留当前标签页。检测或查询结束后，扩展解除临时页的调试连接。
- 已在 Chromium 模拟预约页验证旧版超时及修复后的读取流程，并验证校园会话跳转。

[查看完整变更](https://github.com/XuZihao-py/ZSTU-Lixiang-Kitchen-Reservation/compare/v1.3.7-beta...v1.3.8-beta)

## [v1.3.7-beta] — 2026-11-25

发布类型：Beta 公开测试版

扩展内部版本：1.3.7

### 环境检测

- 在扩展主页显示最近一次检测的状态、时间和异常位置。
- 在预约开始前 15 分钟后台检测。打开主页时，若没有检测记录或上次检测已超过 6 小时，也会尝试后台检测。
- 检测通过并保存结果后，可点击「返回预约助手」，在主页查看更新后的状态。
- 手动恢复会话时，在前台加载数智浙理服务中心，并等待理享食光完成会话跳转后再读取时段。

### 测试说明

- 已通过模拟页面测试，覆盖自动检测、登录失效、会话跳转和主页状态同步。
- 已用真实校园会话从「环境检测」入口验证有效时段读取及主页状态更新。「从门户检测」仍可能遇到门户未加载服务导航。

[查看完整变更](https://github.com/XuZihao-py/ZSTU-Lixiang-Kitchen-Reservation/compare/v1.3.4-beta.2...v1.3.7-beta)

## [v1.3.4-beta.2] — 2026-11-25

发布类型：Beta 公开测试版

扩展内部版本：1.3.4

### 版本概述 · Overview

本次更新基于 v1.3.4 Beta，主要完善项目文档、隐私权政策、服务条款及开发维护规范。

### 项目文档 · Documentation

- 完善项目主页及功能介绍。
- 更新预约环境检测及校园登录会话恢复指南。
- 完善移动设备模式使用说明。
- 完善预约日志及导出功能说明。
- 优化软件安装及版本升级指南。
- 补充浏览器权限及网站访问范围说明。

### 隐私权和条款 · Privacy & Terms

- 完善隐私权政策及个人信息处理说明。
- 补充 WebNavigation 权限用途说明。
- 补充 Debugger 权限用途及使用范围说明。
- 完善校园相关网站访问权限说明。
- 完善移动设备模拟及临时调试连接说明。
- 完善预约日志的存储、保留及删除说明。
- 更新服务条款及用户责任说明。
- 补充测试版本相关风险提示。

### 项目维护 · Project Maintenance

- 新增 CHANGELOG.md，建立完整的版本更新记录。
- 完善 AGENTS.md，规范项目开发及维护流程。
- 完善版本管理及文档同步规范。
- 完善浏览器权限及隐私保护要求。
- 完善自动化测试及发布前检查要求。

### 版本说明 · Notes

本次更新仅涉及项目文档、隐私权政策、服务条款及开发维护规范。

扩展核心功能与 v1.3.4 Beta 保持一致。

已安装 v1.3.4 Beta 的用户无需重新安装扩展。

[查看完整变更](https://github.com/XuZihao-py/ZSTU-Lixiang-Kitchen-Reservation/compare/v1.3.4-beta...v1.3.4-beta.2)

---

## [v1.3.4-beta] — 2026-11-25

发布类型：Beta 公开测试版

扩展内部版本：1.3.4

### 版本概述 · Overview

本次更新引入预约环境检测、校园登录会话恢复、移动设备模式及预约日志功能。

本版本包含 v1.3.0 至 v1.3.4 开发阶段的主要功能更新。

### 新增 · Added

- 独立预约环境检测页面。
- 校园预约直达页检测。
- 数智浙理门户服务入口检测。
- 校园登录会话恢复及认证引导。
- 共享厨房预约数据有效性验证。
- 移动设备模式支持。
- 环境检测阶段及诊断进度展示。
- 独立预约日志页面。
- 最近 12 个预约任务的历史记录。
- 每个任务最多 60 条执行日志。
- 日志复制及 TXT 文件导出。
- 预约日志及环境检测相关自动化测试。

### 优化 · Improved

- 优化校园门户移动端交互。
- 优化门户跳转及页面识别。
- 完善校园统一身份认证提示。
- 完善预约失败及异常原因反馈。
- 优化预约状态记录。
- 优化相关页面布局及字体显示。
- 完善新功能相关使用说明。

### 权限与隐私 · Privacy & Permissions

- 新增 WebNavigation 权限。
- 新增 Debugger 权限。
- 新增校园门户及统一身份认证相关网站访问权限。
- 完善移动设备模式及临时调试连接管理。
- 补充预约日志及环境检测相关隐私说明。
- 预约日志保存在用户设备本地。
- 预约日志不保存账号密码、联系人字段内容或身份验证凭据。

### 开发阶段记录 · Development History

以下版本为本次公开发布之前的开发阶段版本，不代表独立发布的 GitHub Release。

#### v1.3.4 — 2026-11-25

- 新增环境检测阶段及诊断节点展示。
- 优化校园门户触控交互。
- 完善移动设备模式下的门户入口检测。
- 更新相关页面及使用说明。

#### v1.3.3 — 2026-11-25

- 新增移动设备模式。
- 支持校园门户移动端浏览器环境模拟。
- 增加移动端标识、页面尺寸及触控模拟。
- 完善相关调试连接管理。
- 新增移动设备模式测试。

#### v1.3.2 — 2026-11-25

- 完善校园登录会话恢复流程。
- 增加实际预约数据有效性验证。
- 完善校园服务页面跳转识别。
- 优化登录异常提示。

#### v1.3.1 — 2026-11-25

- 新增预约环境检测功能。
- 新增独立环境检测页面。
- 新增登录会话失效提示。
- 增加校园统一身份认证引导。
- 新增环境检测相关测试。

#### v1.3.0 — 2026-11-25

- 新增可读性更强的预约日志。
- 新增独立预约日志页面。
- 支持查看历史预约任务。
- 支持复制及下载 TXT 日志。
- 使用北京时间记录执行时间。
- 完善任务失败及异常状态记录。
- 新增预约日志自动化测试。

[查看完整变更](https://github.com/XuZihao-py/ZSTU-Lixiang-Kitchen-Reservation/compare/v1.2.3-beta.2...v1.3.4-beta)

---

## [v1.2.3-beta.2] — 2026-11-25

发布类型：Beta 公开测试版

扩展内部版本：1.2.3

### 优化 · Improved

- 重新设计 README 项目主页。
- 新增项目状态徽章及版本下载入口。
- 优化安装指南与使用说明。
- 完善隐私权政策、服务条款及软件许可入口。
- 新增问题反馈与社区讨论导航。

### 版本说明 · Notes

本次更新主要涉及项目文档及发布内容，插件核心功能保持不变。

[查看完整变更](https://github.com/XuZihao-py/ZSTU-Lixiang-Kitchen-Reservation/compare/v1.2.3-beta...v1.2.3-beta.2)

---

## [v1.2.3-beta] — 2026-11-25

发布类型：Beta 公开测试版

扩展内部版本：1.2.3

本项目在 GitHub Releases 上的首次公开测试版本。

### 主要功能 · Features

- 自定义预约日期、时段及人数。
- 厨房选择及优先顺序设置。
- 基于北京时间的预约任务管理。
- 预约配置及任务状态本地存储。
- 预约表单校验与结果反馈。
- 复用浏览器已有的校园登录会话。

---

## 相关链接 · Related Links

- [项目主页](https://github.com/XuZihao-py/ZSTU-Lixiang-Kitchen-Reservation)
- [版本下载](https://github.com/XuZihao-py/ZSTU-Lixiang-Kitchen-Reservation/releases)
- [问题反馈](https://github.com/XuZihao-py/ZSTU-Lixiang-Kitchen-Reservation/issues)
- [社区讨论](https://github.com/XuZihao-py/ZSTU-Lixiang-Kitchen-Reservation/discussions)
- [隐私权政策](./PRIVACY.md)
- [服务条款](./TERMS.md)
- [软件许可证](./LICENSE)

---

Copyright © 2026 Hsu Tzu-hao.

Licensed under the PolyForm Noncommercial License 1.0.0.

[v1.3.4-beta.2]: https://github.com/XuZihao-py/ZSTU-Lixiang-Kitchen-Reservation/releases/tag/v1.3.4-beta.2
[v1.3.4-beta]: https://github.com/XuZihao-py/ZSTU-Lixiang-Kitchen-Reservation/releases/tag/v1.3.4-beta
[v1.2.3-beta.2]: https://github.com/XuZihao-py/ZSTU-Lixiang-Kitchen-Reservation/releases/tag/v1.2.3-beta.2
[v1.2.3-beta]: https://github.com/XuZihao-py/ZSTU-Lixiang-Kitchen-Reservation/releases/tag/v1.2.3-beta
