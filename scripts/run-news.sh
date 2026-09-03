#!/usr/bin/env bash
# batファイル（run-news.bat）から呼び出される想定のスクリプト。
# CLAUDE.mdの運用ルールに従って本日分のニュースを作成する。
#
# セキュリティ設計：
#   - AIには git push の権限を与えない（.claude/settings.local.json 参照）。AIは commit までしか行えない。
#   - push するかどうかは、このスクリプトが直前のコミットの中身を機械的に検査してから判断する。
#     プロンプトインジェクション等でAIの挙動が乗っ取られても、
#     「news/年/月/*.html 以外が変更されている」「HTML内にscript等が含まれる」場合は
#     push されず、ローカルに commit だけ残った状態で停止する（人間の確認待ち）。
set -euo pipefail
cd "$(dirname "$0")/.."

PROMPT="あなたはこのリポジトリ（copilot-agent-news）専用の自動ニュース収集エージェントです。まずリポジトリ直下の CLAUDE.md を必ず読み込み、そこに書かれている運用ルール・情報収集戦略・重複排除ルール・タグ仕様・デザインシステムに厳密に従って、本日分のCopilotエージェントニュースを作成してください。CLAUDE.mdが唯一かつ最新の作業仕様書です。手順の詳細はこのメッセージでは重複して指定しません。CLAUDE.mdの記載を常に優先してください。

このタスクは人手を介さず一気通貫で完了させる前提の実行です。以下の点にのみ注意してください。

1. 実行時点の日本時間を必ずコマンド（例: TZ=Asia/Tokyo date）で確認してから、ファイル名や注記欄の日時を決定してください。会話コンテキストからの推測で日付を決めないこと。
2. CLAUDE.mdの指示通りに node site/build.mjs --strict を実行して警告なく通ることを確認してください。
3. 変更したニュースHTMLファイルを git add news/... と git commit -m \"1行のメッセージ\" まで行ってください。**git push は絶対に実行しないでください（権限がなく失敗します。push は別の仕組みが行います）**。
4. コミットメッセージは**ヒアドキュメント（<<'EOF' 等）や複数行を使わず、必ず git commit -m \"1行のメッセージ\" という単純な1行の形**で実行してください。ヒアドキュメント形式は自動承認の対象外になり、無人実行では失敗します。
5. 新規に掲載できる有効なニュースが実質的に見つからなかった場合でも、調査範囲と結果（該当なしだった旨）を明記したレポートを作成し、必ず commit してください（無出力のまま終了しないこと）。"

echo "=== Copilotエージェントニュース 作成開始 ($(TZ=Asia/Tokyo date '+%Y-%m-%d %H:%M JST')) ==="
echo

# --output-format stream-json で逐次イベントを取得し、format-stream.py で読みやすい形に変換して
# 画面に流す。プレーンな --verbose だと、標準出力がパイプ/リダイレクトされている場合に
# 最終結果だけしか表示されないことがあるため、TTYの有無に依存しないこの方式にしている。
claude -p "$PROMPT" --output-format stream-json --verbose | python3 scripts/format-stream.py

echo
echo "=== AIによる作業完了。push前の安全チェックを開始します ==="

git fetch origin main --quiet

# core.quotepath=false: 日本語ファイル名を8進数エスケープ（"\343\202..."）ではなく
# そのままのUTF-8で出力させる。デフォルトのままだとパスの正規表現マッチが常に失敗する。
CHANGED=$(git -c core.quotepath=false diff --name-only origin/main..HEAD || true)

if [ -z "$CHANGED" ]; then
  echo "変更コミットがありません。push は行いません。"
  exit 0
fi

echo "変更されたファイル:"
echo "$CHANGED"
echo

# チェック1: news/yyyy/mm/*.html 以外が変更されていないか
BAD_PATHS=$(echo "$CHANGED" | grep -vE '^news/[0-9]{4}/[0-9]{2}/[^/]+\.html$' || true)
if [ -n "$BAD_PATHS" ]; then
  echo "!!! 想定外のファイルが変更されています。安全のため push を中止します。 !!!"
  echo "$BAD_PATHS"
  echo "ローカルに commit は残っています。内容を確認してから手動で push してください。"
  exit 1
