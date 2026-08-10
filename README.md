# Copilotエージェントニュース

Agent Builder / Copilot Studio / Copilot Cowork 関連ニュースを定期収集し、
HTMLレポートとして蓄積・公開するリポジトリです。

**公開サイト: https://sotamorita.github.io/copilot-agent-news/**

## 構成

```
2026/08/Copilotエージェントニュース_yyyymmdd_hhmm.html  ニュースレポート（原本）
site/build.mjs                                      サイト生成スクリプト
site/lib/                                           パーサ・タグ辞書・テンプレート
site/assets/                                        共通CSS / 検索JS
.github/workflows/deploy.yml                        Pages への自動デプロイ
```

## サイトの生成

依存パッケージはありません。Node.js 18以降で動きます。

```bash
node site/build.mjs
```

`_site/` に以下が出力されます。

- `index.html` — 全記事一覧（全文検索＋カテゴリ・タグ絞り込み）
- `archive.html` — 年月別レポート一覧
- `news/yyyy/mm/yyyymmdd-hhmm.html` — 各レポート（共通デザインを適用して再出力）
- `search-index.json` — 記事データ

ローカル確認:

```bash
cd _site && python3 -m http.server 8000
```

## 更新フロー

1. 定期実行でニュースHTMLが `yyyy/mm/` に追加される
2. `main` に push する
3. GitHub Actions がサイトを再ビルドし、GitHub Pages へ公開する

デザイン仕様・タグ仕様は [CLAUDE.md](CLAUDE.md) を参照してください。
