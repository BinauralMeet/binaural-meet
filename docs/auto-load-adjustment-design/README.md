# 自動負荷調整機能

**いつ読むか**: 自動負荷調整機能(クライアント側の負荷検出・購読数自動調整)を触る /
`LoadAdjuster`/`LoadAdjusterLogic`の閾値・上限テーブルを調整する / この機能の
設計判断・見送った案を確認する

実装済み(`LoadAdjuster.ts`/`LoadAdjusterLogic.ts`、`refactoring-plan-done`と同時期の
2026-07-29)。当初の設計からいくつか簡略化して実装している。差分は末尾の
`設計判断の記録`を参照。

## 1. 背景・目的 {#background}

参加者数・画面共有・VRMアバターが増えると、各クライアントの

- **CPU負荷**(WebGL描画、VRMボーン更新、動画デコード)
- **ネットワーク負荷**(受信ビットレート、パケットロス)

が増大し、動作が不安定になる。購読するビデオ/オーディオ数の上限
(`remoteVideoLimit`/`remoteAudioLimit`)は**管理者が手動で設定する固定値**であり、
個々のクライアントの実際の負荷状況には反応しない。

本機能は、各クライアントが**自分自身の負荷を検出し、自動的に購読数・VRM表示数を
下げる(そして負荷が下がれば戻す)**ローカル専用の仕組みを追加する。

## 2. 前提: 既存アーキテクチャの整理 {#existing-architecture}

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

→ `LoadAdjuster`はこの値を直接書き換えず、`PriorityCalculator.ts`が
`LoadAdjusterLogic.combineLimit(roomLimit, autoLimit)`で室内ポリシーと合成する
(下記§4.3)。

### 2.2 ストリームの品質段階

- **simulcast/SVCは未使用**。送信側エンコードは常に単一レイヤー
  (`RtcTransports.ts:248`)。受信側にも`consumer.setPreferredLayers()`等のレイヤー
  選択APIは呼ばれていない。
- **つまり単一ストリームの画質を段階的に下げる手段が無い**。取れる手段は実質
  「購読するか/しないか」の二値のみ。simulcast導入は別の大きな変更として
  スコープ外(§7)。

### 2.3 VRMアバター描画のコスト

- `avatarDisplay2_5D`/`avatarDisplay3D`は`LocalParticipant`の`@observable`で、
  ローカル(自分の画面にどう見せるか)の設定であり、送信内容には影響しない
  (`LocalParticipant.ts:91-92`)。参加者ごとの切り替えは無く、グローバルな
  オン/オフのまま(`LoadAdjuster`もこのモード自体は切り替えない、§4.2)。
- `WebGLCanvas.tsx`の`animate()`ループは、`loadAdjuster.autoAvatarLimit`が有限の
  ときだけ、ローカル参加者から近い順に上位N人のVRMアバターだけを毎フレーム
  更新・描画する(`selectAvatarsToRender()`, `WebGLCanvas.tsx:37-50`)。除外された
  アバターは**アンロードはされず**(`vas.remotes`に残る)、更新・描画コストだけを
  スキップする。
- MediaPipe/IK(`mediapipeCamera.ts`, `vrmIK.ts`)は自分のカメラ分のみ動作し、
  リモートアバターの表示数には依存しない。`LoadAdjuster`の対象外。

### 2.4 負荷計測に使っている値

- **CPU**: `WebGLCanvas.tsx`の`animate()`ループが、実際に描画したフレームごとの
  実測間隔を`loadAdjuster.recordFrameInterval(actualMs, targetMs)`に渡す
  (`targetMs`は`frameThrottleMs=60`)。
- **ネットワーク**: 各リモート参加者の`quality`(0-100、`RtcTransportStatsGot.ts`が
  `fractionLost`から算出、`ParticipantBase.ts:78`)を平均した値を使う。RTT/jitter/
  受信ビットレートは検出には使っていない(§7参照 — 見送った)。
- `MessageLoads.ts`の`loadData`/`loadRtc`は`StatusDialog.tsx`表示用のままで、
  `LoadAdjuster`には使っていない。

### 2.5 設定の保存パターン

`LocalParticipant.autoLoadAdjustment`(既定値`true`)を、既存の`MediaSettings`
バンドル + `saveMediaSettingsToStorage()`/`loadMediaSettingsFromStorage()`の
パターンに沿って追加している(`LocalParticipant.ts:76,99,181,208`)。

## 3. 負荷の検出方式 {#load-detection}

CPU・ネットワークを独立した2つの段階値として持つ(`LoadState = {cpu, network}`、
`LoadAdjusterLogic.ts`)。**表示(VRM描画)はCPU負荷のみに影響し、ストリーム数
(購読数)はCPU・ネットワーク両方に影響する**という非対称性を調整ロジックの
分岐に反映する(§4.2)。

### 3.1 CPU負荷の検出

