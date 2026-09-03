#!/usr/bin/env python3
"""claude -p --output-format stream-json の出力を1行ずつ読み、
人間が読みやすい進捗ログに変換して標準出力に流す。

run-news.sh から `claude -p ... --output-format stream-json | python3 scripts/format-stream.py`
のように使う想定。TTYかどうかに依存せず、確実に逐次の進捗が見えるようにするための橋渡し役。
"""
import sys
import json


def short(s, n=90):
    s = str(s).replace("\n", " ")
    return s if len(s) <= n else s[: n - 1] + "…"


def describe_tool_use(block):
    name = block.get("name", "?")
    inp = block.get("input", {}) or {}
    if name == "WebSearch":
        return f"[検索] {inp.get('query', '')}"
    if name == "WebFetch":
        return f"[取得] {inp.get('url', '')}"
    if name in ("Write", "Edit"):
        return f"[編集] {name}: {inp.get('file_path', '')}"
    if name == "Read":
        return f"[閲覧] {inp.get('file_path', '')}"
    if name == "Bash":
        return f"[実行] {short(inp.get('command', ''))}"
    return f"[ツール] {name}: {short(inp)}"


def main():
    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        try:
            ev = json.loads(line)
        except json.JSONDecodeError:
            continue

        t = ev.get("type")

        if t == "system" and ev.get("subtype") == "init":
            print("[開始] セッションを初期化しました")

        elif t == "assistant":
            for block in ev.get("message", {}).get("content", []):
                bt = block.get("type")
                if bt == "text" and block.get("text", "").strip():
                    print(f"[Claude] {short(block['text'], 200)}")
                elif bt == "tool_use":
                    print(describe_tool_use(block))

        elif t == "result":
            status = "成功" if not ev.get("is_error") else "エラー"
            dur = ev.get("duration_ms", 0) / 1000
            print(f"=== 完了（{status} / {ev.get('num_turns', '?')}ターン / {dur:.1f}秒） ===")

        sys.stdout.flush()


if __name__ == "__main__":
    main()
