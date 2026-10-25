# Open Agricola i18n

Open Agricola 的独立语言仓库。游戏代码仓库只固定版本和消费语言包。

- `locales/<语言>.json`：每种语言唯一的译文维护入口；`$name` 是语言选择器中的名称。
- `packs/manifest.json`：可用语言、语言包文件名与 SHA-256。
- `packs/<语言>.<内容哈希>.json`：完整、独立的运行时语言包，包含 UI、行动、卡面、父母牌与提示文本。浏览器只加载所选语言。
- `scripts/build-language-packs.ts`：从英文底稿和当前语言生成完整包；缺失译文在构建时用英文补齐。
- `scripts/import-bga-card-translations.ts`：按英文来源核对 BGA 中文，并检查名称冲突、图标、资源数量、参数和卡牌引用。

```sh
pnpm install --frozen-lockfile
AGRICOLA_GAME_DIR=../open-agricola pnpm run build
pnpm test
AGRICOLA_GAME_DIR=../open-agricola pnpm exec tsx scripts/import-bga-card-translations.ts json/agricola.zh-cn.json
```

游戏目录需要先生成 `public/cards-manifest.json`。生成器只读取该纯数据投影，不执行游戏规则。
新增语言只需增加一个 `locales/<语言>.json`（包含 `$name`），重新构建并发布；游戏端更新 `i18n.ref`，无需增加语言分支。每个运行时包已经补齐英文，浏览器不再额外下载英文包。

工坊未发布内容的翻译属于用户卡牌数据；在预览、房间或回放的展示入口转换为同样的文本结构，不能覆盖全局官方包。

## BGA 来源记录

# BGA Agricola 语言包

从已登录浏览器打开的 [BGA 游戏桌](https://boardgamearena.com/tableview?table=932517202) 确认资源地址后，下载公开 CDN 上的语言包。

- `raw/`：BGA 原始 AMD JavaScript 文件。`lang_agricola.js` 包含英文基础词典和语言列表，其他文件分别对应各语言。
- `json/`：从原文件解析的词典，保留英文原文键、资源占位符及格式标记。
- `manifest.json`：来源 URL、下载时间、版本、文件大小、SHA-256、各语言条目数，以及相对基础词典缺少或增加的键。
- `download.log`：每个语言包的下载结果。
- `download.py`：可重复运行的下载程序。它从基础包读取全部语言声明，再下载每个语言包，不执行远端 JavaScript。

平台资源版本为 `261021-0945`，游戏桌加载的 Agricola 代码版本为 `261024-1403`。语言包 URL 使用页面当时的 `20261025` 查询版本。具体来源保存在清单中。

简体中文对应 `zh-cn`，繁体中文对应 `zh`。BGA 简体中文将 `Thresher` 译为“打谷者”。

文件下载完整不代表所有内容都已经翻译。各语言保留原始发布内容，未自动补齐缺少的键。与英文相同的值可能是未翻译文本，也可能是不需要翻译的内容。

阿拉伯语原文件包含 JavaScript 允许的反斜杠空格转义。导出 JSON 时按 JavaScript 语义将它解析为空格，原始文件保持不变。

重新下载此版本：

```bash
python3 ~/agricola-i18n/download.py
```

这些是 BGA 提供的翻译，来源和权利归属保留给原提供方。当前目录用于本地核对，未将内容合入 Open Agricola。
