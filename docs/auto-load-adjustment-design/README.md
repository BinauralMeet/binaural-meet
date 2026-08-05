# 自動負荷調整機能 設計 (ドラフト)

**いつ読むか**: 自動負荷調整機能(クライアント側の負荷検出・購読数自動調整)を実装する / この設計の前提・却下案を確認する

作成日: 2026-07-29。**この文書は設計のみで、実装はまだ行っていない。**

## 1. 背景・目的 {#background}

参加者数・画面共有・VRMアバターが増えると、各クライアントの

- **CPU負荷**(WebGL描画、VRMボーン更新、動画デコード)
- **ネットワーク負荷**(受信ビットレート、パケットロス)
- **メモリ使用量**(VRMモデル/テクスチャ、動画バッファ)

が増大し、動作が不安定になる。現状、購読するビデオ/オーディオ数の上限
(`remoteVideoLimit`/`remoteAudioLimit`)は**管理者が手動で設定する固定値**であり、
個々のクライアントの実際の負荷状況には反応しない。

本機能は、各クライアントが**自分自身の負荷を検出し、自動的に購読数・表示品質を
下げる(そして負荷が下がれば戻す)**仕組みを追加する。

## 2. 前提: 既存アーキテクチャの整理 {#existing-architecture}

設計にあたって重要な既存の仕組みを先に整理する(調査済み、file:line付き)。

### 2.1 ストリーム購読の決定経路

- `PriorityCalculator.ts` が、全リモート映像/音声トラックについて**ローカル参加者との
  2D距離**に基づく優先度を計算し(`calcPriorityValue()`, `PriorityCalculator.ts:237-251`)、
  500msごとに再計算する(`PriorityCalculator.ts:109-118`)。
- オンステージ/ゾーン内/やーんフォン中の参加者・`mainScreen`は`priority=0`または
  大きな負のoffsetで**常に最優先**される(`extractRemoteObjectInfo()`,
  `PriorityCalculator.ts:23-24, 39`)。
- 優先度順にソートした後、`this.limits`(`[remoteVideoLimit, remoteAudioLimit]`)で
  配列を**切り詰める**(`PriorityCalculator.ts:222-226`)。結果は
  `@observable.ref tracksToConsume: {videos, audios}`。
- `Conference.ts:96-112`が`tracksToConsume`の差分(`videoAudioTrackInfoDiff`)を見て
  `addConsumer`/`removeConsumer`(`Conference.ts:521,538`)を呼び、実際に
  mediasoupのConsumerを作成/破棄する。

**重要**: `remoteVideoLimit`/`remoteAudioLimit`は`LocalParticipant`のフィールドだが、
**管理者が変更すると`PARTICIPANT_TRACKLIMITS`メッセージで全参加者に配信され、
各クライアントの同フィールドを上書きする**(`DataSync.ts:206-208, 233-234`,
`AdminConfigForm.tsx:83`)。つまりこれは「部屋全体のポリシー」であり、
**個々のクライアントがローカルの都合で書き換えてよい値ではない**。

→ 自動負荷調整はこの値を直接書き換えず、**別のローカル専用の追加上限**として実装し、
`PriorityCalculator`側で`min(remoteVideoLimit, autoVideoLimit)`のように合成する必要がある。

### 2.2 ストリームの品質段階

- **simulcast/SVCは未使用**。送信側エンコードは常に単一レイヤー
  (`RtcTransports.ts:248`: `encodings:maxBitRate ? [{maxbitrate:maxBitRate}] : undefined`)。
- 受信側にも`consumer.setPreferredLayers()`等のレイヤー選択APIは呼ばれていない。
- **つまり現状、単一ストリームの画質を段階的に下げる手段が無い**。取れる手段は
  実質「購読するか/しないか」の二値のみ。中間的な劣化(解像度だけ下げる等)を
  導入するにはsimulcast導入という別の大きな変更が要る(§7 将来課題)。

### 2.3 VRMアバター描画のコスト

