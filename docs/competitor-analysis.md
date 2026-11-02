# Competitor Analysis — Group Expense Splitting Apps

| 项目 | 内容 |
| --- | --- |
| 检索日期 | 2026-11-02 |
| 分析对象 | Splitwise、Tricount、Settle Up、百事AA记账、AA账本（GoDutch）、随手记 |
| 分析维度 | 多币种支持、结算逻辑、导出、定价、用户痛点 |
| 相关文档 | [PRD](./PRD.md) · [Roadmap](./roadmap.md) |

> **关于信息可信度的说明**
> 本文所有事实都附带来源。来源按可信度分三类：
> - ✅ **官方**：官方帮助中心、官方博客、应用商店官方页面
> - ⚠️ **第三方**：媒体评测、第三方博客、竞品营销页、用户评论聚合站
> - ❓ **未能确认**：公开渠道没有找到可靠信息
>
> 应用商店价格随地区和时间变化，本文价格只代表检索时找到的快照。部分官方站点（apps.apple.com、tricount.com）在检索环境中无法直接访问，相关信息通过搜索引擎摘要获取，结论中已注明。

---

## 1. Executive Summary

1. **海外头部产品在收紧免费功能。** Splitwise 对免费用户限制每日记账笔数，币种统一换算是 Pro 功能。Tricount 被 bunq 收购后，新版取消了 Premium，同时**移除了 CSV/PDF 导出**。"免费且完整的多币种分账"出现了空缺。
2. **多币种的难点不在"支持多少币种"，而在"按什么汇率口径换算"。** Splitwise 统一换算时使用换算当时的汇率，而且会影响历史账目和已结清的账目，容易引发困惑。这是 TripSplit 最核心的切入点：**按消费日锁定汇率，并且可以手动覆盖**。
3. **国内产品多数是"个人记账 + AA 附属功能"**（如随手记），或者是功能堆叠的工具型 App。它们普遍没有把"最少转账结算"和"汇率口径透明"做成核心体验，也缺少面向留学生混合国籍小组的中英双语支持。
4. **"一键算清"已经是标配**，最少转账算法不构成壁垒。TripSplit 的差异化应该放在**汇率口径、参与门槛（免注册 + 微信分享）、免费导出、AI 记账（v2）**上。

---

## 2. Comparison Matrix

| 维度 | Splitwise | Tricount | Settle Up | 百事AA记账 | AA账本（GoDutch） | 随手记 | **TripSplit（MVP）** |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 定位 | 全球头部分账工具，长期关系（室友、情侣）+ 旅行 | 欧洲流行的旅行分账工具，bunq 旗下 | 跨平台小组分账 | 国内多人记账 + AA | 国内多币种 AA 账本 | 国内综合个人记账，多人账本是附属功能 | **出境旅行多币种 AA** |
| 多币种记账 | ✅ 免费版可用多币种记账 [S2] | ✅ 支持多币种 + 换算 [T3] | ✅ 支持所有币种 + 汇率 [U1] | ✅ 支持多币种 [C1] | ✅ 每笔可选币种 [C3] | ❓ 未确认 | ✅ |
| 统一换算 | ⚠️ **Pro 付费**；按换算时汇率，会影响历史账目 [S2][S3] | ✅ 免费 [T3] | ✅ 可修改所有交易的汇率 [U1] | ❓ | ✅ 可手动设置汇率 [C3] | ❓ | ✅ **按消费日锁定 + 手动覆盖，免费** |
| 分摊方式 | 均摊 / 精确金额 / 百分比 / 份数等 | 均摊 / 份数 / 金额 | 均摊 / 权重 / 金额 | 均分 / 比例 / 份额 / 明细 [C1] | 可调整参与人和明细 [C3] | 平均值分摊（社区教程）[C5] | 均摊 / 份数 / 精确金额 |
| 结算逻辑 | "Simplify debts"：重组债务、减少转账笔数，可选开启，免费 [S4] | 自动计算还款方案 | 最少转账方案 | 提供"结算方案" [C1] | 自动计算 | 汇总后计算平均值 [C5] | 净余额 + 贪心最少转账（≤ N−1） |
| 导出 | 有电子表格（CSV）导出；是否免费，来源说法不一 [S5] | ⚠️ **新版移除 CSV/PDF 导出** [T2] | Excel 导出为 Premium 功能 [U2] | PDF + 图片 / Excel 导出 [C2] | ❓ | ❓ | ✅ **CSV 免费** |
| 票据/AI | 收据扫描 + 逐项拆分（Pro）[S2] | 可关联 bunq 卡自动记账 [T4] | 收据照片存储（Premium）[U2] | 宣传"AI 记账、自动记账" [C1] | ❓ | ❓ | v2：OCR + 自然语言记账 |
| 定价 | 免费（有每日记账上限 + 广告）；Pro 约 $4.99/月或 $39.99/年（美区）[S1] | 免费，已取消 Premium [T1][T2] | 免费 + Premium：$3.99/月、$19.99/年；Group Premium $39.99（美区）[U2] | 免费下载 + 应用内购买，价格 ❓ [C2] | ❓ | ❓（未检索到可靠价格） | MVP 免费 |
| 中文/本土化 | 需要注册账号；中文支持 ❓ | 有中文商店页面 [T5] | — | ✅ 中文 | ✅ 中文 | ✅ 中文 | ✅ 中英双语 + 微信分享 |

