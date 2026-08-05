# CHANGELOG — binaural-meet の変更履歴

**いつ読むか**: いつ・なぜ今の状態になったか調べる / 過去の動作確認の記録を探す /
変更を加えたので追記する

日付が付く記録はここに。現在形の事実は各 topic README へ。

## 2026-08-05 — conferenceトピックを新設 {#2026-08-05-conference-doc-added}

`src/models/conference/`(通話・データ同期・位置情報を束ねる`Conference`本体)には
設計・仕様のdocsが無かったので、コード(`Conference.ts`および
`RtcConnection`/`RtcTransports`/`DataConnection`/`DataSync`/`PositionConnection`/
`MediaMessages`等)を読んで新設した。

## 2026-08-05 — auto-load-adjustment-designを実装内容に合わせて更新 {#2026-08-05-auto-load-adjustment-doc-sync}

`auto-load-adjustment-design`は2026-07-29時点のドラフトのままで、同日中に
実装された`LoadAdjuster.ts`/`LoadAdjusterLogic.ts`(コミット `fb6e1d0`〜
`733808a`、"N/N"の6コミット、いずれも`master`に直接コミット済み)の内容と
食い違っていた。ドキュメントを現状の実装に合わせて書き直し、ドラフトから
簡略化した点(検出指標の単一化、CPU対応を人数カリングに統一、等)は
`design`節に移した。

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
