/* 一覧ページの検索・絞り込み。依存ライブラリなし。
   記事はビルド時にHTMLへ出力済みで、ここでは表示／非表示を切り替えるだけ。 */
(function () {
  'use strict';

  var list = document.getElementById('news-list');
  if (!list) return;

  var input = document.getElementById('q');
  var countEl = document.getElementById('result-count');
  var emptyEl = document.getElementById('empty');
  var items = Array.prototype.slice.call(list.querySelectorAll('.card'));

  var activeCats = new Set();
  var activeTags = new Set();

  // ハイライト復元用に元テキストを控えておく
  items.forEach(function (el) {
    el.querySelectorAll('[data-highlight]').forEach(function (t) {
      t.dataset.original = t.textContent;
    });
  });

  function escapeHtml(s) {
    return s.replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function escapeRe(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function terms(q) {
    return q.trim().toLowerCase().split(/[\s　]+/).filter(Boolean);
  }

  function highlight(el, words) {
    el.querySelectorAll('[data-highlight]').forEach(function (t) {
      var original = t.dataset.original || '';
      if (!words.length) {
        t.textContent = original;
        return;
      }
      var re = new RegExp('(' + words.map(escapeRe).join('|') + ')', 'gi');
      t.innerHTML = escapeHtml(original).replace(re, '<mark>$1</mark>');
    });
  }

  function apply() {
    var q = input ? input.value : '';
    var words = terms(q);
    var shown = 0;

    items.forEach(function (el) {
      var hay = el.dataset.search || '';
      var cat = el.dataset.category || '';
      var tags = (el.dataset.tags || '').split('|').filter(Boolean);

      var matchText = words.every(function (w) { return hay.indexOf(w) !== -1; });
      var matchCat = activeCats.size === 0 || activeCats.has(cat);
      var matchTag = activeTags.size === 0 || tags.some(function (t) { return activeTags.has(t); });
      var ok = matchText && matchCat && matchTag;

      el.hidden = !ok;
      if (ok) {
        shown += 1;
        highlight(el, words);
      }
    });

    if (countEl) {
      countEl.textContent =
        shown === items.length
          ? '全 ' + items.length + ' 件'
          : shown + ' 件 / 全 ' + items.length + ' 件';
    }
    if (emptyEl) emptyEl.hidden = shown !== 0;
    syncUrl(q);
  }

  function syncUrl(q) {
    var params = new URLSearchParams();
    if (q.trim()) params.set('q', q.trim());
    activeCats.forEach(function (c) { params.append('cat', c); });
    activeTags.forEach(function (t) { params.append('tag', t); });
    var qs = params.toString();
    try {
      // file:// で直接開いた場合は履歴APIが使えないため無視する
      history.replaceState(null, '', qs ? '?' + qs : location.pathname);
    } catch (e) { /* noop */ }
  }

  function bindChips(selector, set) {
    document.querySelectorAll(selector).forEach(function (btn) {
      btn.addEventListener('click', function () {
        var value = btn.dataset.value;
        if (set.has(value)) set.delete(value);
        else set.add(value);
        btn.setAttribute('aria-pressed', set.has(value) ? 'true' : 'false');
        apply();
      });
    });
  }

  bindChips('.chip[data-kind="cat"]', activeCats);
  bindChips('.chip[data-kind="tag"]', activeTags);

  if (input) {
    var timer;
    input.addEventListener('input', function () {
      clearTimeout(timer);
      timer = setTimeout(apply, 120);
    });
  }

  // 初期状態をURLクエリから復元（他ページのタグリンクからの遷移用）
  var initial = new URLSearchParams(location.search);
  if (input && initial.get('q')) input.value = initial.get('q');
  initial.getAll('cat').forEach(function (c) { activeCats.add(c); });
  initial.getAll('tag').forEach(function (t) { activeTags.add(t); });
  document.querySelectorAll('.chip').forEach(function (btn) {
    var set = btn.dataset.kind === 'cat' ? activeCats : activeTags;
    btn.setAttribute('aria-pressed', set.has(btn.dataset.value) ? 'true' : 'false');
  });

  apply();
})();