> 表中"❓"表示在公开渠道没有找到可靠来源，**不代表该产品没有这项功能**。"分摊方式"和"结算逻辑"两行中没有标注来源的单元格，是基于产品常见功能的描述，需要实际试用核实（见第 7 节）。

---

## 3. Competitor Deep Dives

### 3.1 Splitwise

**定位：** 全球最知名的分账工具。场景覆盖室友合租、情侣和旅行，强调长期关系中的持续记账。

| 维度 | 事实 | 来源 |
| --- | --- | --- |
| 多币种 | 免费版可以在同一个群组内记录多个币种的支出，但**各币种余额默认分开显示**；统一换算成一个币种是 **Pro 功能** | ⚠️ [S2][S3] |
| 换算口径 | 换算时使用**换算当时的市场汇率**，而不是每笔消费当天的汇率。换算会作用到历史支出（包括已结清的），可能改变其他成员的余额；之后新增的外币支出需要再次换算 | ⚠️ [S3] |
| 结算 | "Simplify debts"在保持每人净额不变的前提下重组债务、减少转账笔数。可在群组设置中开启，属于免费功能 | ⚠️ [S4] |
| 票据 | Pro 提供收据扫描和逐项拆分（itemize） | ⚠️ [S2] |
| 免费限制 | 免费用户每天可添加的支出笔数有上限，并展示广告。**具体上限没有官方公开**，第三方报道的数字在 3–5 笔/天之间，且相互矛盾 | ⚠️ [S1] |
| 定价 | Pro 约 $4.99/月或 $39.99/年（美区 App Store，第三方转述），各地区价格不同 | ⚠️ [S1] |

**用户痛点：**
- 免费版"每天只能记几笔"，和旅行中高频记账的场景冲突。一天吃饭、交通、门票很容易超过 5 笔。
- 统一换算要付费，而且口径是"换算时汇率"，会造成"同一笔账，昨天看和今天看不一样"的困惑。有用户在评论中要求支持"按指定汇率换算并以目标币种结清" [S3]。
- 需要注册账号。对只想"看一眼自己该付多少"的被动参与者门槛偏高（推断）。

**对 TripSplit 的启示：** Splitwise 的护城河是网络效应和品牌，正面竞争不现实。切入点是它的**付费墙（换算）**和**口径问题（汇率时点）**，以及中国用户的本土化需求。

### 3.2 Tricount

**定位：** 欧洲流行的旅行分账 App，现在属于荷兰数字银行 bunq [T1]。