- `avatarDisplay2_5D`/`avatarDisplay3D`は`LocalParticipant`の`@observable`で、
  **ローカル(自分の画面にどう見せるか)の設定であり、送信内容には影響しない**
  (`LocalParticipant.ts:91-92`)。ただし現状は**グローバルなオン/オフ**で、
  「近い人はVRM、遠い人はフラット動画」のような**参加者ごとの切り替えは無い**
  (`WebGLCanvas.tsx:155`が`vas.local`と`vas.remotes`全体に一括適用)。
- `WebGLCanvas.tsx`の`animate()`ループは表示されている**全VRMアバターを毎フレーム
  無条件に**ボーン更新・描画する。距離やオフスクリーン判定によるLOD/カリングは
  **一切存在しない**。2.5Dモードはアバターごとに個別`render()`呼び出しがあり、
  3Dモード(共有カメラで一括描画)よりコストが高い。
- MediaPipe/IK(`mediapipeCamera.ts`, `vrmIK.ts`)は**自分のカメラ分のみ**動作し、
  リモートアバターの表示数には依存しない(リモート側は受信済みrigを
  slerpで適用するだけ)。→ **MediaPipe自体は今回の負荷調整の対象外でよい**。

### 2.4 既存の負荷計測

- `MessageLoads.ts`の`loadData`/`loadRtc`は「シグナリングメッセージ処理キューが
  時間内に捌ききれているか」の指標であり、**CPU/GPU/ネットワークの直接計測ではない**。
  `StatusDialog.tsx`に表示されるのみで、何の判断にも使われていない。
- `RtcTransportStatsGot.ts`が`RTCPeerConnection.getStats()`由来のビットレート、
  `fractionLost`、RTT、jitterを既に収集し、observableに反映している。
  **ネットワーク輻輳検出の土台としてそのまま使える**。
- CPU負荷を直接測るAPI(`performance.now`によるフレーム時間計測、
  Compute Pressure API、`navigator.hardwareConcurrency`等)は**どこにも未使用**。
  今回新規に導入する必要がある。

### 2.5 設定の保存パターン

`LocalParticipant`の`MediaSettings`バンドル + `saveMediaSettingsToStorage()`/
`loadMediaSettingsFromStorage()`(`PersistentStore`経由) + `Fab3DSettings.tsx`の
チェックボックスUI、という既存パターンに新設定を追加する形にする。

## 3. 負荷の検出方式 {#load-detection}

ユーザーの整理どおり、負荷を2系統に分ける。**表示(VRM/動画描画)はCPU負荷のみに
影響し、ストリーム数(購読数)はCPU・ネットワーク両方に影響する。**この非対称性を
そのまま調整ロジックの分岐に反映する(§4.2)。

### 3.1 CPU負荷の検出

複数の信号を組み合わせ、単一の指標に依存しない(誤検知・機種依存を減らすため)。

1. **フレーム時間計測(主指標、必須)**
   `WebGLCanvas.tsx`の`animate()`ループ(現状`frameThrottleMs=60`で17fpsに自己制限)
   に、`performance.now()`で実測フレーム間隔を取る処理を追加する。
   目標フレーム間隔(60ms)に対する実測値の比率を
   `frameLoadRatio = 実測平均フレーム間隔 / 60ms`
   として直近N秒(例: 3秒)の移動平均を取る。`frameLoadRatio > 1.5`のような状態が
   続く = 「本来60msで済むはずの処理が90ms以上かかっている」= CPUが追いついていない。
   - これは表示アバターがゼロでも(WebGL自体が無効でも)動作するよう、
     アバター非表示時は別途「アイドル時フレーム時間」をベースラインとして計測し、
     相対値で判断する(端末性能差を吸収するため)。
2. **既存メッセージ処理負荷(補助指標)**
   `messageLoads.loadRtc`/`loadData`(既存、`MessageLoads.ts`)が同時に高い場合、
   「フレーム時間の悪化がGCの一時的な揺らぎではなく、実際にCPU全体が逼迫している」
   ことの裏付けとして使う(単独では使わない — シグナリング処理とレンダリングは
   別スレッド/別タイミングなので、フレーム時間の主指標と揺れ方が違うことがある)。
