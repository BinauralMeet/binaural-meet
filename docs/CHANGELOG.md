# CHANGELOG — binaural-meet の変更履歴

**いつ読むか**: いつ・なぜ今の状態になったか調べる / 過去の動作確認の記録を探す /
変更を加えたので追記する

日付が付く記録はここに。現在形の事実は各 topic README へ。

## 2026-08-05 — docs を `bm/docs/binaural-meet/` からこのリポジトリに移動 {#2026-08-05-docs-moved-in}

それまで architecture/development-guide/testing-guide/shared-contents/
auto-load-adjustment-design/refactoring-plan の各docsは親workspace `bm/` の
`docs/binaural-meet/` にしかなく、`binaural-meet` を単体でcloneした場合は
一切読めなかった。`docs/bin/doc`(doc-tool)をこのリポジトリにも導入し、
実体をここに移した。`bm/` 側は `.gitmodules` を見て自動的にこのツリーも
索引に含める(`bm` の `binaural-meet-architecture` などのtopic idは変わらない)。

## 2026-07-28 — アーキテクチャ整理ロードマップ完了 {#2026-07-28-refactor-roadmap}

`refactor/architecture-cleanup` ブランチで9フェーズの構造整理を実施(store群の
ドメイン再編、`SharedContents` ↔ `conference` の循環依存解消、`ISharedContent` の
discriminated union 化、`SharedContents` god-class の4ストア分割、
`StereoParameters` 命名衝突の解消、GDrive認証状態の集約)。詳細は
`refactoring-plan-done`(完了記録として保持)とそのコミット履歴(`git log`、各
"Phase N: ..." コミット)を参照。PRはまだオープンしていない。
