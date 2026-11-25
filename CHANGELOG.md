# 更新日志 · Changelog

ZSTU Lixiang Kitchen Reservation

本文件记录理享厨房预约助手的重要功能更新、缺陷修复、兼容性改进及公开发布历史。

项目版本采用 `MAJOR.MINOR.PATCH` 形式进行管理。

- MAJOR：重大功能或兼容性变化。
- MINOR：新增功能。
- PATCH：缺陷修复及较小的功能改进。

Beta 版本为公开测试版本，可能包含尚未完全稳定的功能。

完整发布记录请参阅 [GitHub Releases](https://github.com/XuZihao-py/ZSTU-Lixiang-Kitchen-Reservation/releases)。

---

## [v1.3.4-beta] — 2026-11-25

发布类型：Beta 公开测试版

### 版本概述 · Overview

本次更新引入预约环境检测、校园登录会话恢复、移动设备模式及预约日志功能。

本版本包含 v1.3.0 至 v1.3.4 开发阶段的主要更新。

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
- 完善项目使用指南及更新说明。

### 权限与隐私 · Privacy & Permissions

- 新增 WebNavigation 权限。
- 新增 Debugger 权限。
- 新增校园门户及统一身份认证相关网站访问权限。
- 完善移动设备模式及临时调试连接管理。
- 更新隐私权政策。
- 完善服务条款。
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

---

## [v1.2.3-beta.2] — 2026-11-25

发布类型：Beta 公开测试版

### 优化 · Improved

- 重新设计 README 项目主页。
- 新增项目状态徽章及版本下载入口。
- 优化安装指南与使用说明。
- 完善隐私权政策、服务条款及软件许可入口。
- 新增问题反馈与社区讨论导航。

### 说明 · Notes

本次更新主要涉及项目文档及发布内容，插件核心功能保持不变。

---

## [v1.2.3-beta] — 2026-11-25

发布类型：Beta 公开测试版

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

[v1.3.4-beta]: https://github.com/XuZihao-py/ZSTU-Lixiang-Kitchen-Reservation/releases/tag/v1.3.4-beta
[v1.2.3-beta.2]: https://github.com/XuZihao-py/ZSTU-Lixiang-Kitchen-Reservation/releases/tag/v1.2.3-beta.2
[v1.2.3-beta]: https://github.com/XuZihao-py/ZSTU-Lixiang-Kitchen-Reservation/releases/tag/v1.2.3-beta