| 维度 | 事实 | 来源 |
| --- | --- | --- |
| 定价 | 新版 App 不再需要 Premium 会员。已订阅用户的订阅会持续到到期 | ✅ [T1] |
| 被移除的功能 | 官方帮助中心列出新版**不再提供**的 Premium 功能：CSV 和 PDF 导出、个人模式、统计（计划未来更新）、保存自定义分摊（计划未来更新） | ✅ [T2] |
| 多币种 | 免费支持多币种和自动换算；第三方称支持 150+ 币种 | ⚠️ [T3] |
| 银行联动 | 可以把 bunq 卡关联到指定 tricount，自动加入支出 | ✅ [T4] |
| 口碑 | 评分聚合站显示 4.8 分（43,671 条评分），但新版有关于功能被移除、数据异常的负面评价 | ⚠️ [T6] |

**用户痛点：**
- 改版移除导出和统计，老用户不满 [T2][T6]。
- 商业模式服务于 bunq 的银行业务（获客工具）。中国用户无法使用 bunq 联动，这部分价值基本不存在（推断）。

**对 TripSplit 的启示：**
1. "免费 + 完整导出"有机会成为差异点。
2. Tricount 是"分账工具作为金融产品获客入口"的案例，可以作为 TripSplit 远期商业化的参照（见 Roadmap v3）。

### 3.3 Settle Up

**定位：** 跨平台（iOS / Android / Web）小组分账工具。

| 维度 | 事实 | 来源 |
| --- | --- | --- |
| 多币种 | 应用商店描述称支持所有币种和实时汇率；更新日志显示新增"修改所有交易的汇率"功能 | ⚠️ [U1] |
| Premium 功能 | 去广告、收据照片存储、周期性支出、自定义分类、Excel 导出、消费统计 | ⚠️ [U2] |
| 定价 | 美区：月度 Premium $3.99、年度 $19.99、Group Premium（一次性）$39.99、Lifetime Group Premium $149.99；意大利区年度约 €20.99 | ⚠️ [U2] |

**用户痛点：** 导出和票据存储都要付费；免费版有广告。

**对 TripSplit 的启示：** **"Group Premium"（按群组一次性付费）**很适合旅行这种低频、一次性场景。比起让每个人订阅，"组织者为这趟旅行一次性解锁"更符合用户心理，是 TripSplit 商业化的一个备选方案。

### 3.4 Chinese Apps（国内产品）

#### 百事AA记账（BestTracker）

| 维度 | 事实 | 来源 |
| --- | --- | --- |
| 分摊 | 支持多人实时共享账本；支出分摊可以按均分、比例、份额或明细计算；可随时查看结算方案 | ⚠️ [C1] |
| 多币种 | 应用商店标题和描述提到多币种、多语言 | ⚠️ [C1] |
| 导出 | 可导出 PDF + 图片、Excel + 高清图 | ⚠️ [C2] |
| AI | 应用商店标题宣传"AI 记账、自动记账" | ⚠️ [C1] |
| 定价 | 免费下载，提供应用内购买，具体价格 ❓ | ⚠️ [C2] |

#### AA账本（GoDutch）

| 维度 | 事实 | 来源 |
| --- | --- | --- |
| 多币种 | 定位跨国旅行分账；每条消费可以单独设置货币，可以手动设置汇率 | ⚠️ [C3][C4] |
| 分摊 | 非均摊消费可以调整参与人和金额明细 | ⚠️ [C4] |

#### 随手记

| 维度 | 事实 | 来源 |
| --- | --- | --- |
| 定位 | 综合个人记账 App | — |
| AA 能力 | 社区教程（2019 年）：建立旅行账本 → 邀请同行朋友记账 → 行程结束后汇总、计算平均值，得出每人应付金额 | ⚠️ [C5] |
| 多人协作 | 第三方下载站称支持多人记账和成员权限设置（需核实） | ⚠️ [C6] |
| 多币种 / 定价 | ❓ 未检索到可靠信息 | — |

#### 微信小程序类 AA 工具