fi

# チェック2: 変更されたHTMLに script / イベントハンドラ / javascript: が含まれていないか
# イベントハンドラは「空白の直後に on〜=」の形のみ対象にする。
# 単純に on[a-z]+\s*= だけだと "content=" 等（c-ontent=）も誤検知するため。
SUSPICIOUS=0
while IFS= read -r f; do
  [ -z "$f" ] && continue
  if [ -f "$f" ] && grep -inE '<script|[[:space:]]on[a-z]+[[:space:]]*=|javascript:' "$f" > /dev/null; then
    echo "!!! $f に不審なタグ・属性が含まれています。push を中止します。 !!!"
    SUSPICIOUS=1
  fi
done <<< "$CHANGED"
if [ "$SUSPICIOUS" -eq 1 ]; then
  echo "ローカルに commit は残っています。内容を確認してから手動で push してください。"
  exit 1
fi

echo "安全チェックOK（news配下のHTMLのみ・不審なタグなし）。push します。"
PUSHED_SHA=$(git rev-parse HEAD)
git push origin main

# ---- 公開サイトをブラウザで開く --------------------------------------------
# push でトリガーされる deploy.yml（GitHub Pages）の完了を待ってから、
# Windows 既定ブラウザで公開URLを開く。
#   - 無効化: NEWS_OPEN_SITE=0 環境変数
#   - ブラウザを開く手段（explorer.exe / xdg-open）が無い環境では自動スキップ
SITE_URL="https://sotamorita.github.io/copilot-agent-news/index.html"

open_url() {
  if command -v explorer.exe > /dev/null 2>&1; then
    explorer.exe "$1" > /dev/null 2>&1 || true   # explorer.exe は成功時も exit 1 を返すため無視
  elif command -v xdg-open > /dev/null 2>&1; then
    xdg-open "$1" > /dev/null 2>&1 || true
  else
    return 1
  fi
}

if [ "${NEWS_OPEN_SITE:-1}" = "0" ]; then
  echo "NEWS_OPEN_SITE=0 のためサイトのブラウザ起動をスキップします。"
elif ! command -v explorer.exe > /dev/null 2>&1 && ! command -v xdg-open > /dev/null 2>&1; then
  echo "ブラウザを開く手段が無いため、サイトのブラウザ起動をスキップします（URL: $SITE_URL）。"
else
  echo
  echo "=== GitHub Pages のデプロイ完了を待機します ==="

  # push 直後は該当 run がまだ API に現れないことがあるので、SHA一致の run を数回リトライで探す。
  RUN_ID=""
  for _ in 1 2 3 4 5 6 7 8; do
    RUN_ID=$(gh run list --workflow=deploy.yml --limit=15 \
               --json databaseId,headSha \
               --jq "[.[] | select(.headSha==\"$PUSHED_SHA\")] | .[0].databaseId" 2>/dev/null || true)
    [ -n "$RUN_ID" ] && [ "$RUN_ID" != "null" ] && break
    sleep 10
  done

  if [ -n "$RUN_ID" ] && [ "$RUN_ID" != "null" ]; then
    echo "デプロイ run: $RUN_ID を監視します..."
    # --exit-status: 失敗時に非ゼロ終了。ここでは失敗してもサイトは開く（stale でも見えた方がよい）。
    gh run watch "$RUN_ID" --exit-status --interval 15 \
      || echo "デプロイが失敗またはタイムアウトしました。最新でない可能性がありますが、サイトを開きます。"
  else
    echo "デプロイ run を特定できませんでした。90秒待ってから開きます。"
    sleep 90
  fi

  echo "ブラウザでサイトを開きます: $SITE_URL"
  open_url "$SITE_URL" || echo "ブラウザ起動に失敗しました。手動で開いてください: $SITE_URL"
fi
# --------------------------------------------------------------------------

echo
echo "=== 完了 ($(TZ=Asia/Tokyo date '+%Y-%m-%d %H:%M JST')) ==="