3. **Compute Pressure API(補助・任意)**
   `navigator.devices?.forEach ... new PressureObserver(...)`が使える環境
   (2026年時点でChromiumベースブラウザの一部)では、`'critical'`/`'serious'`状態を
   追加の早期警告として使う。**未対応ブラウザでは単に無視される**設計とし、
   主指標(フレーム時間)だけで機能が成立することを必須要件とする。
4. **(参考・将来検討)`performance.memory.usedJSHeapSize`**
   Chrome限定の非標準APIだが、「VRMアバター数が増えてメモリが逼迫している」を
   直接見られる数少ない手段。§7で将来検討として触れるに留め、v1のスコープには
   含めない(非標準API依存を増やしすぎない)。

### 3.2 ネットワーク負荷の検出

既存の`RtcTransportStatsGot.ts`が持つ値をそのまま再利用する。

1. **パケットロス率(主指標)**: `fractionLost`の直近移動平均。WebRTCの輻輳制御でも
   標準的に使われる最も直接的な輻輳シグナル。しきい値例: 移動平均が2%を超えたら
   軽度、5%を超えたら重度(要チューニング、下記§6参照)。
2. **RTT/jitterの悪化(補助指標)**: ベースライン(接続直後の安定値)からの相対的な
   増加を見る。絶対値でなく相対悪化を見ることで、そもそも遠距離で常時RTTが
   高いユーザーを誤検知しない。
3. **受信ビットレートの頭打ち**: 購読しているストリーム数から期待される受信
   ビットレートの理論値に対し、実測受信ビットレートが大きく下回っている場合、
   ダウンリンクが飽和している可能性が高い(送信側のエンコードビットレートは
   `config.rtc.maxBitrateForVideo`等でおおよそ既知)。

いずれもトランスポート単位の値なので、**受信用トランスポート(receive
transport)側の統計を対象にする**(送信側の輻輳は別問題として扱わない — 今回は
「他人のストリームが増えて自分が受信しきれない」ケースに焦点を当てる)。

### 3.3 検出結果の表現

```ts
type LoadLevel = 0 | 1 | 2 | 3  // 0=平常, 3=深刻

interface LoadState {
  cpu: LoadLevel
  network: LoadLevel
}
```

CPU・ネットワークを**独立した2つの段階値**として持つ(合成した単一スコアには
しない)。理由は§4.2で述べる通り、CPU起因とネットワーク起因で有効な対処が違うため。

## 4. 調整の仕組み {#adjustment-mechanism}

### 4.1 設計方針

- **完全にローカルな判断**。他の参加者には一切通知・同期しない(通知すると
  「Aさんの回線が悪いからBさんの映像を止める」ような誤った連鎖を生みかねない)。
- 既存の`remoteVideoLimit`/`remoteAudioLimit`(部屋のポリシー)は**変更しない**。
  新たに`autoVideoLimit`/`autoAudioLimit`(ローカルのみ、`Infinity`が既定=無制限)
  を導入し、`PriorityCalculator`が実際に使う値は
  `effectiveVideoLimit = min(remoteVideoLimit >= 0 ? remoteVideoLimit : Infinity, autoVideoLimit)`
  のように**両方の下限を取る**。
- **ヒステリシス必須**。負荷が閾値付近で揺れて購読のON/OFFを繰り返す
  ("フラッピング")のを防ぐため、
  - 悪化方向: 短い確認窓(例: 2秒間閾値超過が継続)で即座に1段階悪化。
  - 回復方向: 長い確認窓(例: 20秒間閾値未満が継続)で1段階だけ回復。
  - 悪化は速く、回復は慎重に、という非対称にする(音声通話アプリの輻輳制御の
    定石と同じ)。
- **一気に全部戻さない**。回復時は1段階ずつ、かつ1段階ごとに再度安定を確認してから
  次の段階に進む。