爱范儿曾横评多款聚餐和旅游 AA 小程序 [C7]。这类工具即用即走、分享方便，但功能较浅，多币种支持弱（文章发布较早，现状需复核）。

**国内产品的共性痛点（基于上述资料推断）：**
- 综合记账类产品（随手记）的 AA 是附属功能，"算平均值"式的结算处理不了复杂分摊和最少转账。
- 工具类 App 功能堆叠（预算、收入分账、AI 记账……），旅行场景的核心路径被稀释。
- 面向混合国籍小组（留学生 + 外国同学）的双语协作支持有限。

---

## 4. Positioning Map

```
                    多币种口径专业度 ↑
                           │
           Settle Up ●     │      ★ TripSplit
                           │      （锁定汇率 + 免费 + 免注册）
       Splitwise(Pro) ●    │
                           │   ● AA账本(GoDutch)
                           │
  ─────────────────────────┼───────────────────────── 参与门槛低 / 本土化 →
                           │
           Tricount ●      │   ● 百事AA记账
                           │
                           │        ● 微信小程序 AA
                           │   ● 随手记
                           │
```

> 定位图为定性判断，坐标根据上文资料和推断给出，仅供讨论。

---

## 5. Opportunities for TripSplit

| 机会点 | 竞品现状 | TripSplit 做法 | 对应 PRD |
| --- | --- | --- | --- |
| **汇率口径透明** | Splitwise 按换算时汇率回溯，且需付费 | 每笔支出锁定消费日汇率，支持手动覆盖（信用卡实际汇率），全程可追溯 | US-2.2 / 2.3 |
| **免注册参与** | 主流产品需要注册账号或下载 App | 链接加入、选身份即可使用；微信内可直接打开 | US-1.2 |
| **免费导出** | Tricount 移除导出；Settle Up 导出要付费 | CSV 免费导出 | US-4.1 |
| **高频记账不设限** | Splitwise 免费版限制每日笔数 | 不限笔数 | — |
| **AI 降低记账成本** | Splitwise 收据扫描需付费；国内产品宣传 AI 但体验未知 | v2：票据 OCR + 中文自然语言记账（"晚饭86欧，我和小王平摊"） | Roadmap v2 |
| **按行程付费** | Settle Up Group Premium 一次性付费 | 远期考虑"按行程解锁高级功能"，而不是按月订阅 | Roadmap v3 |

### 5.1 Threats

- **Splitwise 放宽免费限制，或者推出中文本地化**，会削弱差异点。应对：深耕"旅行 + 中文 + AI 记账"细分场景，形成体验壁垒。
- **微信或支付宝内置 AA 功能**（如群收款）覆盖了简单场景。应对：聚焦多币种、多付款人的复杂场景，并且与群收款互补（结算方案 → 跳转转账）。
- **低门槛同质化**：分账工具开发门槛低，复制容易。应对：通过汇率口径、AI 记账准确率和行程复购来构建体验和数据优势。

---

## 6. Sources

**Splitwise**
- [S1] ⚠️ Splitwise Pricing 2026: What Pro Costs and What Stays Free — https://getfinny.app/blog/splitwise-pricing-2026 （竞品博客，经搜索摘要获取；另见 [itvoice.in](https://www.itvoice.in/splitwise-has-introduced-restrictions-on-the-number-of-free-expenses-users-can-add) 关于免费笔数限制的报道）
- [S2] ⚠️ Android Central / Yahoo Tech: "The app Splitwise is the best hack to split group trip expenses in 2026" — https://androidcentral.com/apps-software/the-app-splitwise-is-the-best-hack-to-split-group-trip-expenses-in-2026 ；https://tech.yahoo.com/apps/articles/app-splitwise-best-hack-split-191737811.html
- [S3] ⚠️ How to change currency in Splitwise — https://robots.net/fintech/how-to-change-currency-in-splitwise/ ；用户投诉：https://www.complaintsboard.com/splitwise-b149630
- [S4] ⚠️ The Edge Malaysia: "Financial Hacks: Splitwise makes it easy to go Dutch" — https://theedgemalaysia.com/article/financial-hacks-splitwise-makes-it-easy-go-dutch
- [S5] ⚠️ How to import data from Splitwise to Excel — https://robots.net/fintech/how-to-import-data-from-splitwise-to-excel/

