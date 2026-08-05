# conference — 通話・シグナリングのオーケストレーション層

**いつ読むか**: `src/models/conference/` に触る / `Conference`/`RtcTransports`/
`DataConnection`のどれに何を書けばいいか迷う / 入室・退室・再接続のフローを確認する

`Conference`(`Conference.ts`、シングルトン`conference`としてexport)が
`src/models/conference/`全体の起点。mediasoup通話・データ同期・位置情報という
3つの独立したサーバー接続と、どのリモートtrackを実際に購読するかの決定を
束ねるオーケストレータで、それ以外のロジックは各サブモジュールに分かれている。

## 構成 {#arch}

`Conference`が保持する4つの独立したコンポーネント:

- **`RtcTransports`(mediasoup通話)**: `RtcConnection`を継承。`RtcConnection`が
  `config.mainServer`への生WebSocketシグナリング(`connect`/`createTransport`/
  `produceTransport`/`consumeTransport`等、メッセージ送信のみ)を持ち、
  `RtcTransports`はその上でmediasoup-clientの`Device`/`Transport`/`Producer`/
  `Consumer`という実オブジェクトのライフサイクルとICE再接続タイマーを管理する。
  `RemotePeer`(参加者ごとの受信トランスポート)・`RemoteProducer`(track単位、
  `consumer?`を持つ)はここで定義。
- **`DataConnection`(参加者情報・共有コンテンツの同期)**: `config.dataServer`への
  別の生WebSocket(`RtcTransports`とは無関係な別サーバー・別プロトコル)。
  `DataConnection.sync`(`DataSync`)が`sendAllAboutMe`(pose/mouse/在席/録画状態等の
  ブロードキャスト)や`sendContentUpdateRequest`等を持つ。メッセージ型ごとの
  `merge`/`recordable`/`onReceive`/`onPlayback`は`MessageTypeRegistry`に登録する
  形に移行中(`DataSync.registerMessageTypes()`)。
- **`PositionConnection`**: `settings.lpsUrl`(ローカル位置情報サーバー)へのさらに
  別のWebSocket。`DataConnection`と無関係、リモート参加者の`position`更新のみ。
- **`PriorityCalculator`**: どのリモート映像/音声を実際に購読するか
  (`tracksToConsume`)を決める。ローカル参加者との2D距離で優先度付けし、
  `remoteVideoLimit`/`remoteAudioLimit`(部屋ポリシー)と`LoadAdjuster`の
  ローカル自動上限を`combineLimit()`で合成して切り詰める(詳細は
  `auto-load-adjustment-design#adjustment-mechanism`)。

`Conference`のconstructorが`priorityCalculator.tracksToConsume`の変化を`autorun`で
監視し、増えたtrackに対して`addConsumer()`(mediasoupのConsumer生成)、減った
trackに対して`removeConsumer()`を呼ぶ。実際の購読判断はここでの差分検出だけで、
優先度計算自体は`PriorityCalculator`の責務。

### 型の対応

`RtcConnection`のWebSocket上のワイヤーフォーマットは`MediaMessages.ts`の
`MSRemotePeer`/`MSRemoteProducer`(`{peer, producers}` / `{id, role, kind}`)。
`Conference.onRemoteUpdate`がこれを受け取り、ライブなmediasoupオブジェクトを
持つ`RemotePeer`/`RemoteProducer`(`RtcConnection.ts`で定義)に変換・差分反映する。
`isEqualMSRP()`は`kind`+`role`だけで同一性判定(`id`は無視 — producer再作成時に
`id`が変わるケースを「更新」として扱うため)。

### `stores/`からの呼び戻し

`architecture#arch`が定める「`stores/`は`@models/conference`をimportしない」を
満たすため、`Conference`は`stores/`側で定義された`ContentSyncTransport`/
`ConferenceStatusTransport`インターフェースを実装し、自分自身を
`contentSyncService.setSyncTransport(this)`のように**渡す側**になる。
`stores/`は具象クラス`Conference`を知らず、インターフェースの向こう側が誰かを
気にしない。

## 構成ファイル一覧 {#files}

