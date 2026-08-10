#!/usr/bin/env node
// yyyy/mm/ 配下のニュースHTMLから公開用サイト（_site/）を生成する。
// 依存パッケージなし。node site/build.mjs で実行。

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { parseFileName, parseReport } from './lib/parse.mjs';
import { renderArchive, renderIndex, rewriteReport } from './lib/render.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, '_site');

/** yyyy/mm/*.html を新しい順に集める。 */
function collectReportFiles() {
  const files = [];
  for (const year of fs.readdirSync(ROOT)) {
    if (!/^\d{4}$/.test(year)) continue;
    const yearDir = path.join(ROOT, year);
    if (!fs.statSync(yearDir).isDirectory()) continue;

    for (const month of fs.readdirSync(yearDir)) {
      if (!/^\d{2}$/.test(month)) continue;
      const monthDir = path.join(yearDir, month);
      if (!fs.statSync(monthDir).isDirectory()) continue;

      for (const name of fs.readdirSync(monthDir)) {
        if (!name.endsWith('.html')) continue;
        const meta = parseFileName(name);
        if (!meta) {
          console.warn(`  ! 日時を読み取れないためスキップ: ${year}/${month}/${name}`);
          continue;
        }
        files.push({ abs: path.join(monthDir, name), name, meta });
      }
    }
  }
  return files.sort((a, b) => b.meta.sortKey.localeCompare(a.meta.sortKey));
}

function nowLabel() {
  const d = new Date();
  const jst = new Date(d.getTime() + (9 * 60 + d.getTimezoneOffset()) * 60000);
  const pad = (n) => String(n).padStart(2, '0');
  return `${jst.getFullYear()}年${jst.getMonth() + 1}月${jst.getDate()}日 ${pad(jst.getHours())}:${pad(jst.getMinutes())}`;
}

function copyDir(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const src = path.join(from, entry.name);
    const dst = path.join(to, entry.name);
    if (entry.isDirectory()) copyDir(src, dst);
    else fs.copyFileSync(src, dst);
  }
}

function build() {
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });

  const files = collectReportFiles();
  if (!files.length) {
    console.warn('ニュースHTMLが見つかりませんでした。');
  }

  const reports = [];
  const allItems = [];
  const seenUrls = new Map();

  for (const file of files) {
    const html = fs.readFileSync(file.abs, 'utf8');
    const report = parseReport(html, file.meta);
    const relPath = `${file.meta.year}/${file.meta.month}/${file.meta.slug}.html`;
    report.path = relPath;
    report.sourceName = file.name;

    for (const item of report.items) {
      item.reportPath = relPath;
    }

    // レポートHTMLを共通スタイル付きで公開ディレクトリへ複製（元ファイルは変更しない）
    const outFile = path.join(OUT, 'news', relPath);
    fs.mkdirSync(path.dirname(outFile), { recursive: true });
    fs.writeFileSync(
      outFile,
      rewriteReport(html, { depth: relPath.split('/').length, items: report.items }),
    );

    reports.push(report);

    // 一覧では同一URLの再掲を1件にまとめ、初出（＝古い方）の掲載日を残す
    for (const item of report.items) {
      const key = item.url || item.title;
      const existing = seenUrls.get(key);
      if (existing) {
        if (item.sortKey < existing.sortKey) Object.assign(existing, item);
        continue;
      }
      seenUrls.set(key, item);
      allItems.push(item);
    }
  }

  allItems.sort((a, b) => b.sortKey.localeCompare(a.sortKey) || a.title.localeCompare(b.title));

  const tagCounts = new Map();
  for (const item of allItems) {
    for (const tag of item.tags) tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
  }
  const tags = [...tagCounts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));

  const generatedAt = nowLabel();
  fs.writeFileSync(
    path.join(OUT, 'index.html'),
    renderIndex({ items: allItems, reports, tags, generatedAt }),
  );
  fs.writeFileSync(
    path.join(OUT, 'archive.html'),
    renderArchive({ reports, generatedAt, totalItems: allItems.length }),
  );

  // 検索インデックス（外部利用・デバッグ用）
  fs.writeFileSync(
    path.join(OUT, 'search-index.json'),
    JSON.stringify(
      {
        generatedAt,
        items: allItems.map((i) => ({
          title: i.title,
          url: i.url,
          summary: i.summary,
          source: i.source,
          category: i.category,
          tags: i.tags,
          date: i.date,
          time: i.time,
          report: `news/${i.reportPath}`,
        })),
      },
      null,
      2,
    ),
  );

  copyDir(path.join(ROOT, 'site', 'assets'), path.join(OUT, 'assets'));
  fs.writeFileSync(path.join(OUT, '.nojekyll'), '');

  console.log(`ビルド完了: ${reports.length} レポート / ${allItems.length} 記事 / ${tags.length} タグ`);
  console.log(`出力先: ${path.relative(ROOT, OUT)}/`);
}

build();
