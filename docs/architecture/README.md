# architecture — binaural-meetのレイヤー規約

**いつ読むか**: `stores/` 配下に新しいimportを足す / `conference` と
`sharedContent`(または他のstore)の間で依存を追加しようか迷う / 循環依存の
警告やバンドルの問題に遭遇した

## 構成

`refactor/architecture-cleanup` ロードマップ(`CHANGELOG#2026-07-28-refactor-roadmap`)
で確認・固定された、binaural-meetのレイヤー間の依存方向:

```
components  →  conference (機能として参照してよい。逆は不可)
conference  →  stores      (一方向。conferenceはstoresを参照してよい)
stores      ✕→ @models/conference (このimportは禁止)
```

- **`sharedContent` や他のstoreは `@models/conference` を import してはいけない。**
  `RtcConnection.ts` のようなファイルからの**型だけの** import(`conference` の
  シングルトン/クラスそのものではない)は例外として許容される。
- **`conference` はstoreを一方向に import してよい。**
- **componentsは `conference` を機能として参照してよいが、逆(`conference` から
  componentsを参照)は不可。**

循環依存を断つ具体的な手法は依存性注入: 小さいインターフェース
(`ContentSyncTransport`、`ConferenceStatusTransport` など)をstore側で定義し、
`Conference` がそれを実装して自身のコンストラクタで
`setXxxTransport(this)` のように注入する。`SharedContents ↔ conference` と
`ErrorInfo`/`StereoManager ↔ conference` の循環依存はこの手法で解消済み。

`RtcConnection.ts` / `RtcTransports.ts`(mediasoupシグナリングの中核)は
このロードマップでは意図的に手を付けていない。サーバー側ソースがこの
ワークスペースに揃った今は、再検討の余地がある。

## 既知の制限

- このルールはbinaural-meetクライアント側のみを対象にしている。
  bmMediasoupServer側の層構造はまだレビューしていない。

## 設計判断の記録

- **依存性注入 vs 単純な逆転**: `conference` から直接storeを操作させず、store
  側にインターフェースを持たせて`conference`に実装させたのは、storeが
  `conference`の型を一切知らずに済む(型import例外を除く)形にしたかったため。