### 4.2 段階的デグレードラダー

CPU起因とネットワーク起因で有効な打ち手が異なる(VRM表示を止めても帯域は
減らないし、ストリーム数を減らせばCPUも帯域も両方減る)。そのため
**段階ごとに「CPU用アクション」と「ネットワーク用アクション」を分けて定義**し、
`LoadState.cpu`と`LoadState.network`それぞれのレベルに応じて独立に適用する。

#### CPU負荷への対応(`LoadState.cpu`に応じて)

| レベル | アクション |
|---|---|
| 0 (平常) | 制限なし |
| 1 (軽度) | **VRMアバターの距離ベースLOD**: `PriorityCalculator`と同じ優先度リストを再利用し、優先度下位(遠い/オンステージでない)アバターから`avatarDisplay`をVRM→フラット動画表示にローカルで切り替える(`autoAvatarLimit`)。動画ストリーム自体は止めない。 |
| 2 (中度) | レベル1に加え、`autoAvatarLimit`をさらに縮小。2.5Dモードを使っている場合は自動的に3Dモード相当の描画(共有カメラでの一括描画)にフォールバックし、アバターごとの個別`render()`呼び出しを削減。 |
| 3 (深刻) | `autoVideoLimit`を段階的に縮小(優先度下位の動画購読を止める)。CPU逼迫時は動画デコード自体が重いため、表示側の調整だけでは足りない場合にここまで踏み込む。 |

#### ネットワーク負荷への対応(`LoadState.network`に応じて)

| レベル | アクション |
|---|---|
| 0 (平常) | 制限なし |
| 1 (軽度) | `autoVideoLimit`を1段階縮小(優先度最下位の動画購読を1つ止める)。VRM表示はネットワーク帯域を消費しないため触らない。 |
| 2 (中度) | `autoVideoLimit`をさらに縮小。 |
| 3 (深刻) | `autoVideoLimit`を大きく縮小した上で、`autoAudioLimit`も縮小開始(オンステージ/ゾーン内は既存の優先度ロジックにより常に除外されるので、会話継続に必要な音声は残りやすい)。 |

**動画を音声より先に落とす**のは、既存の`PriorityCalculator`の優先度ロジックが
既にオンステージ音声を最優先扱いしていることと整合させ、実装上も
`autoVideoLimit`/`autoAudioLimit`を同じ仕組み(既存の優先度ソート済みリストを
先頭から`min(limit)`件だけ使う)で使い回せるため。

### 4.3 実際に適用される上限の合成

```
effectiveVideoLimit = min(
  remoteVideoLimit(部屋ポリシー, -1=無制限),
  autoVideoLimit(CPU由来の制限),
  autoVideoLimit(ネットワーク由来の制限)
)
```

CPU由来とネットワーク由来、両方が同じ`autoVideoLimit`という1つの値に効くのか、
別々に持って`min()`するのかは実装時に選ぶが、**「動画を減らす」というアクション自体は
共通**なので、内部的には1つの`autoVideoLimit`に対してCPU/ネットワークどちらの
理由でも縮小できるようにし、`LoadAdjuster`内部でどちらが要因だったかをログ/UIに
出す、という実装が自然。

### 4.4 新モジュール配置

`src/models/conference/LoadAdjuster.ts`(新規、`PriorityCalculator.ts`と同じ
ディレクトリ・同じような構造: `autorun`/`setInterval`で定期評価する`observable`
クラス)を新設する。

```ts
export class LoadAdjuster {
  @observable.ref loadState: LoadState = {cpu: 0, network: 0}
  @observable autoVideoLimit = Infinity
  @observable autoAudioLimit = Infinity
  @observable autoAvatarLimit = Infinity  // VRM表示する人数の上限(ローカル)
  @observable enabled = true  // ユーザー設定でON/OFF可能

  // WebGLCanvas.tsx の animate() から毎フレーム呼ぶ
  recordFrameTime(dtMs: number) { ... }

  // RtcTransportStatsGot 更新時に呼ぶ、または autorun で観測する
  private evaluateNetwork() { ... }

  private evaluateCpu() { ... }

  private applyHysteresis(...) { ... }
}
```

