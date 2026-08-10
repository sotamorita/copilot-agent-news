// タグ語彙（唯一の正）と正規化・自動抽出。
//
// 表記ゆれを防ぐため、タグは必ずこの VOCABULARY の `tag` に正規化される。
// - `aliases`: data-tags に書かれうる別表記。正規表記へ寄せる
// - `detect`  : 本文からの自動推定に使うパターン
// 語彙を増やすときはこの配列に追加し、CLAUDE.md の表も更新すること。

export const VOCABULARY = [
  // ---- 製品・技術 ----
  { tag: 'Copilot Studio', group: 'product', aliases: ['コパイロットスタジオ', 'MCS'], detect: /copilot\s*studio/i },
  { tag: 'Agent Builder', group: 'product', aliases: ['エージェントビルダー', 'エージェント ビルダー', 'Copilot Agent Builder'], detect: /agent\s*builder|エージェントビルダー/i },
  { tag: 'Copilot Cowork', group: 'product', aliases: ['Cowork', 'コワーク', 'M365 Copilot Cowork'], detect: /cowork/i },
  { tag: 'M365 Copilot', group: 'product', aliases: ['Microsoft 365 Copilot', 'Microsoft365 Copilot', 'M365Copilot', 'Microsoft 365'], detect: /microsoft\s*365\s*copilot|m365\s*copilot/i },
  { tag: 'Agent Framework', group: 'product', aliases: ['Microsoft Agent Framework', 'エージェントフレームワーク', 'MAF'], detect: /agent\s*framework/i },
  { tag: 'SharePoint', group: 'product', aliases: ['シェアポイント', 'SharePoint Online', 'SPO'], detect: /sharepoint/i },
  { tag: 'Teams', group: 'product', aliases: ['Microsoft Teams', 'チームズ'], detect: /\bteams\b|microsoft\s*teams/i },
  { tag: 'Power Platform', group: 'product', aliases: ['PowerPlatform', 'Power Automate', 'Power Apps', 'パワープラットフォーム'], detect: /power\s*(platform|automate|apps|fx)/i },
  { tag: 'Azure', group: 'product', aliases: ['Microsoft Azure', 'Azure AI Foundry', 'Foundry', 'AI Foundry'], detect: /\bazure\b|foundry/i },
  { tag: 'MCP', group: 'product', aliases: ['Model Context Protocol'], detect: /\bmcp\b|model\s*context\s*protocol/i },

  // ---- 機能・テーマ ----
  { tag: '自律型エージェント', group: 'theme', aliases: ['自律型', '自律エージェント', 'Autonomous Agent', 'オートノマス'], detect: /自律型|自律エージェント|autonomous/i },
  { tag: 'ワークフロー', group: 'theme', aliases: ['Workflow', 'ハーネス', 'Harness', 'オーケストレーション'], detect: /ワークフロー|workflow|ハーネス|harness/i },
  { tag: 'ガバナンス', group: 'theme', aliases: ['Governance', 'セキュリティ', '管理者', 'コンプライアンス', '統制'], detect: /ガバナンス|セキュリティ|コンプライアンス|管理者|admin\b|dlp/i },
  { tag: 'ライセンス', group: 'theme', aliases: ['License', '価格', '料金', 'Pricing', '課金', 'コスト'], detect: /ライセンス|価格|料金|pricing|課金|クレジット/i },
  { tag: '開発者向け', group: 'theme', aliases: ['開発者', 'Developer', 'SDK', 'API', 'OSS'], detect: /sdk|github|オープンソース|oss|api\b|開発者/i },

  // ---- 提供状況 ----
  { tag: 'ロードマップ', group: 'status', aliases: ['Roadmap', 'Microsoft 365 Roadmap'], detect: /ロードマップ|roadmap/i },
  { tag: 'プレビュー', group: 'status', aliases: ['Preview', 'パブリックプレビュー', 'Public Preview', 'プライベートプレビュー'], detect: /プレビュー|preview/i },
  { tag: '一般提供', group: 'status', aliases: ['GA', 'General Availability', 'Generally Available', '正式提供', '一般公開'], detect: /一般提供|generally available|general availability|\bga\b/i },

  // ---- 情報の種類 ----
  { tag: 'セミナー', group: 'kind', aliases: ['ハンズオン', '勉強会', 'ウェビナー', '研修', '講座', 'イベント', 'Webinar', 'Workshop'], detect: /セミナー|ハンズオン|勉強会|ウェビナー|研修|講座|workshop/i },
  { tag: '導入事例', group: 'kind', aliases: ['事例', '活用事例', 'ユーザー事例', 'Case Study'], detect: /導入事例|活用事例|事例|導入企業|case study/i },
  { tag: '調査レポート', group: 'kind', aliases: ['調査', 'レポート', '市場調査', 'Survey', 'Research'], detect: /調査|quadrant|survey|統計|市場|白書/i },
];

