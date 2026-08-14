# CLAUDE.md（Copilotエージェントニュース フォルダ用）

## 目的
Agent Builder / Copilot Studio / Copilot Cowork 関連の最新ニュースを
定期収集・HTML化して蓄積するフォルダ。

## 運用ルール
- 新規ファイルは `news/yyyy/mm/` 配下に格納する
- ファイル名は `Copilotエージェントニュース_yyyymmdd_hhmm.html` 形式
- 対象期間は過去24時間以内を最優先。情報が少ない場合のみ直近3〜7日まで対象を広げてよい
  （拡大した場合はその旨を注記欄に明記する）
- 重複排除は**直近1週間分**の既存ファイルすべてを確認し、重複するニュースは載せない
  （新規作成前に同月フォルダ内の直近1週間分のファイルを確認。月をまたぐ場合は前月分も確認し、差分のみ掲載）
- 情報源は以下を**毎回もれなく**確認したうえで網羅的に収集する。海外ソースを優先しつつ、
  出力は必ず日本語に翻訳・要約する
  - **公式一次情報（必須チェック項目）**：
    - Microsoft 365 Message Center（`mc.merill.net` 等のアーカイブサイトでキーワード検索し代替可）
    - Microsoft Copilot Studio Blog／Microsoft 365 Copilot Blog（Tech Community）
    - Microsoft Learn の "What's new" 系ページ（Copilot Studio, M365 Copilot Release Notes,
      Power Platform Release Plan, Copilot Studio guidance hub 等）
    - Microsoft 365 Roadmap（`microsoft.com/microsoft-365/roadmap`）
    - GitHub `microsoft/agent-framework` の Releases
    - 上記は個別にURLへアクセスし、検索エンジン経由のヒットだけに頼らない
  - **SNS（X／LinkedIn／Reddit等）— 意識的に検索すること**：
    - 通常のWeb検索だけでなく、`site:x.com`／`site:twitter.com`／`site:linkedin.com` を付けたクエリや
      「Copilot Studio X post」のようにSNS名を明示したクエリを複数パターン試す
    - 主要アカウントの投稿を優先的に確認する（例：@MSPowerPlat、@Microsoft365、Satya Nadella、
      Charles Lamanna など製品責任者・公式アカウント）
    - Reddit は r/MicrosoftCopilotStudio、r/PowerPlatform、r/microsoft365 等の関連サブレディットを確認する
    - SNSで有効な投稿が見つからなかった場合も、注記欄に「SNS検索を実施したが該当なし」と明記する
      （検索を省略した扱いにしない）
- 各ニュース要約は1〜2行程度に留め、記載順は「出典・日時 → タイトル → 要約 → 元記事リンク」。
  詳細は元ソースリンクで確認する前提とする
- リンク切れ・古いURLは掲載しない。検索時点で有効な最新URLのみ使用する
- **各記事カードには `data-tags` 属性でタグを付ける**（後述「タグ仕様」）
- ニュースHTMLを追加したら `git add` → `commit` → `push`。
  GitHub Actions が自動でサイトを再ビルドして GitHub Pages へ公開する（後述「公開サイト」）

## フォルダ構成
```
copilot-agent-news/
  news/2026/08/Copilotエージェントニュース_20260810_0930.html  ← ニュース本体（原本）
  site/                 ← サイト生成スクリプト（build.mjs / lib / assets）
  .github/workflows/    ← GitHub Pages への自動デプロイ
  _site/                ← ビルド成果物。gitignore 済み・直接編集しない
```

---

# タグ仕様

## 付け方
記事カードの `<div class="card">` に `data-tags` 属性を付与する。カンマ区切り、**3〜5個**が目安。

```html
<div class="card" data-tags="Copilot Studio,自律型エージェント,プレビュー">
```

- `data-tags` を書き忘れても、サイト生成時にタイトル・要約からキーワード自動推定される。
  ただし精度が落ちるので必ず明示すること
- 明示タグと自動推定タグはマージされる。表示は最大6個、並び順は下表の順に自動でそろう

## 表記ゆれは自動で正規化される
**タグの正は `site/lib/tags.mjs` の `VOCABULARY` のみ**。`data-tags` に書いた文字列は
下表の「正規表記」に寄せてから使われるので、サイト上に表記ゆれは出ない。

- 大小文字・スペース・全角半角・ハイフンの違いは無視される
  （`copilot studio` / `CopilotStudio` / `Ｃｏｐｉｌｏｔ Ｓｔｕｄｉｏ` → すべて `Copilot Studio`）
- 別名は正規表記に寄せられる（`Cowork` → `Copilot Cowork`、`GA` → `一般提供`、`ハンズオン` → `セミナー`）
- **語彙にない表記は不採用**。ビルド時に警告が出るので、修正するか語彙に追加する

