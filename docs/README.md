# rules — このツリーの書き方

書くときはこれに従う。読むときは `docs/bin/doc`(引数なしで索引、`--help` で全コマンド)。
道具の背景・人間向けの詳細・規約の理由は `ForHuman`。

## どこに書くか {#record}

同じ内容を2箇所に書かない。片方はリンクにする。

| 書くもの | 行き先 |
|---|---|
| 日付が付くもの(いつ何を変えたか、その日の動作確認) | `CHANGELOG.md` |
| 現在形で書けるもの | `<topic>/README.md` |
| なぜそうしたか・何を採らなかったか | `<topic>/README.md` の `## 設計判断の記録` |

- CHANGELOG の各エントリ `## YYYY-MM-DD — ...` には `{#id}` を必ず付ける。
- 動作確認は CHANGELOG。例外は恒久的な性質の発見(例: このコンテナに procps が無い)で、
  それは topic README に残す。

## トピックの形 {#newtool}

`<topic>/README.md` を作るだけ。**索引は生成物なので触らない。**

```markdown
# <topic> — <一行の説明>

**いつ読むか**: <発火条件を / 区切りで>

## 構成
## 構成ファイル一覧
## 運用
## 既知の制限
## 設計判断の記録
```

- 標準節名は `使い方 構成 構成ファイル一覧 セキュリティ上の要点 運用 既知の制限
  設計判断の記録`(id は `usage arch files security ops limits design`)。省略可、
  並べ替え不可、`設計判断の記録` は常に最後。
- 標準名以外の H2 は見出し末尾に `{#id}` を付ける。
- `設計判断の記録` 以外は現在形で書く。他の節に日付の追記が現れたら CHANGELOG へ移す。
- `いつ読むか` は読み手の状況(発火条件)で書く。トピック名の言い換えは不可。

## 入れ子 {#nesting}

`<topic>/<sub>/README.md` を作る。深さ制限なし。

- id はパスそのもの: `overview/space/README.md` → `overview/space`。
- README 以外の兄弟ファイル: `overview/space/DESIGN.md` → `overview/space-design`。
- **「詳細は `topic/sub` を参照」を本文に書かない。** `doc show` / `doc toc` が子トピックを
  自動で一覧する。
- 上位 README は概要だけ。詳細を上下で重複させない。

## 参照 {#style}

- 相互参照は `topic#節ID`。行番号は使わない(編集でずれる)。
- このリポジトリの外(devsandbox ホストのインフラ機構そのもの)は説明しない。
  「ここではこう使う・こう困る」だけ書く。

## 書いたら {#verify}

`docs/bin/doc check` を通す。
