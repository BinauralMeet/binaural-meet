# ForHuman — doc ツールの説明（人間向け）

**いつ読むか**: doc ツールが何なのか知りたい / 全コマンドを知りたい / 規約がその形である
理由を知りたい / 消した内容を git から戻したい（Claude は通常不要。書くときの規約は
`rules` に全部ある）

## これは何か {#tool}

`haselab-net/doc-tool` は、Markdown で書かれた docs ツリー(topic ごとの README +
CHANGELOG)を低トークンで検索・参照するための小さな CLI と、その docs ツリーの書き方規約
一式。中身はこの3ファイルだけ:

* `doc` — 本体スクリプト(index / show / grep / log / toc / check)。
* `README.md` — 書き方規約(rules)。利用側プロジェクトの `docs/README.md` になるテンプレート。
* `ForHuman.md` — このファイル。利用側プロジェクトの `docs/ForHuman.md` になるテンプレート。

キャッシュや生成済み索引ファイルは持たない。この規模のツリーの全走査は数ミリ秒で終わる。
索引は各 topic README の先頭2行(H1 と `**いつ読むか**:` 行)から `doc` が組み立てる生成物。

## 別プロジェクトへの導入方法 {#install}

```sh
git submodule add git@github.com:haselab-net/doc-tool.git docs/bin
```

これで `docs/bin/doc` が実体として置かれる(symlink ではない)。`doc` は自分のファイルパスから
2階層上をツリーの root と見なすので、`docs/bin/doc` という配置さえ守れば動く。

`docs/bin/README.md`・`docs/bin/ForHuman.md` は `bin` 配下にあるため `doc` 自身の走査からは
除外される(`load()` が `bin` を含むパスを skip する)。使う側プロジェクトの `docs/README.md`
(書き方規約=rules)と `docs/ForHuman.md` は別に必要 — 導入時にこの2ファイルを
`docs/bin/README.md` → `docs/README.md`、`docs/bin/ForHuman.md` → `docs/ForHuman.md` として
一度コピーする(その後はプロジェクト側で自由に書き足してよい。ツール本体の更新は
`git submodule update --remote docs/bin` で追従)。

```sh
cp docs/bin/README.md docs/README.md
cp docs/bin/ForHuman.md docs/ForHuman.md
```

## コマンド {#usage}

```sh
docs/bin/doc                      # 索引(探し方 + トップレベル topic)。まずこれ
docs/bin/doc full                 # 全 topic を階層込みで一覧。人間が俯瞰する用
docs/bin/doc show <topic>#<節ID>  # その節だけ
docs/bin/doc show <topic>         # ファイル全体(子トピックがあれば一覧を添える)
docs/bin/doc grep <パターン>      # 見出し単位でヒット位置と行範囲
docs/bin/doc log [<パターン>]     # CHANGELOG のエントリ一覧
docs/bin/doc toc [<topic>]        # 節ID・見出し・行範囲(子トピックも併記)
docs/bin/doc check                # 規約違反の検出
```

`doc --help` に全フラグがある。共通で `-F`(固定文字列) `-s`(大小文字を区別)
`--root DIR`、`show` に `--max-lines`、`grep` に `--topic --files-only` など。

`doc` と `doc full` の使い分け: 既定の `doc` はトップレベルだけを出し、子がある topic には
`N sub` と件数だけ添える。エージェントが毎回読む索引を肥大化させないため。全階層を
一度に見たいときが `doc full`。

## 規約がこの形である理由 {#why}

- **索引は生成物**: 各 topic README の先頭2行(H1 と `**いつ読むか**:` 行)から `doc` が
  組み立てる。索引ファイルを手で保守しないので、topic を足して索引の更新を忘れる事故が
  そもそも起きない。
- **参照は行番号でなく `topic#節ID`**: 行番号は編集でずれる。標準節は id が固定文字列に
  写像されるので、本文に markup を足さずに `dev-environment#ops` のように指せる。
- **動作確認は CHANGELOG に書く**: 日付付きの証拠であって、現在形の文書に混ぜると腐る。
  恒久的な性質を発見した検証だけは事実なので topic README に残す。
- **「詳細は `topic/sub` を参照」を本文に書かせない**: `direct_children()` が
  ディレクトリ構造から子トピックを機械的に一覧化し、`doc show` / `doc toc` が自動で出す。
  手書きの導線文は書き忘れると孤立サブトピックになるので、仕組み側で解決している。
- **topic id の衝突**: ディレクトリ名の付け方次第で稀に起こりうる(`overview/space/DESIGN.md`
  と `overview/space-design/README.md` が同じ id になる等)。`doc check` が検出する。

## 削除したものを取り戻す {#recover}

このツリーは通常の git 管理下にある。削除した内容は `git log -p -- docs/<path>` で追える。