```bash
node site/build.mjs --tags     # 正規表記と別名の一覧を表示
node site/build.mjs --strict   # 未登録タグがあれば非ゼロ終了（CIでは警告扱い）
```

## タグ語彙（この21種類から選ぶ。増やす場合は `site/lib/tags.mjs` の `VOCABULARY` にも追加）
| 種類 | 正規表記（← 主な別名） |
|---|---|
| 製品・技術 | `Copilot Studio` / `Agent Builder`←エージェントビルダー / `Copilot Cowork`←Cowork / `M365 Copilot`←Microsoft 365 Copilot / `Agent Framework` / `SharePoint` / `Teams` / `Power Platform`←Power Automate, Power Apps / `Azure`←Foundry / `MCP` |
| 機能・テーマ | `自律型エージェント`←自律型 / `ワークフロー`←ハーネス / `ガバナンス`←セキュリティ, 管理者 / `ライセンス`←価格, 料金, 課金 / `開発者向け`←SDK, API, OSS |
| 提供状況 | `ロードマップ`←Roadmap / `プレビュー`←Preview / `一般提供`←GA |
| 情報の種類 | `セミナー`←ハンズオン, 勉強会, ウェビナー, 研修 / `導入事例`←事例 / `調査レポート`←調査 |

カテゴリ（新機能／事例／イベント）はセクション見出しから自動判定されるため、タグに重ねて書かなくてよい。

---

# 公開サイト

`site/build.mjs` が `news/yyyy/mm/*.html` を読んで `_site/` に一覧サイトを生成する（依存パッケージなし）。

```bash
node site/build.mjs                       # ビルド
cd _site && python3 -m http.server 8000   # ローカル確認
```

生成物：

| ファイル | 内容 |
|---|---|
| `_site/index.html` | 全記事の一覧。全文検索＋カテゴリ／タグ絞り込み（JSはビルド不要の素のJS） |
| `_site/archive.html` | 年月別のレポート一覧 |
| `_site/news/yyyy/mm/yyyymmdd-hhmm.html` | 各レポート。共通CSSとナビを注入して再出力（原本は変更しない） |
| `_site/search-index.json` | 記事データのJSON |

- レポートは原本をそのまま複製せず、独自 `<style>` を外して `assets/site.css` に差し替える。
  これにより過去の異なるデザインのレポートも本デザインシステムに統一される
- スタイルを直す場合は各ニュースHTMLではなく `site/assets/site.css` を編集する
- `main` への push で `.github/workflows/deploy.yml` が実行され、Pages へ自動デプロイされる

---

# デザインシステム（HTML出力共通仕様）

## コンセプト
Microsoft製品カラーの模倣ではなく「専門ニュースメディアの紙面」を模す。
信頼性・一次情報への導線・スキャン読み（見出しだけで要点が掴める）を最優先。

---

## 1. タイポグラフィ（最重要）

### 方針：ゴシック体（サンセリフ）に統一
見出し・本文・メタ情報すべてを**サンセリフで統一**する。明朝体は使用しない
（明朝とゴシックの混植は「新聞らしさ」ではなく「フォント選定ミス」に見えるため廃止）。
ウェイトの強弱のみで階層をつける。

### フォントスタック
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Noto+Sans+JP:wght@400;500;700;900&display=swap" rel="stylesheet">
```

```css
/* 全要素で共通使用。和欧混植：欧文Inter／和文Noto Sans JP */
--font-sans: "Inter", "Noto Sans JP", "Hiragino Kaku Gothic ProN",
             "Yu Gothic Medium", "Meiryo", sans-serif;

/* 数字・日付：桁揃えのため等幅数字 */
--font-num: "Inter", "SF Mono", "Roboto Mono", monospace;

