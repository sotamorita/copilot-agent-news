// ページテンプレート。CLAUDE.md のデザインシステムに沿ったマークアップを組み立てる。

import { CATEGORIES } from './tags.mjs';
import { stripTags } from './parse.mjs';

export function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const FONT_LINKS = `<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Noto+Sans+JP:wght@400;500;700;900&display=swap" rel="stylesheet">`;

/** ルートからの相対プレフィックス（例: 深さ3 → "../../../"） */
export function prefix(depth) {
  return depth === 0 ? '' : '../'.repeat(depth);
}

/** トップページでは現在地を示すため非リンクのテキストに、それ以外のページではホームへのリンクにする。 */
export function nav(depth, active) {
  const p = prefix(depth);
  const brand =
    active === 'index'
      ? `<span class="brand" aria-current="page">Copilotエージェントニュース</span>`
      : `<a class="brand" href="${p}index.html">Copilotエージェントニュース</a>`;
  return `<nav class="site-nav">
  <div class="inner">
    ${brand}
  </div>
</nav>`;
}

export function layout({ title, description, depth = 0, active = '', body, script = false }) {
  const p = prefix(depth);
  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
${FONT_LINKS}
<link rel="stylesheet" href="${p}assets/site.css">
</head>
<body>
${nav(depth, active)}
${body}
${script ? `<script src="${p}assets/site.js"></script>` : ''}
</body>
</html>
`;
}

export function footer(generatedAt, depth = 0) {
  const p = prefix(depth);
  return `<footer>
  Agent Builder / Copilot Studio / Copilot Cowork の最新動向を定期収集しています。<br>
  <a href="${p}index.html">トップ</a>｜<a href="${p}archive.html">アーカイブ</a>｜サイト更新: ${esc(generatedAt)}<br>
  各リンクは掲載時点で有効性を確認していますが、必ず遷移先で最新情報をご確認ください。
</footer>`;
}

function tagChipsRow(tags, depth) {
  if (!tags.length) return '';
  const p = prefix(depth);
  const chips = tags
    .map(
      (t) =>
        `<a class="tag-chip" href="${p}index.html?tag=${encodeURIComponent(t)}">${esc(t)}</a>`,
    )
    .join('');
  return `<div class="tag-row">${chips}</div>`;
}

/** 一覧ページの1記事。検索・絞り込み用のデータ属性を持たせる。 */
function newsCard(item, depth) {
  const p = prefix(depth);
  const cat = CATEGORIES[item.category] ?? CATEGORIES.other;
  const badgeCls = cat.cls === 'feature' || cat.cls === 'other' ? '' : ` ${cat.cls}`;
  const haystack = [
    item.title,
    item.summary,
    item.source,
    item.sourceMeta,
    item.tags.join(' '),
    cat.label,
    item.reportLabel,
  ]
    .join(' ')
    .toLowerCase();

  const metaTail = [item.source && item.sourceMeta ? item.sourceMeta : item.sourceMeta || '']
    .filter(Boolean)
    .join('');

  return `      <article class="card ${cat.cls}"
        data-category="${esc(item.category)}"
        data-tags="${esc(item.tags.join('|'))}"
        data-search="${esc(haystack)}">
        <div class="meta">${item.source ? `<span class="badge${badgeCls}">${esc(item.source)}</span>` : ''}${esc(metaTail)}</div>
        <h3><a href="${esc(item.url)}" target="_blank" rel="noopener" data-highlight>${esc(item.title)}</a></h3>
        <p data-highlight>${esc(item.summary)}</p>
        ${tagChipsRow(item.tags, depth)}
        <div class="link-row">
          <a href="${esc(item.url)}" target="_blank" rel="noopener">元記事を読む ↗</a>
          ｜<a href="${p}news/${esc(item.reportPath)}">掲載レポート（${esc(item.reportLabel)}）</a>
        </div>
      </article>`;
}

function renderHeroShortcuts(latest, reportCount) {
  if (!latest) return '';
  return `<div class="hero-shortcuts">
    <a class="hero-card primary" href="news/${esc(latest.path)}">
      <div class="hero-label">最新レポート ｜ LATEST</div>
      <div class="hero-title">${esc(latest.title)}</div>
      <div class="hero-meta">${esc(latest.labelJa)}更新・掲載 ${latest.items.length}件</div>
      <div class="hero-cta">最新のニュースを読む ↗</div>
    </a>
    <a class="hero-card secondary" href="archive.html">
      <div class="hero-label">アーカイブ ｜ ARCHIVE</div>
      <div class="hero-title">過去のレポート一覧</div>
      <div class="hero-meta">これまでのレポート ${reportCount}本を日付ごとに確認できます</div>
      <div class="hero-cta">アーカイブを見る ↗</div>
    </a>
  </div>`;
}

export function renderIndex({ items, reports, tags, generatedAt }) {
  const latest = reports[0];
  const catChips = Object.entries(CATEGORIES)
    .filter(([key]) => items.some((i) => i.category === key))
    .map(
      ([key, c]) =>
        `<button type="button" class="chip cat-${c.cls}" data-kind="cat" data-value="${key}" aria-pressed="false">${esc(c.label)}</button>`,
    )
    .join('');

  const tagChips = tags
    .map(
      ([tag, count]) =>
        `<button type="button" class="chip" data-kind="tag" data-value="${esc(tag)}" aria-pressed="false">${esc(tag)} <span class="count">${count}</span></button>`,
    )
    .join('');

  const body = `<header>
  <div class="inner">
    <h1>Copilotエージェントニュース</h1>
    <p class="lead">Agent Builder / Copilot Studio / Copilot Cowork 最新動向｜最終更新 ${esc(latest ? latest.labelJa : generatedAt)}・全${items.length}件</p>
  </div>
</header>

<div class="container">

  ${renderHeroShortcuts(latest, reports.length)}

  <div class="controls">
    <label for="q">記事を検索</label>
    <input type="search" id="q" placeholder="キーワード（例: Copilot Studio、セミナー、プレビュー）" autocomplete="off">

    <div class="filter-group">
      <div class="filter-label">Category</div>
      <div class="chips">${catChips}</div>
    </div>

    <div class="filter-group">
      <div class="filter-label">Tags</div>
      <div class="chips">${tagChips}</div>
    </div>
  </div>

  <div class="result-count" id="result-count">全 ${items.length} 件から検索できます</div>

  <div class="placeholder" id="hint">検索キーワードを入力するか、上のカテゴリ・タグを選ぶと記事が表示されます。</div>

  <div id="news-list">
${items.map((i) => newsCard(i, 0)).join('\n')}
  </div>

  <div class="placeholder" id="empty" hidden>該当するニュースが見つかりませんでした。キーワードや絞り込みを変えてお試しください。</div>

</div>

${footer(generatedAt, 0)}`;

  return layout({
    title: 'Copilotエージェントニュース｜Agent Builder / Copilot Studio / Copilot Cowork 最新動向',
    description:
      'Agent Builder・Copilot Studio・Copilot Cowork の最新ニュースの一覧と検索。定期収集したレポートをタグ・カテゴリで絞り込めます。',
    depth: 0,
    active: 'index',
    body,
    script: true,
  });
}

export function renderArchive({ reports, generatedAt, totalItems }) {
  const byMonth = new Map();
  for (const r of reports) {
    const key = `${r.year}-${r.month}`;
    if (!byMonth.has(key)) byMonth.set(key, []);
    byMonth.get(key).push(r);
  }

  const blocks = [...byMonth.entries()]
    .map(([key, list]) => {
      const [y, mo] = key.split('-');
      const cards = list
        .map((r) => {
          const heads = r.items
            .slice(0, 3)
            .map((i) => `<li>${esc(i.title)}</li>`)
            .join('');
          const sources = r.sourcesCount ? `｜検索ヒット ${r.sourcesCount}件` : '';
          return `    <div class="report-card">
      <div class="meta">${esc(r.labelJa)}｜掲載 ${r.items.length}件${sources}</div>
      <h3><a href="news/${esc(r.path)}">${esc(r.title)}</a></h3>
      <ul>${heads}</ul>
      <div class="link-row"><a href="news/${esc(r.path)}">このレポートを読む ↗</a></div>
    </div>`;
        })
        .join('\n');

      return `  <section class="month-block">
    <h2>${y}年${Number(mo)}月<span class="en">${list.length} reports</span></h2>
${cards}
  </section>`;
    })
    .join('\n');

  const body = `<header>
  <div class="inner">
    <h1>アーカイブ</h1>
    <p class="lead">これまでに作成したニュースレポート ${reports.length}本・掲載記事 ${totalItems}件</p>
  </div>
</header>

<div class="container">
${blocks || '<div class="empty">まだレポートがありません。</div>'}
</div>

${footer(generatedAt, 0)}`;

  return layout({
    title: 'アーカイブ｜Copilotエージェントニュース',
    description: '過去に作成したCopilotエージェントニュースレポートの一覧。',
    depth: 0,
    active: 'archive',
    body,
  });
}

/**
 * 元レポートHTMLを、共通スタイル＋サイトナビ付きに書き換える。
 * 元ファイル自体は変更せず、公開ディレクトリへのコピー時にのみ適用する。
 */
export function rewriteReport(html, { depth, items }) {
  const p = prefix(depth);
  let out = html;

  // 各世代でばらつく独自スタイルを外し、共通スタイルに寄せる
  out = out.replace(/<style[\s\S]*?<\/style>/gi, '');
  const fonts = /fonts\.googleapis\.com/i.test(out) ? '' : `${FONT_LINKS}\n`;
  out = out.replace(
    /<\/head>/i,
    `${fonts}<link rel="stylesheet" href="${p}assets/site.css">\n</head>`,
  );

  // 上部にサイトナビを差し込む
  out = out.replace(/<body[^>]*>/i, (m) => `${m}\n${nav(depth, '')}`);

  // フッターに一覧への導線を追加
  out = out.replace(
    /<\/footer>/i,
    `<br><a href="${p}index.html">ニュース一覧へ戻る</a>｜<a href="${p}archive.html">アーカイブ</a>\n</footer>`,
  );

  // カードにタグ行を差し込む（タイトル一致で対応付け）
  const tagByTitle = new Map(items.map((i) => [i.title, i.tags]));
  out = out.replace(
    /(<h3\b[^>]*>[\s\S]*?<\/h3>)([\s\S]*?)(<div\b[^>]*class="[^"]*\blink-row\b[^"]*"[^>]*>)/gi,
    (match, h3, middle, linkRow) => {
      const tags = tagByTitle.get(stripTags(h3));
      if (!tags || !tags.length) return match;
      return `${h3}${middle}${tagChipsRow(tags, depth)}\n      ${linkRow}`;
    },
  );

  return out;
}
