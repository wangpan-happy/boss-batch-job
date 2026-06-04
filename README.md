# BOSS 批量沟通 Codex Skill

这是一个面向 **具备浏览器操作能力的 AI Agent** 的 Codex Skill，用来辅助在 BOSS 直聘网页上做可控的批量岗位沟通。

适用对象包括 Codex、Claude Code 等能打开浏览器、读取 DOM、点击页面元素、写本地文件的 agent。它不是普通浏览器插件，也不是绕过平台风控的工具。

## 它能做什么

- 打开 BOSS 直聘登录页，并提示用户手动登录。
- 让用户确认岗位关键词、城市、筛选条件、批量上限和打招呼话术。
- 支持“用户手动搜索，agent 接管结果页”的稳定流程。
- 在已验证 DOM 匹配时，可自动填写搜索关键词并点击 BOSS 页面自己的搜索按钮。
- 从当前结果页提取可见岗位，保存为 JSON。
- 通过 BOSS 网页上的可见按钮点击“立即沟通”。
- 看到成功弹窗后记录为已沟通，并点击“留在此页”继续。
- 将沟通、跳过、失败、停止原因合并导出到 CSV。

## 它不会做什么

- 不破解验证码、滑块、短信验证或安全校验。
- 不绕过 BOSS 风控、频率限制或登录检查。
- 不逆向 BOSS 私有接口。
- 不伪造 Cookie、请求头、签名、指纹、token 或 WebDriver 信号。
- 不保证临时修改打招呼内容。BOSS 点击“立即沟通”后通常使用账号里设置的默认招呼语。

遇到验证码、风险提示、操作频繁、登录失效、页面结构异常时，skill 要求 agent 立即停止。

## 安装

把这个仓库 clone 到 Codex 的 skills 目录：

```powershell
git clone https://github.com/wangpan-happy/boss-batch-job.git "$env:USERPROFILE\.codex\skills\boss-batch-apply"
```

然后重启或刷新 Codex 会话，让 agent 重新发现 skill。

## 使用方式

可以这样对 agent 说：

```text
Use $boss-batch-apply to help me contact 20 BOSS jobs for "ai 应用开发" in 武汉.
```

更推荐的稳定流程：

1. 让 agent 打开 BOSS 登录页。
2. 用户手动登录。
3. agent 优先尝试自动填写岗位关键词并点击搜索。
4. 如果自动搜索不稳定，用户手动搜索岗位和城市。
5. 用户告诉 agent：“结果页好了”。
6. agent 先只读提取当前可见岗位。
7. 用户确认批量上限和规则。
8. agent 逐个点击右侧详情页的“立即沟通”。
9. 每次看到成功弹窗后记录结果并继续。

## 已实测的 BOSS 页面 DOM

当前 skill 已记录 2026 年 BOSS 桌面网页里较稳定的一组 DOM 锚点：

- 结果卡片容器：`.card-area .job-card-wrap`
- 搜索输入框：`.job-search-form input.input`
- 搜索按钮：`.job-search-form .search-btn[ka="job_search_btn_click"]`
- 当前选中卡片：`.card-area .job-card-wrap.active .job-card-box`
- 岗位名称：`.job-card-box .job-name`
- 薪资：`.job-card-box .job-salary`
- 公司名：`.job-card-box .boss-name`
- 地点：`.job-card-box .company-location`
- 右侧详情区：`.job-detail-header`
- 右侧沟通按钮：`.job-detail-header a.op-btn-chat[ka^="cpc_job_list_chat_"]`
- 成功弹窗：`.greet-boss-container`
- 成功后留在当前页：`.greet-boss-container .cancel-btn`

注意：BOSS 的页面结构可能随时变化。agent 必须先确认当前页面仍然是目标搜索结果页，再点击右侧详情按钮。

## 速度策略

默认节奏比较保守：

- 每次沟通间隔 6-12 秒。
- 每 10 个岗位暂停并汇报一次。

如果用户明确要求更快，可以使用快速模式：

- 等成功弹窗或页面刷新稳定后，再等 3-5 秒。
- 不建议低于 3 秒连续点击。
- 一旦出现“操作频繁”“风险提示”“账号异常”等提示，立即停止。

这个节奏是为了稳定和可控，不是为了隐藏自动化。

## 文件说明

- `SKILL.md`：Codex Skill 主说明和触发元数据。
- `references/boss-workflow.md`：详细流程、DOM 锚点、停止条件、沟通循环。
- `scripts/extract-visible-jobs.js`：只读 DOM 提取脚本，不点击、不输入、不修改页面。
- `scripts/merge-application-records.mjs`：把 JSON 记录合并成稳定 CSV。
- `agents/openai.yaml`：Codex 技能列表展示信息。

## 输出记录

默认输出目录类似：

```text
boss-apply-runs/YYYY-MM-DD-HHMMSS/
```

常见文件：

- `settings.json`：本次搜索设置。
- `visible-jobs.json`：可见岗位提取结果。
- `new-records.json`：本轮沟通记录。
- `applications.csv`：最终合并后的 CSV。

CSV 状态包括：

- `contacted`：已看到成功弹窗或有明确成功状态。
- `already_contacted`：按钮显示已经沟通过。
- `skipped_filter`：不符合筛选条件。
- `skipped_no_button`：没有可用沟通按钮。
- `failed`：操作失败或无法确认成功。
- `stopped_verification`：遇到验证码、风险提示或安全校验后停止。

## 安全边界

请只在用户自己的 BOSS 账号和真实浏览器会话里使用。所有操作都应通过正常网页 UI 完成。任何登录异常、验证码、安全校验、频率限制或账号风险提示，都应该由用户本人处理，agent 不应继续尝试。