/* 全要素にこれを適用し、フォント指定のブレをなくす */
* { font-family: var(--font-sans); }
```

### 日本語組版の必須指定
```css
body {
  font-feature-settings: "palt" 1;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  letter-spacing: 0.02em;
  line-break: strict;
  overflow-wrap: anywhere;
  word-break: normal;
}
h1, h2, h3 { letter-spacing: -0.01em; font-feature-settings: "palt" 1; }
.meta, .date, time { font-variant-numeric: tabular-nums; font-family: var(--font-num); }
```

### 階層とウェイト（すべてsansで統一）
| 要素 | サイズ | ウェイト | 行間 |
|---|---|---|---|
| サイトタイトル(h1) | 26px | **800** | 1.35 |
| セクション見出し(h2) | 15px | **700** | 1.4 / 字間0.08em / 英大文字ラベル併記 |
| 記事タイトル(h3) | 17px | **700** | 1.55 |
| 本文・要約 | 14.5px | **400** | 1.9 |
| メタ情報（タグ・日付） | 11.5px | **600** | 1.5 |
| カテゴリタグ文字 | 11px | **700** | 1.2 / 字間0.04em |

- 使用ウェイトは **400 / 600 / 700 / 800 の4段のみ**。500など中途半端な太さは使わない
- 和文本文の行間は1.8〜2.0を厳守
- 1行の文字数は全角40字程度（`max-width: 720px`）

---

## 2. カラーパレット
| 用途 | コード |
|---|---|
| 背景（本体） | `#F7F6F3` |
| 背景（カード） | `#FFFFFF` |
| メインテキスト | `#16181D` |
| サブ・メタ | `#6E7178` |
| 罫線 | `#E3E1DC` |
| アクセント（紺） | `#0F2A4A` |
| カテゴリ：新機能 | `#0F2A4A`（紺） |
| カテゴリ：事例 | `#1E5C3A`（深緑） |
| カテゴリ：イベント | `#8A4B08`（琥珀） |
| 注記帯 | 背景 `#FDF8EC` / 文字 `#7A4508` |

※ Microsoft公式ブランドカラー（`#0078D4` 等）は使用しない。

---

## 3. レイアウト原則（カード余白を明確化）

### カード内余白（必須・厳守）
```css
.card {
  padding: 24px 28px;        /* 上下24px・左右28px。狭めると窮屈に見えるため厳守 */
  border: 1px solid var(--border);
  border-left: 3px solid var(--accent);
  border-radius: 6px;
  background: #FFFFFF;
}
.card .meta { margin-bottom: 10px; }     /* タグ・日付とタイトルの間 */
.card h3    { margin: 0 0 12px; }        /* タイトルと本文の間 */
.card p     { margin: 0 0 16px; }        /* 本文とリンクボタンの間 */
```
- カード同士の間隔（縦）：**20px以上**
- カード内の要素間（タグ→タイトル→本文→リンク）は必ず上記の余白を空け、詰めない
- カテゴリタグ（アウトラインバッジ）とメタ日時の間は `8px` 空ける

### その他レイアウト原則
- コンテンツ幅は `max-width: 720px`、中央寄せ
- 影（box-shadow）は使わず罫線のみで分離
- カテゴリタグは塗りバッジではなくアウトライン枠＋英字小文字ラベル
- 記事タイトルの**上**に出典・日時を小さく配置
- 見出しはホバー時のみ下線。過度なアニメーションは付けない
- 外部リンクは「元記事を読む ↗」で統一
- ヘッダーはグラデーションを使わず、単色 or 白背景＋下罫線

---

## 4. 全ソース一覧セクションの表示仕様（末尾配置）

### マークアップ
- ネイティブの `<details>` / `<summary>` を使用（JS不使用）
- 初期状態は閉じた状態
- `<summary>` の文言例：`▸ 今回の検索でヒットした全ソース一覧（42件）`
  （この件数は本文掲載数ではなく、検索でヒットした全URL数を指す）

### スタイル
```css
details.sources {
  border: 1px solid var(--border);
  border-radius: 4px;
  background: #FFFFFF;
  margin-top: 48px;
  font-family: var(--font-sans);   /* ここもゴシックで統一 */
}
details.sources summary {
  cursor: pointer;
  padding: 14px 18px;
  font-size: 13.5px;
  font-weight: 700;
  color: var(--accent);
  list-style: none;
  user-select: none;
}
details.sources summary::-webkit-details-marker { display: none; }
details.sources[open] summary { border-bottom: 1px solid var(--border); }
details.sources .group-title {
  font-size: 11.5px; font-weight: 700; letter-spacing: 0.08em;
  color: var(--sub); padding: 16px 18px 6px;
}
details.sources li { font-size: 12.5px; line-height: 1.7; font-weight: 400; }
details.sources .date { color: var(--sub); font-variant-numeric: tabular-nums; }
details.sources a { color: var(--accent); word-break: break-all; }
```

### 表示ルール
- 対象は本文採用済みの記事に限らず、**リサーチ過程で実行した検索でヒットした全URL**
  （明らかに無関係なものを除く）
- 種類ごとに小見出し（英字ラベル＋和文）で区切り、小見出しにその区分の件数を記載する
  （例：`公式情報 — OFFICIAL（4件）`）。`<summary>` には総件数を記載する
- 各区分内は公開日時の新しい順（降順）に並べる
- 各行は「`日付` ｜ `媒体名` ｜ タイトル（リンク）」の1行構成
- 本文採用済みの項目には小さなマークを付ける
- URLは全文表示せずタイトルにリンクを張る