`recordFrameInterval(actualMs, targetMs)`が呼ばれるたびに`actualMs/targetMs`を
直近`CPU_FRAME_RATIO_WINDOW`(30サンプル)の移動平均に加え、
`CPU_LEVEL_UP_THRESHOLDS = [1.3, 1.6, 2.0]`と比較してレベル0-3を決める
(`levelFromUpThresholds()`)。単一指標(フレーム時間比率)のみで、
Compute Pressure API・`MessageLoads`との相関・`performance.memory`は
使っていない(§7)。

### 3.2 ネットワーク負荷の検出

全リモート参加者の`quality`(0-100、平均。リモートが居ない/`quality`未定義なら
100=平常とみなす)を`NETWORK_LEVEL_DOWN_THRESHOLDS = [80, 60, 40]`と比較して
レベル0-3を決める(`levelFromDownThresholds()`)。`quality`は受信トランスポートの
`fractionLost`由来の単一値で、RTT/jitter/受信ビットレートの頭打ちは個別には
見ていない(§7)。

### 3.3 段階の適用

`stepLoadLevel()`が生の(閾値だけで決まる)レベルに対してヒステリシスを掛けて
実際に使うレベルを1段階ずつ動かす(§4.1)。CPU用・ネットワーク用に別々の
`HysteresisState`を持つ。

## 4. 調整の仕組み {#adjustment-mechanism}

### 4.1 ヒステリシス

`stepLoadLevel(state, rawLevel, now)`(`LoadAdjusterLogic.ts`)がフラッピング防止を
担う:

- 悪化方向(`rawLevel > current`): `CONFIRM_WORSEN_MS`(2000ms)継続したら1段階だけ悪化。
- 回復方向: `CONFIRM_RECOVER_MS`(20000ms)継続したら1段階だけ回復。
- 一気に複数段階は動かない(`rawLevel`が3に飛んでも1段階ずつ)。
- `participants.local.autoLoadAdjustment`がOFFの間は`resetToDisabled()`で
  ヒステリシスを経由せず即座に無制限へ戻す(`LoadAdjuster.ts:59-69`) —
  OFFにした操作は即時に反映されるべきで、回復のような緩やかな遷移は不要という判断。

### 4.2 レベルごとの上限テーブル

CPU起因とネットワーク起因で有効な打ち手が異なる(VRM表示を止めても帯域は
減らないし、ストリーム数を減らせばCPUも帯域も両方減る)ため、CPUレベル用と
ネットワークレベル用の上限テーブルを別々に持ち、`videoLimitFor()`が両方の`min()`
を取る(`LoadAdjusterLogic.ts:32-35, 82-90`)。

| レベル | `AVATAR_LIMIT_BY_CPU_LEVEL` | `VIDEO_LIMIT_BY_CPU_LEVEL` |
|---|---|---|
| 0 | ∞ | ∞ |
| 1 | 6 | ∞ |
| 2 | 3 | ∞ |
| 3 | 1 | 3 |

| レベル | `VIDEO_LIMIT_BY_NETWORK_LEVEL` | `AUDIO_LIMIT_BY_NETWORK_LEVEL` |
|---|---|---|
| 0 | ∞ | ∞ |
| 1 | 6 | ∞ |
| 2 | 3 | ∞ |
| 3 | 1 | 6 |

CPU側はレベル1-2ではVRM描画数だけを削り(動画購読は減らさない)、レベル3で
初めて動画購読数にも踏み込む。ネットワーク側は動画購読数を先に削り、レベル3で
音声購読数にも踏み込む(オンステージ/ゾーン内は既存の優先度ロジックで常に
除外されるので、会話継続に必要な音声は残りやすい)。この非対称は当初の設計
(§4.2、旧稿)のねらいをそのまま引き継いでいる。

### 4.3 上限の合成

```ts
// PriorityCalculator.ts
combineLimit(local.remoteVideoLimit, loadAdjuster.autoVideoLimit)
combineLimit(local.remoteAudioLimit, loadAdjuster.autoAudioLimit)
```

`combineLimit(roomLimit, autoLimit)`(`LoadAdjusterLogic.ts:95-99`)は、
`autoLimit`が`Infinity`ならそのまま`roomLimit`(-1=無制限含む)を返し、それ以外は
`roomLimit`が無制限でも`autoLimit`側の値を使う、両方有限なら小さい方を取る —
**室内ポリシーを緩めることは絶対にない**、という不変条件を関数として固定している。

### 4.4 モジュール構成

想定していた単一の`LoadAdjuster.ts`ではなく、2ファイルに分割されている:

- `LoadAdjusterLogic.ts` — 純粋関数・定数のみ(`@stores/`等のシングルトンを
  importしない)。閾値・上限テーブル・ヒステリシス・`combineLimit`・
  `selectByProximity`はすべてここにあり、`__tests__/LoadAdjusterLogic.test.ts`で
  ブラウザ環境無しに単体テストできる。
- `LoadAdjuster.ts` — `LoadAdjusterLogic`を実ストア(`participants`, MobX
  `autorun`)に繋ぐ副作用側。`autorun`でネットワーク側を評価し、
  `recordFrameInterval()`がCPU側を評価する。`loadAdjuster`という単一
  シングルトンをexportする。

`PriorityCalculator.ts`は`combineLimit()`を、`WebGLCanvas.tsx`は
`selectByProximity()`(`selectAvatarsToRender()`経由)を、それぞれ
`LoadAdjusterLogic`から直接importして使う。

