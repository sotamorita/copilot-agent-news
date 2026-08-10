// 既存のニュースHTML（yyyy/mm/Copilotエージェントニュース_yyyymmdd_hhmm.html）から
// 記事カードを抽出する。生成元のマークアップは世代によって多少ぶれるため、
// クラス名は .card / .meta / h3 > a / p / .link-row を軸に緩めに拾う。

import { categoryOf, resolveTags } from './tags.mjs';

const ENTITIES = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', yen: '¥', hellip: '…',
};

export function decodeEntities(s) {
  return s
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&([a-z]+);/gi, (m, name) => ENTITIES[name.toLowerCase()] ?? m);
}

export function stripTags(html) {
  return decodeEntities(String(html).replace(/<[^>]*>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
}

/** 開始タグ位置から対応する閉じタグまでを、ネストを数えて切り出す。 */
function sliceElement(html, tagName, startIdx) {
  const re = new RegExp(`</?${tagName}\\b[^>]*>`, 'gi');
  re.lastIndex = startIdx;
  let depth = 0;
  let m;
  while ((m = re.exec(html))) {
    if (m[0][1] === '/') {
      depth -= 1;
      if (depth === 0) return { html: html.slice(startIdx, re.lastIndex), end: re.lastIndex };
    } else {
      depth += 1;
    }
  }
  return null;
}

function attr(tagHtml, name) {
  const m = tagHtml.match(new RegExp(`${name}\\s*=\\s*"([^"]*)"`, 'i'));
  return m ? decodeEntities(m[1]) : '';
}

/** ファイル名から日時を取り出す。例: Copilotエージェントニュース_20260810_1245.html */
export function parseFileName(base) {
  const m = base.match(/(\d{4})(\d{2})(\d{2})[_-](\d{2})(\d{2})/);
  if (!m) return null;
  const [, y, mo, d, h, mi] = m;
  return {
    slug: `${y}${mo}${d}-${h}${mi}`,
    year: y,
    month: mo,
    day: d,
    date: `${y}-${mo}-${d}`,
    time: `${h}:${mi}`,
    iso: `${y}-${mo}-${d}T${h}:${mi}:00+09:00`,
    sortKey: `${y}${mo}${d}${h}${mi}`,
    labelJa: `${y}年${Number(mo)}月${Number(d)}日 ${h}:${mi}`,
  };
}

function cardsIn(html) {
  const out = [];
  const openRe = /<div\b[^>]*class="[^"]*\bcard\b[^"]*"[^>]*>/gi;
  let m;
  while ((m = openRe.exec(html))) {
    const block = sliceElement(html, 'div', m.index);
    if (!block) continue;
    out.push({ openTag: m[0], html: block.html });
    openRe.lastIndex = block.end;
  }
  return out;
}

function parseCard({ openTag, html }) {
  const metaHtml = html.match(/<div\b[^>]*class="[^"]*\bmeta\b[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
  const badgeHtml = metaHtml
    ? metaHtml[1].match(/<span\b[^>]*class="[^"]*\b(?:badge|tag)\b[^"]*"[^>]*>([\s\S]*?)<\/span>/i)
    : null;

  const source = badgeHtml ? stripTags(badgeHtml[1]) : '';
  const metaRest = metaHtml
    ? stripTags(metaHtml[1].replace(/<span\b[^>]*class="[^"]*\b(?:badge|tag)\b[^"]*"[^>]*>[\s\S]*?<\/span>/i, ''))
    : '';

  const h3 = html.match(/<h3\b[^>]*>([\s\S]*?)<\/h3>/i);
  if (!h3) return null;
  const linkInH3 = h3[1].match(/<a\b[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/i);
  const title = stripTags(linkInH3 ? linkInH3[2] : h3[1]);
  if (!title) return null;

  const paragraphs = [...html.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)].map((p) => stripTags(p[1]));
  const summary = paragraphs.find(Boolean) ?? '';

  const linkRow = html.match(/<div\b[^>]*class="[^"]*\blink-row\b[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
  const linkRowHref = linkRow ? linkRow[1].match(/href="([^"]*)"/i) : null;
  const url = linkInH3 ? linkInH3[1] : linkRowHref ? linkRowHref[1] : '';

  return {
    source,
    sourceMeta: metaRest,
    title,
    url: decodeEntities(url),
    summary,
    tagAttr: attr(openTag, 'data-tags'),
    variant: (attr(openTag, 'class').match(/\b(event|case|enterprise|jp|sns)\b/) || [])[1] || '',
  };
}

/** 1ファイルを読み、レポート情報＋記事配列を返す。 */
export function parseReport(html, meta) {
  const titleMatch = html.match(/<title>([\s\S]*?)<\/title>/i);
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  const body = bodyMatch ? bodyMatch[1] : html;

  const noticeMatch = body.match(
    /<div\b[^>]*class="[^"]*\b(?:notice|prev-note|disclaimer)\b[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
  );
  const sourcesCount = (body.match(/全ソース一覧（\s*(\d+)\s*件/) || [])[1];

  const items = [];
  const seen = new Set();

  const sectionRe = /<section\b[^>]*class="[^"]*\bcategory\b[^"]*"[^>]*>/gi;
  let m;
  while ((m = sectionRe.exec(body))) {
    const block = sliceElement(body, 'section', m.index);
    if (!block) continue;
    sectionRe.lastIndex = block.end;

    const sectionId = attr(m[0], 'id');
    const h2 = block.html.match(/<h2\b[^>]*>([\s\S]*?)<\/h2>/i);
    const headingRaw = h2 ? h2[1] : '';
    const heading = stripTags(headingRaw.replace(/<span\b[^>]*class="[^"]*\ben\b[^"]*"[^>]*>[\s\S]*?<\/span>/i, ''));
    const category = categoryOf(sectionId, heading);

    for (const raw of cardsIn(block.html)) {
      const card = parseCard(raw);
      if (!card) continue;
      const key = card.url || card.title;
      if (seen.has(key)) continue;
      seen.add(key);
      const resolved = resolveTags(
        card.tagAttr,
        card.title,
        card.summary,
        card.source,
        card.sourceMeta,
        heading,
      );
      items.push({
        ...card,
        category,
        section: heading,
        tags: resolved.tags,
        unknownTags: resolved.unknown,
        report: meta.slug,
        reportLabel: meta.labelJa,
        date: meta.date,
        time: meta.time,
        sortKey: meta.sortKey,
      });
    }
  }

  return {
    ...meta,
    title: titleMatch ? stripTags(titleMatch[1]) : `Copilotエージェント関連ニュース ${meta.labelJa}`,
    notice: noticeMatch ? stripTags(noticeMatch[1]) : '',
    sourcesCount: sourcesCount ? Number(sourcesCount) : null,
    items,
  };
}
