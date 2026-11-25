<div align="center">

# 理享厨房预约助手

### ZSTU Lixiang Kitchen Reservation

[![Version](https://img.shields.io/badge/Version-1.2.3_Beta_2-orange)](https://github.com/XuZihao-py/ZSTU-Lixiang-Kitchen-Reservation/releases/tag/v1.2.3-beta.2)
![Chrome](https://img.shields.io/badge/Chrome-120%2B-4285F4?logo=googlechrome&logoColor=white)
![Manifest](https://img.shields.io/badge/Manifest-V3-brightgreen)
[![License](https://img.shields.io/badge/License-PolyForm_NC-blue)](./LICENSE)
![Status](https://img.shields.io/badge/Status-Public_Beta-orange)

**让校园厨房预约更加便捷。**

A better reservation experience for campus life.

[版本下载](https://github.com/XuZihao-py/ZSTU-Lixiang-Kitchen-Reservation/releases) ·
[问题反馈](https://github.com/XuZihao-py/ZSTU-Lixiang-Kitchen-Reservation/issues) ·
[社区讨论](https://github.com/XuZihao-py/ZSTU-Lixiang-Kitchen-Reservation/discussions) ·
[隐私权政策](./PRIVACY.md) ·
[服务条款](./TERMS.md)

</div>

> [!WARNING]
> 当前项目处于 Beta 公开测试阶段，部分功能仍在测试与优化中，可能存在未知问题或兼容性缺陷。
>
> 本项目为独立开发的非官方浏览器扩展，仅供学习与技术研究使用。请遵守学校及官方预约平台的相关管理规定。

## 关于项目 · About

理享厨房预约助手是一款面向浙江理工大学「理享食光 → 共享厨房」预约场景的 Chrome 浏览器扩展，旨在简化预约操作、减少重复操作并改善用户体验。

扩展支持设置预约日期、时段、人数和厨房优先顺序，复用用户在 Chrome 中已有的校园登录会话，任务配置保存在本机。

本项目由开发者独立设计与维护，与浙江理工大学及其相关管理机构不存在官方隶属或授权关系。

## 主要功能 · Features

- **预约配置**：支持自定义预约日期、时段及人数。
- **厨房选择**：支持厨房选择及优先顺序设置。
- **时间管理**：基于北京时间管理预约任务。
- **本地存储**：在本机保存预约配置及任务状态。
- **信息校验**：核对预约页面及表单信息。
- **结果反馈**：展示预约任务状态及执行结果。
- **预约日志**：从弹窗底部打开，按北京时间查看最近 12 个任务的执行步骤，可复制或下载 TXT。
- **会话复用**：复用 Chrome 中已有的校园登录会话。
- **环境检测**：检查能否直接加载共享厨房列表。发现预约登录失效时，打开数智浙理并给出重新进入的路径。
- **电源管理**：在预约任务执行期间请求系统保持唤醒。

## 下载与安装 · Download & Installation

### 当前发布版本 · Current Release

[![Download](https://img.shields.io/badge/Download-v1.2.3_Beta_2-24292F?style=for-the-badge&logo=github&logoColor=white)](https://github.com/XuZihao-py/ZSTU-Lixiang-Kitchen-Reservation/releases/tag/v1.2.3-beta.2)

[查看版本发布说明](https://github.com/XuZihao-py/ZSTU-Lixiang-Kitchen-Reservation/releases/tag/v1.2.3-beta.2) ·
[查看全部版本](https://github.com/XuZihao-py/ZSTU-Lixiang-Kitchen-Reservation/releases)

### 系统要求 · Requirements

| 项目 | 要求 |
| --- | --- |
| 浏览器 | Google Chrome 120 或更高版本 |
| 扩展规范 | Manifest V3 |
| 用户账号 | 有效的校园账号及登录会话 |
| 网络环境 | 正常的网络连接 |
| 设备状态 | 预约任务执行期间保持电脑开机及 Chrome 运行 |

### 安装步骤 · Installation

1. 进入 [GitHub Releases](https://github.com/XuZihao-py/ZSTU-Lixiang-Kitchen-Reservation/releases)，下载对应版本的 **Source code (zip)**。
2. 将压缩包解压至固定位置。
3. 在 Chrome 浏览器中打开 `chrome://extensions/`。
4. 开启右上角的「开发者模式」。
5. 点击「加载已解压的扩展程序」。
6. 选择解压目录中的 **extension** 文件夹。
7. 在 Chrome 的扩展程序菜单中固定「理享厨房预约助手」。

也可以通过 [GitHub 仓库](https://github.com/XuZihao-py/ZSTU-Lixiang-Kitchen-Reservation) 中的 **Code → Download ZIP** 获取 main 分支的当前源代码。

> [!NOTE]
> Releases 中提供的是对应发布版本的源代码快照，main 分支可能包含尚未正式发布的更新。

## 使用指南 · User Guide

### 1. 登录校园预约平台

从扩展弹窗点击「打开预约网页」，确认能够看到共享厨房列表。

首次登录或会话过期时，点击弹窗底部的「环境检测」。检测到预约登录失效时，扩展会打开数智浙理首页。需要认证时，请在学校页面登录，再从「服务 → 后勤服务 → 理享食光 → 共享厨房」进入。回到检测页点击「重新检测」，确认新的预约标签页也能加载列表。

如桌面门户入口不跳转，可在开发者工具的设备工具栏选择 Pixel，刷新门户后重新打开。

已有登录会话的用户可以访问：

[共享厨房直达页](https://zhst.zstu.edu.cn/statusweb/h5/universityFrontOfficeProgram/#/featuredStalls/roomReserve/Index?spaceType=2&categoryCode=fixed&organizationId=0&pageId=2084927814681309185)

### 2. 配置预约任务

在左栏选择预约日期，等待中栏读取网页后点击时段，再在右栏选择人数并添加厨房，用 ↑ 和 ↓ 调整优先顺序。

尚未放号时，日历下方会显示最早开放预约时间。

已满时段也可能出现在列表中，预约时以网页实际余位为准。

在同一次 Chrome 会话内，关闭并重新打开弹窗会恢复预约草稿。

### 3. 确认预约授权

在站点阅读安全须知，在扩展弹窗勾选授权后点击「开始预约」。

查看顶部显示的北京时间及建议开机区间。

### 4. 保持设备运行

在提示区间内保持电脑开机、联网，并确保 Chrome 保持运行。

扩展会打开一个专用预约标签页，并在任务期间请求系统保持唤醒。请保留该标签页。

提前准备阶段如遇登录问题，请完成登录并刷新该标签页。

### 5. 查看预约结果

在扩展弹窗中查看任务执行结果。

当结果显示「待核对」时，请先到站点的「我的预约」验证实际状态。

若站点要求额外信息或进入付款页面，请在官方网站人工处理。

> [!IMPORTANT]
> 扩展显示的任务状态仅供参考，实际预约结果以官方平台回执及「我的预约」中的记录为准。

## 预约规则 · Reservation Rules

### 时间与提交

平台公布的预约窗口为北京时间每日 **07:30–23:00**，可预约次日起 1–6 天的日期。

扩展根据目标日期计算最早可约日，通常从 **07:25** 准备，**07:30** 开始，最多工作至 **07:33**。

选择已放号日期且当前仍开放时，任务立即开始。下一天仍在可预约范围内时，夜间设置的任务会等到下一个开放窗口。

扩展按优先顺序选择页面显示可约且容量足够的厨房，重开日历核对已选日期，再交叉核对表单日期、地址栏日期、厨房、时段、人数和联系人。

扩展等待页面规定的须知倒计时、滚动条件与按钮启用，再通过网站的「确认预约」提交一次。现场已观察到 10 秒阅读时间，扩展以页面实时状态为准。

### 运行限制

- 时钟误差、电脑休眠、校内登录会话、网络环境及服务器负载都会影响预约。
- 使用前请运行系统时间同步。
- 站点变更或页面出现未识别的强制条件时，弹窗会显示失败或需人工处理。
- 预约结果不明确时，扩展会保留该状态供用户核对。
- 本项目不保证预约成功，请以官方平台的实际预约结果为准。

## 更新与测试 · Updates & Testing

### 软件更新

建议通过 [GitHub Releases](https://github.com/XuZihao-py/ZSTU-Lixiang-Kitchen-Reservation/releases) 获取已发布版本。

[仓库 main 分支](https://github.com/XuZihao-py/ZSTU-Lixiang-Kitchen-Reservation/tree/main) 提供当前开发源代码。

ZIP 安装的用户可以使用新版 `extension` 目录替换旧目录，然后在 `chrome://extensions/` 中点击扩展的重新加载按钮。

### 版本记录

| 版本 | 发布类型 | 更新内容 |
| --- | --- | --- |
| [v1.2.3-beta.2](https://github.com/XuZihao-py/ZSTU-Lixiang-Kitchen-Reservation/releases/tag/v1.2.3-beta.2) | Beta | 优化项目文档、安装指南及发布内容 |
| [v1.2.3-beta](https://github.com/XuZihao-py/ZSTU-Lixiang-Kitchen-Reservation/releases/tag/v1.2.3-beta) | Beta | 首次公开测试版本 |

完整版本记录请参阅 [Releases](https://github.com/XuZihao-py/ZSTU-Lixiang-Kitchen-Reservation/releases)。

### 规则测试

在项目根目录运行：

```bash
node tests/rules.cjs
node tests/booking-log.cjs
node tests/environment.cjs
```

用于验证放号时间、时段、容量、优先级和单次提交门槛。

### 页面测试

使用 Chrome 打开：

```text
tests/site-fixture.html
```

可以离线演练以下场景：

- 跨月选择预约日期
- 顶栏日期与日历不一致
- 表单日期不一致
- 周中及周末预约时段
- 预约容量已满
- 安全须知条件
- 提交锁及预约回执

页面显示 `PASS` 表示对应测试通过。

## 问题反馈 · Feedback

欢迎通过以下渠道提交问题、功能建议及使用体验，帮助改进本项目。

| 渠道 | 用途 |
| --- | --- |
| [GitHub Issues](https://github.com/XuZihao-py/ZSTU-Lixiang-Kitchen-Reservation/issues) | 软件缺陷及功能建议 |
| [GitHub Discussions](https://github.com/XuZihao-py/ZSTU-Lixiang-Kitchen-Reservation/discussions) | 使用交流及社区讨论 |
| [GitHub Releases](https://github.com/XuZihao-py/ZSTU-Lixiang-Kitchen-Reservation/releases) | 版本发布及更新公告 |

提交问题时，建议提供插件版本、浏览器版本、问题描述及必要的界面截图。

> [!CAUTION]
> 请勿在公开反馈中提交校园账号、密码、Cookie、身份验证令牌或其他敏感个人信息。

## 隐私权和条款 · Privacy & Terms

我们重视用户隐私、软件使用规范及知识产权保护。有关本项目的详细政策，请参阅以下文件。

| 文件 | 说明 |
| --- | --- |
| [服务条款（Terms of Service）](./TERMS.md) | 软件使用规范、用户责任及相关条款 |
| [隐私权政策（Privacy Policy）](./PRIVACY.md) | 信息处理、存储及隐私保护说明 |
| [软件许可说明（Software Licensing）](./LICENSE.md) | 面向中文用户的软件许可说明 |
| [软件许可证（License）](./LICENSE) | 正式软件授权文本 |
| [版权声明（Notice）](./NOTICE) | 知识产权及第三方资源声明 |

## 免责声明 · Disclaimer

本项目为独立开发的非官方浏览器扩展，仅供学习与技术研究使用，与浙江理工大学及其相关管理机构不存在官方隶属或授权关系。

本项目不提供预约资格，不保证预约成功，也不代表官方预约平台作出任何承诺。

使用本项目时，请遵守适用法律法规、学校管理规定及官方预约平台的相关规则，合理使用校园公共资源，尊重其他用户的合法权益。

## 软件许可 · License

本项目采用 **PolyForm Noncommercial License 1.0.0** 授权。

有关软件使用、修改、分发及非商业用途的具体规定，请参阅 [LICENSE](./LICENSE)。

第三方软件、字体及其他资源适用各自的许可证，详细信息请参阅 [NOTICE](./NOTICE)。

---

<div align="center">

**ZSTU Lixiang Kitchen Reservation**

Designed and developed by [Hsu Tzu-hao](https://github.com/XuZihao-py).

Copyright © 2026 Hsu Tzu-hao.

Licensed under the [PolyForm Noncommercial License 1.0.0](./LICENSE).

Independent development. For educational and research purposes.

[Terms of Service](./TERMS.md) ·
[Privacy Policy](./PRIVACY.md) ·
[Software Licensing](./LICENSE.md) ·
[License](./LICENSE) ·
[Notice](./NOTICE)

</div>