### 4.5 ユーザー向けUI

- `Fab3DSettings.tsx`の`LoadAdjustmentSetting`が「自動負荷調整」チェックボックス
  (既定ON、`MediaSettings`経由で永続化)。
- `StatusDialog.tsx`の`adjustStr()`が`cpu{N}/net{N} avatar≤6 video≤3 ...`
  形式で現在の状態を一行表示する(OFFなら`off`)。

## 5. データフロー {#data-flow}

```
WebGLCanvas.animate()        ──actualMs/targetMs──> LoadAdjuster.recordFrameInterval()
participants.remote[].quality ──autorun──────────>  LoadAdjuster内のネットワーク評価
                                                            │
                                              stepLoadLevel() (ヒステリシス)
                                                            │
                                                            ▼
                                    loadState / autoVideoLimit / autoAudioLimit / autoAvatarLimit
                                            │                                │
                                            ▼                                ▼
                              PriorityCalculator.limits            WebGLCanvas.selectAvatarsToRender()
                              (combineLimitで室内ポリシーと合成)      (近い順N人だけ更新・描画)
```

## 6. 閾値・上限テーブル {#threshold-tuning}

すべて`LoadAdjusterLogic.ts`冒頭にコード上の定数としてまとまっている
(§4.2の表 + `CONFIRM_WORSEN_MS`/`CONFIRM_RECOVER_MS`/`CPU_FRAME_RATIO_WINDOW`)。
コード自身のコメントが明記する通り、**すべて実機・実回線でのチューニング前提の
初期値の目安**であり、実測に基づく調整はまだ行っていない。

検証方法(未実施):
- 意図的に多数のダミーVRMアバター/動画ストリームを持つテスト部屋を用意し、
  フレーム時間・購読数の変化を目視+ログ(`priorityLog`)で確認する。
- ネットワーク側はChrome DevToolsのネットワークスロットリングやLinuxの`tc`で
  意図的に帯域制限・パケットロスを注入し、`autoVideoLimit`が正しく縮小/回復するか
  確認する。

## 7. 将来検討・スコープ外 {#future-work}

- **simulcast/SVCの導入**: 「低解像度レイヤーだけ購読」という中間段階が持てるが、
  サーバ・クライアント両方の変更が必要な大きめの変更のためスコープ外。
- **`performance.memory`によるメモリ監視**: Chrome限定の非標準API。VRMアバター数
  とメモリ使用量の相関を先に実測してから導入判断する。
- **送信側(自分のアップロード帯域)の輻輳対応**: 本機能は受信側(他人のストリームが
  増えて自分が受信しきれない)にフォーカスしている。
- **他参加者への通知・協調**: 「多くの参加者が同時に負荷超過している」ことを
  検出してサーバ側で何かする、といった協調的な仕組みはスコープ外
  (完全にクライアントローカルな仕組みのまま)。
- **ネットワーク検出のRTT/jitter/受信ビットレート**: `quality`(fractionLost由来)
  1本に絞ったため、パケロス以外の輻輳(帯域飽和だがロスは出ていない、等)は
  検出できない。実運用で`quality`単独では不十分と分かれば追加する。
- **Compute Pressure API・`MessageLoads`相関**: CPU検出の補助指標として当初検討
  したが実装していない(§設計判断の記録)。

## 設計判断の記録 {#design}

当初のドラフト(旧稿、2026-07-29作成)からの実装時の簡略化:

- **検出指標を単一化した**: CPU=フレーム時間比率のみ、ネットワーク=`quality`
  (fractionLost由来)のみとし、ドラフトが挙げていた補助指標(Compute Pressure API、
  `MessageLoads`相関、RTT/jitter、受信ビットレート頭打ち)は実装しなかった。
  理由: 主指標だけでまず動くものを作り、実運用で不十分と分かった時点で個別に
  追加する方が、最初から複数指標を組み合わせて閾値調整するより検証しやすい。
- **CPU対応をVRM表示モード切替でなく人数カリングに統一した**: ドラフトが想定した
  「VRM→フラット動画への切替」「2.5D→3Dモードへの自動フォールバック」は実装せず、
  `selectByProximity`で近い順N人だけ更新・描画する一つの仕組みに統一した。理由:
  表示モードの動的切替は状態遷移(いつ戻すか、切替中の見た目のちらつき等)が
  増えるが、既存の優先度ソートをそのまま使えるカリングなら`PriorityCalculator`の
  実装パターンを再利用でき、実装・検証コストが小さい。
- **ロジックと副作用を分離した**: `LoadAdjusterLogic.ts`(純粋関数)と
  `LoadAdjuster.ts`(MobX/`@stores/`側)に分割した。理由:
  `@stores/`をimportすると`StereoManager`等がブラウザの`AudioContext`を要求し、
  Node環境の単体テストが書けなくなるため。
- **`performance.memory`は見送った**: Chrome限定の非標準APIで、VRMアバター数との
  相関も未実測のため、v1のスコープに入れなかった(ドラフトの判断を維持)。