`PriorityCalculator`は`this.limits`計算時に`loadAdjuster.autoVideoLimit`/
`autoAudioLimit`を`remoteVideoLimit`/`remoteAudioLimit`と合成する形に変更する。
`WebGLCanvas.tsx`/`ParticipantLayer.tsx`は`loadAdjuster.autoAvatarLimit`と
既存の優先度順(`PriorityCalculator`の`tracksToConsume`と同じ並び)を使って、
「上位N人だけVRM表示、それ以外はフラット動画」を決める(**この「参加者ごとの
VRM表示切り替え」は現状グローバルスイッチしかないため新規実装が必要**、§2.3参照)。

### 4.5 ユーザー向けUI

- `Fab3DSettings.tsx`と同じパターンで「自動負荷調整」チェックボックスを追加
  (既定値は要検討 — 安全側に倒すなら既定ON)。
- 調整が実際に発動している間は`StatusDialog.tsx`の既存Load表示の隣に
  「負荷調整中 (video: 3/5, avatar: 2/4)」のような簡易表示を出し、
  「なぜ急に動画が減ったか分からない」という混乱を避ける。
- オンステージ/ゾーン内参加者は既存優先度ロジックにより自動調整の対象外(常に残る)
  — 新たな「ピン留め」UIは今回は追加しない(既存の仕組みで十分カバーできるため)。

## 5. データフロー図 {#data-flow}

```
WebGLCanvas.animate()  ──frame dt──>  LoadAdjuster.recordFrameTime()
RtcTransportStatsGot   ──stats────>  LoadAdjuster.evaluateNetwork()
                                            │
                                    (ヒステリシス付き段階判定)
                                            │
                                            ▼
                              loadState / autoVideoLimit / autoAudioLimit / autoAvatarLimit
                                    │                           │
                                    ▼                           ▼
                        PriorityCalculator.limits      WebGLCanvas / ParticipantLayer
                        (動画/音声購読数の上限)          (VRM表示するアバター数の上限)
```

## 6. 閾値のチューニングについて {#threshold-tuning}

本設計に書いた具体的な数値(フレーム比率1.5倍、パケットロス2%/5%、確認窓2秒/20秒等)
は**すべて初期値の目安であり、実機・実回線でのチューニングが前提**。実装時は
これらをコード上の定数として一箇所(`LoadAdjuster.ts`内)にまとめ、後から
調整しやすくする(既存の`vrmIkTuning.ts`と同じ考え方)。

検証方法としては:
- 意図的に多数のダミーVRMアバター/動画ストリームを持つテスト部屋を用意し、
  フレーム時間・購読数の変化を目視+ログで確認する。
- ネットワーク側はChrome DevToolsのネットワークスロットリングやLinuxの`tc`で
  意図的に帯域制限・パケットロスを注入し、`autoVideoLimit`が正しく縮小/回復するか
  確認する。

## 7. 将来検討・スコープ外 {#future-work}

- **simulcast/SVCの導入**: 現状「購読する/しない」の二値しかないが、simulcastを
  導入すれば「低解像度レイヤーだけ購読」という中間段階が持てる。効果は大きいが
  サーバ・クライアント両方の変更が必要な大きめの変更のため、本設計のv1には含めない。
- **`performance.memory`によるメモリ監視**: Chrome限定の非標準API。VRMアバター数と
  メモリ使用量の相関を先に実測してから導入判断する。
- **送信側(自分のアップロード帯域)の輻輳対応**: 本設計は受信側(他人のストリームが
  増えて自分が受信しきれない)にフォーカスしている。自分の上りが細い場合の
  送信ビットレート調整は別問題として扱う。
- **他参加者への通知・協調**: 「多くの参加者が同時に負荷超過している」ことを
  検出してサーバ側で何かする、といった協調的な仕組みは今回のスコープ外
  (完全にクライアントローカルな仕組みとする)。
