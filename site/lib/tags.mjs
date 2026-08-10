// タグ語彙とキーワード自動抽出。
// 今後生成されるニュースHTMLは card に data-tags="..." を持つ想定だが、
// 過去ファイル（属性なし）でも本文からタグを推定できるようにする。

// [表示タグ, 判定用パターン...] の順。上から評価し、重複はまとめる。
const RULES = [
  ['Copilot Studio', /copilot\s*studio/i],
  ['Agent Builder', /agent\s*builder|エージェントビルダー/i],
  ['Copilot Cowork', /cowork/i],
  ['Agent Framework', /agent\s*framework/i],
  ['M365 Copilot', /microsoft\s*365\s*copilot|m365\s*copilot/i],
  ['SharePoint', /sharepoint/i],
  ['Teams', /\bteams\b/i],
  ['Power Platform', /power\s*(platform|automate|apps|fx)/i],
  ['Azure', /\bazure\b|foundry/i],
  ['MCP', /\bmcp\b/i],
  ['自律型エージェント', /自律型|autonomous/i],
  ['ワークフロー', /ワークフロー|workflow|ハーネス|harness/i],
  ['ガバナンス', /ガバナンス|セキュリティ|コンプライアンス|管理者|admin\b|dlp/i],
  ['ライセンス', /ライセンス|価格|料金|pricing|課金|クレジット/i],
  ['ロードマップ', /ロードマップ|roadmap/i],
  ['プレビュー', /プレビュー|preview/i],
  ['一般提供', /一般提供|generally available|\bga\b/i],
  ['セミナー', /セミナー|ハンズオン|勉強会|ウェビナー|研修|講座|workshop/i],
  ['導入事例', /導入事例|活用事例|事例|導入企業|case study/i],
  ['調査レポート', /調査|レポート|quadrant|survey|統計|市場/i],
  ['開発者向け', /sdk|github|オープンソース|oss|api\b|開発者/i],
];

// カテゴリ（セクション）→ 正規化カテゴリ。CLAUDE.md のカテゴリ色に対応。
export const CATEGORIES = {
  feature: { label: '新機能', en: 'Product Updates', cls: 'feature' },
  case: { label: '事例', en: 'Case & Analysis', cls: 'case' },
  event: { label: 'イベント', en: 'Japan Events', cls: 'event' },
  other: { label: 'その他', en: 'Other', cls: 'other' },
};

export function categoryOf(sectionId, headingText) {
  const s = `${sectionId} ${headingText}`;
  if (/japan|イベント|セミナー|勉強会|講座/i.test(s)) return 'event';
  if (/enterprise|sns|事例|活用|評価|コミュニティ|調査/i.test(s)) return 'case';
  if (/update|機能|リリース|アップデート|動向/i.test(s)) return 'feature';
  return 'other';
}

/** data-tags 属性（カンマ／読点区切り）をパースする。 */
export function parseTagAttr(value) {
  if (!value) return [];
  return value
    .split(/[,、]/)
    .map((t) => t.trim())
    .filter(Boolean);
}

/** タイトル・要約・出典テキストからタグを推定する。 */
export function inferTags(...texts) {
  const haystack = texts.filter(Boolean).join(' ');
  const found = [];
  for (const [tag, re] of RULES) {
    if (re.test(haystack) && !found.includes(tag)) found.push(tag);
  }
  return found;
}

/**
 * 明示タグを優先し、足りなければ推定タグで補う。
 * 明示タグがある場合も、主要プロダクト名は推定分をマージして検索性を確保する。
 */
export function resolveTags(explicit, ...texts) {
  const ex = parseTagAttr(explicit);
  const inferred = inferTags(...texts);
  const merged = [...ex];
  for (const t of inferred) {
    if (!merged.some((m) => m.toLowerCase() === t.toLowerCase())) merged.push(t);
  }
  return merged.slice(0, 6);
}