| ファイル | 役割 |
|---|---|
| `Conference.ts` | 本体。入退室フロー、再接続、local/remote track管理、上記4コンポーネントの束ね |
| `RtcConnection.ts` | mediasoupサーバーへの生WebSocketシグナリング(メッセージ送受信のみ) |
| `RtcTransports.ts` | `RtcConnection`を継承し、mediasoup-clientの実オブジェクト(Device/Transport/Producer/Consumer)を管理 |
| `PriorityCalculator.ts` | 購読するリモートtrackの優先度計算・上限適用(`tracksToConsume`) |
| `LoadAdjuster.ts`/`LoadAdjusterLogic.ts` | ローカル負荷に応じた追加購読上限。詳細は`auto-load-adjustment-design` |
| `DataConnection.ts` | データ同期サーバーへの生WebSocket |
| `DataSync.ts` | 参加者情報・共有コンテンツの同期ロジック、メッセージ型ごとのハンドラ登録 |
| `MessageTypeRegistry.ts` | メッセージ型 → `{merge, recordable, onReceive, onPlayback}` のレジストリ |
| `DataMessage.ts`/`DataMessageType.ts`/`DataMessagePayloads.ts` | データ同期のワイヤーフォーマット定義 |
| `DataConnectionQueueLogic.ts` | 送信キューのマージ判定(純粋関数、ストア非依存でテスト可能) |
| `PositionConnection.ts` | ローカル位置情報サーバーへの別WebSocket |
| `MediaMessages.ts` | mediasoupシグナリングのワイヤーフォーマット(`MSRemotePeer`/`MSRemoteProducer`) |
| `priorityTypes.ts` | `RemoteObjectInfo`(優先度計算用の1track分のレコード) |
| `observeInputDevice.ts`/`observeOutputDevice.ts` | マイク/カメラ/出力デバイスの変更監視 |
| `faceCamera.ts`/`mediapipeCamera.ts` | 顔認識によるカメラ/IK制御(自分のカメラのみ、購読数に依存しない) |

## 運用 {#ops}

- **入室**: `preEnter(room)`(mediasoup側の事前接続)→`enter(room, token, email)`。
  `enter`はkick履歴(`localStorage`の`kickTimes`、15分間再入室禁止)を確認後、
  `rtcTransports.connect()`→デバイス列挙→ local track準備 →
  `dataConnection.connect()` / `positionConnection.connect()`を並行して行う。
- **RTC切断時**: `onRtcDisconnect`が5秒後に`preEnter`→`enter`を再実行(無条件リトライ、
  バックオフ無し)。
- **データ接続切断時**: `onDataDisconnect`が2秒間隔で`rtcTransports.isConnected()`を
  ポーリングし、RTCが繋がっていれば`dataConnection.connect()`し直す。
- **退室**: `leave()`が`dataConnection`→`rtcTransports`の順に切断し、統計取得
  インターバルを止める。
- 10秒ごとに`updateAllTransportStats()`がWebRTC統計(`quality`含む)を
  `participants`側に反映する(`auto-load-adjustment-design#load-detection`が
  ネットワーク負荷検出に使う値と同じ)。

## 既知の制限 {#limits}

- RTC再接続は固定5秒後の無条件リトライで、指数バックオフ等は無い。
- `DataConnection`と`RtcTransports`は別サーバー・別プロトコルの独立したWebSocketで、
  どちらかだけが切れる/繋がる状態が発生し得る(`onDataDisconnect`のポーリングは
  その前提で書かれている)。
- `MessageTypeRegistry`への移行は途中(`DataSync`のコメント参照) — 一部の
  メッセージ型は未移行のまま旧来の分岐で処理されている可能性がある。

## 設計判断の記録 {#design}

- **`RtcConnection`と`RtcTransports`を分けている**: シグナリング(メッセージ送受信
  だけ)とmediasoupの実オブジェクト管理を別クラスにすることで、下位層
  (`RtcConnection`)は「何を送ったか」だけに集中できる。
- **`DataConnection`/`PositionConnection`/`RtcTransports`は完全に別のWebSocket**:
  歴史的に別サーバーとして育ってきた3つの関心事(通話・参加者情報同期・位置情報)を
  無理に1本の接続にまとめていない。接続状態の組み合わせが増える代わりに、
  各サーバー・プロトコルを独立に進化させられる。
- **`stores/`への呼び戻しをtransportインターフェース経由にした**:
  `architecture#arch`のレイヤー規約(`stores/`が`@models/conference`を
  importしない)を、`Conference`側がインターフェースを実装して自分を渡す形で
  満たしている。`stores/`側は具象の`Conference`を一切知らない。