**Tricount**
- [T1] ✅ What happened with premium — https://tricount.com/en/what-happened-with-premium
- [T2] ✅ What happened with tricount Premium?（帮助中心）— https://help.tricount.com/articles/what-happened-with-tricount-premium
- [T3] ⚠️ European Alternatives: Tricount — https://european-alternatives.eu/product/tricount
- [T4] ✅ Automatically add all your expenses to Tricount — https://blog.tricount.com/en/automatically-add-expenses-by-card
- [T5] ✅ App Store（中国区）tricount — https://apps.apple.com/cn/app/tricount-%E5%88%86%E6%91%8A%E7%BE%A4%E7%BB%84%E8%B4%A6%E5%8D%95/id349866256
- [T6] ⚠️ onclarity: tricount insight — https://www.onclarity.com/leaderboard/insight/tricount ；Trustpilot — https://ca.trustpilot.com/review/tricount.com

**Settle Up**
- [U1] ⚠️ Settle Up 更新日志（APKMirror）— https://apkmirror.com/apk/step-up-labs/settle-up-group-expenses/settle-up-group-expenses-10-0-990-release ；App Store — https://apps.apple.com/app/id737534985
- [U2] ✅/⚠️ App Store 价格（美区、意大利区快照）— https://apps.apple.com/app/id737534985 ；https://apps.apple.com/it/app/settle-up-7/id737534985 ；功能汇总 — https://alternativeto.net/software/settle-up/about

**国内产品**
- [C1] ✅ App Store：百事AA记账 — https://apps.apple.com/cl/app/besttracker-%E7%99%BE%E4%BA%8Baa%E8%AE%B0%E8%B4%A6/id1536568727?l=es-MX
- [C2] ✅/⚠️ App Store：BestTracker - 百事AA记账 — https://apps.apple.com/vn/app/app/id1536568727 ；数英网文章 — https://www.digitaling.com/articles/409752.html
- [C3] ✅ App Store：AA账本 - 多货币AA制账本 — https://apps.apple.com/cn/app/aa%E8%B4%A6%E6%9C%AC-%E5%A4%9A%E8%B4%A7%E5%B8%81aa%E5%88%B6%E8%B4%A6%E6%9C%AC-%E8%BD%BB%E6%9D%BE%E7%AE%A1%E7%90%86%E5%A4%9A%E4%BA%BA%E8%AE%B0%E8%B4%A6/id1363868328
- [C4] ⚠️ 少数派：AA 账本评测 — https://sspai.com/post/26564
- [C5] ⚠️ 随手记理财社区：多人出行，如何机智的明算账？旅行AA账本来帮忙！— https://bbs.feidee.com/thread-2733124-1-1.html
- [C6] ⚠️ 第三方下载站：随手记介绍 — https://www.vkxiazai.com/app/8305.html
- [C7] ⚠️ 爱范儿：聚餐、旅游，不知道如何记录 AA 账单？这几款小程序让你成为记账好手 — https://www.ifanr.com/minapp/1211500

**结算算法参考**
- ⚠️ System Design: Design Splitwise（净余额 + 贪心匹配，贪心不保证全局最少笔数）— https://www.techinterview.org/post/3233474468/system-design-design-splitwise-expense-sharing-debt-simplification-group-balances-payment-integration-currency-conversion/

---

## 7. Next Steps

- [ ] 实际下载并试用上述 App，补充交互截图和"记一笔多币种支出"的步骤数对比
- [ ] 在应用商店（中国区、美区、英区）核对最新价格
- [ ] 抓取应用商店差评（关键词：汇率、currency、导出、export），量化痛点出现频次