export const GROUP_LABELS = {
  product: '製品・技術',
  theme: '機能・テーマ',
  status: '提供状況',
  kind: '情報の種類',
};

/** 正規表記のタグ一覧（表示順の基準にもなる） */
export const CANONICAL_TAGS = VOCABULARY.map((v) => v.tag);

const ORDER = new Map(CANONICAL_TAGS.map((t, i) => [t, i]));

/** 比較用キー：大小文字・空白・区切り記号・全角半角の差を潰す */
function key(s) {
  return String(s)
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[\s　_\-–—・/]/g, '');
}

const ALIAS_MAP = new Map();
for (const entry of VOCABULARY) {
  ALIAS_MAP.set(key(entry.tag), entry.tag);
  for (const alias of entry.aliases) ALIAS_MAP.set(key(alias), entry.tag);
}

/** 語彙にない表記に対して、近そうな正規タグを1つ提案する */
function suggest(raw) {
  const k = key(raw);
  if (!k) return null;
  for (const [aliasKey, tag] of ALIAS_MAP) {
    // 短い別名（ga, mcp 等）が長い未知語に偶然含まれるのは誤提案なので除く
    if (aliasKey.includes(k) || (aliasKey.length >= 4 && k.includes(aliasKey))) return tag;
  }
  return null;
}

/**
 * 1つのタグ表記を正規表記へ寄せる。
 * @returns {{ tag: string } | { unknown: string, suggestion: string|null }}
 */
export function normalizeTag(raw) {
  const trimmed = String(raw ?? '').trim();
  if (!trimmed) return { unknown: '', suggestion: null };
  const hit = ALIAS_MAP.get(key(trimmed));
  return hit ? { tag: hit } : { unknown: trimmed, suggestion: suggest(trimmed) };
}

/** data-tags 属性（カンマ／読点区切り）をパースする。 */
export function parseTagAttr(value) {
  if (!value) return [];
  return String(value)
    .split(/[,、]/)
    .map((t) => t.trim())
    .filter(Boolean);
}

/** タイトル・要約・出典テキストからタグを推定する。 */
export function inferTags(...texts) {
  const haystack = texts.filter(Boolean).join(' ');
  return VOCABULARY.filter((v) => v.detect.test(haystack)).map((v) => v.tag);
}

/**
 * 明示タグ（data-tags）を正規化し、足りない分を本文からの推定で補う。
 * 並び順は必ず VOCABULARY の順にそろえ、同じ組み合わせなら常に同じ表示になるようにする。
 * @returns {{ tags: string[], unknown: {raw: string, suggestion: string|null}[] }}
 */
export function resolveTags(explicit, ...texts) {
  const tags = new Set();
  const unknown = [];

  for (const raw of parseTagAttr(explicit)) {
    const result = normalizeTag(raw);
    if (result.tag) tags.add(result.tag);
    else if (result.unknown) unknown.push({ raw: result.unknown, suggestion: result.suggestion });
  }

  for (const tag of inferTags(...texts)) tags.add(tag);

  const sorted = [...tags].sort((a, b) => ORDER.get(a) - ORDER.get(b));
  return { tags: sorted.slice(0, 6), unknown };
}

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
