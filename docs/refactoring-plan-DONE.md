# リファクタリング計画(完了・記録として保持)

> **このプランは完了済み**: 以下の全フェーズは `refactor/architecture-cleanup` ブランチで実行済み。
> 将来の計画としてではなく、当時の設計判断の記録として保持している。

> **前提**: この計画は MUI アップグレードの前段階として、コードベースの構造的問題を整理するためのもの。
> 実際のコード変更は行わず、方針の記録と合意形成を目的とする。

---

## 1. Stores の整理

### 現状

```
src/stores/
├── index.ts                    # 6つのストアを再エクスポート
├── Chat.ts                     # チャットメッセージ
├── Map.ts                      # マップ変換行列、スクリーンサイズ、参加者位置
├── MapObject.ts                # MapObject 基底クラス（pose のみ）
├── ErrorInfo.ts                # エラー状態 + 接続監視 + デバイス列挙 + テストBot
├── MessageLoads.ts             # 負荷計測（3つの数値のみ）
├── RoomInfo.ts                 # ルームプロパティ、ログイン/GDrive情報
├── Settings.ts                 # LPS設定のみ（localStorage保存）
├── utils.ts                    # Store<T> 型, shallowObservable
├── AudioParameters/            # 音響パラメータ（stereo）
│   ├── index.ts
│   └── StereoParameters.ts     # broadcast検出にparticipantsを参照
├── participants/
│   ├── index.ts
│   ├── Participants.ts         # 全参加者管理（シングルトン）
│   ├── ParticipantBase.ts      # 参加者基底（136行）
│   ├── LocalParticipant.ts     # ローカル専用ロジック（237行）
│   ├── RemoteParticipant.ts    # リモート参加者
│   ├── PlaybackParticipant.ts  # 再生参加者
│   └── localPlugins/
│       ├── index.ts
│       └── DevicePreference.ts
└── sharedContents/
    ├── SharedContents.ts       # 全コンテンツ管理（376行）
    ├── SharedContentCreator.ts # コンテンツ作成（499行）
    └── GDriveUtil.ts           # GDriveヘルパー
```

### 問題

1. **ストア間の依存関係が不透明** — `Map.ts` が `participants` を直接import、`ErrorInfo.ts` が `conference` を直接参照するなど、ストア層がモデル層やコンポーネント層と混ざっている。
2. **役割の混在** — `ErrorInfo.ts` にエラー状態表示、接続監視タイマー、デバイス列挙、テストBot起動が同居。
3. **シングルトンパターンに統一性がない** — 各ファイルが勝手に `export default new Xxx()` し、`declare const d:any; d.xxx = xxx` でグローバル公開。
4. **ストアとモデルの重複** — `@models/Participant.ts` の interface と `@stores/participants/` のクラスで似た定義が二重管理。
5. **`Settings.ts` のスコープが狭い** — LPS設定だけだが、LocalParticipant にも別途 localStorage 保存ロジックがある。

### 提案

#### Step 1: ストアのディレクトリ再編

```
src/stores/
├── index.ts              # 再エクスポートのみ（現状維持か簡略化）
├── room/
│   ├── RoomInfo.ts       # ルームプロパティ
│   ├── Settings.ts       # アプリ設定全般
│   └── Connection.ts     # （新設）接続状態・デバイス監視をErrorInfoから分離
├── map/
│   ├── Map.ts            # マップ変換行列（現状維持）
│   └── MapObject.ts      # MapObject 基底
├── chat/
│   └── Chat.ts           # チャットメッセージ（現状維持）
├── media/
│   ├── StereoParameters.ts  # AudioParameters/ から移動
│   └── MessageLoads.ts      # 現状維持
└── ...（participants/, sharedContents/ は現状維持で次工程）
```

ポイント:
- トップレベルに並んでいたストアをドメイン別サブディレクトリに集約
- `ErrorInfo.ts` から接続監視・デバイス列挙を分離し、エラー状態管理に純化
- `Settings.ts` のスコープを拡大し、LocalParticipant のストレージ保存も統合するか検討

---

## 2. Participant 継承構造の修正

### 現状

**モデル層（interface）:**
```
models/Participant.ts
├── ParticipantBase (interface extends MapObject)
│   ├── physics, mouse, viewpoint, id, information, zIndex, audioLevel ...
│   ├── getColor(), getColorRGB(), getTextColorRGB()
│   ├── tracks?, clip?, vrmRig?
├── RemoteParticipant (interface extends ParticipantBase)
│   ├── closedZone?, inLocalsZone, tracks, trackStates, audioLevel
├── LocalParticipant (interface extends ParticipantBase)
│   ├── soundLocalizationBase, avatarDisplay2_5D/3D, viewRotateByFace
│   ├── zone?, tracks, trackStates, audioLevel, faceDir, landmarks
├── PlaybackParticipant (interface extends ParticipantBase)
│   ├── trackStates, audioLevel
```

**ストア層（クラス）:**
```
stores/participants/ParticipantBase (class extends MapObject)
├── TracksStore, TrackStates, など observable 多数
├── information_: LocalInformation | RemoteInformation（getter/setterでキャスト）
├── LocalParticipant (extends ParticipantBase)
│   ├── get information(): LocalInformation（キャスト）
├── RemoteParticipant (extends ParticipantBase)
│   ├── get information(): RemoteInformation（キャスト）
├── PlaybackParticipant (extends ParticipantBase)
│   ├── tracks なし、trackStates のみ
```

### 問題

1. **`information` の型キャスト** — 基底クラスが `LocalInformation | RemoteInformation` と宣言し、サブクラスで getter/setter をオーバーライドしてキャストしている。TypeScript の型システムをバイパスしており、ランタイムエラーの原因になる。
2. **基底クラスに不要なプロパティ** — `tracks`, `vrmRig`, `recording` など RemoteParticipant には不要（RemoteParticipant は独自に `tracks` を持つが型が異なる可能性）。
3. **インターフェースとクラスの二重管理** — `models/Participant.ts` で定義した interface をストアクラスが `implements Store<IXxx>` で実装しているが、プロパティの過不足が生じやすい。
4. **`TracksStore` の扱い** — `ParticipantBase` が `new TracksStore()` を持つのに対し、RemoteParticipant は別に `new TrackStates()` も持つ。
5. **LocalParticipant の巨大化** — 237行。ストレージI/O、URL解析、Gravatar/VRM解決、顔追跡、デバイス設定が1クラスに。

### 提案

#### Step 2A: `information` 型の安全化

```typescript
// 現状の問題
class ParticipantBase {
  information_: LocalInformation | RemoteInformation;
  get information(): LocalInformation | RemoteInformation { return this.information_; }
  set information(value: LocalInformation | RemoteInformation) { this.information_ = value; }
}
class LocalParticipant extends ParticipantBase {
  get information(): LocalInformation { return this.information_ as LocalInformation; }
  set information(value: LocalInformation) { this.information_ = value; }
}
```

→ **解決策**: 型パラメータを使う

```typescript
class ParticipantBase<T extends BaseInformation = RemoteInformation> {
  @observable information: T;
  constructor(information: T) { this.information = information; }
}
class LocalParticipant extends ParticipantBase<LocalInformation> { ... }
class RemoteParticipant extends ParticipantBase<RemoteInformation> { ... }
```

これによりキャストが不要になり、コンパイル時に型チェックが効く。

#### Step 2B: `ParticipantBase` の責務整理

**Keep in ParticipantBase:**
- `id`, `pose`, `physics`, `viewpoint`, `mouse`, `zIndex`
- `audioLevel`, `muteAudio`, `muteVideo`, `muteSpeaker`, `recording`
- `getColor()`, `getColorRGB()`, `getTextColorRGB()`（共通ユーティリティ化も検討）
- `vrmRig`（全参加者に共通で持たせて良い）

**Move out:**
- `TracksStore` — LocalParticipant, RemoteParticipant のみ。型を interface に統一
- `TrackStates` — RemoteParticipant, PlaybackParticipant のみ。LocalParticipant は computed で提供
- ストレージ保存/読込 — `LocalParticipant` から分離して `Settings` 系ストアへ
- Gravatar/VRM解決 — ユーティリティ関数として独立

#### Step 2C: モデル interface の整理

`@models/Participant.ts` の interface を原則維持するが、ストア層との重複を減らす方向を検討。
具体的には、必要最小限の interface 定義にとどめ、実装クラスの型は実装自身が提供する方式も検討。

---

## 3. Content の型別データ構造化

### 現状

```typescript
// src/models/ISharedContent.ts
export type ContentType = 'img' | 'text' | 'pdf' | 'youtube' | 'iframe' | 'screen'
  | 'camera' | 'gdrive' | 'whiteboard' | 'playbackScreen' | 'playbackCamera' | ''

export interface ISharedContent extends MapObject, SharedContentData, SharedContentId {
  // 全型が同じインターフェースを共有
  name: string, ownerName: string, color: number[], textColor: number[],
  type: ContentType, url: string, size: [number, number], originalSize: [number, number],
  id: string, zorder: number, pinned: boolean, ...
}

// src/components/map/Share/Content.tsx
// if-else 連鎖で型ごとにレンダリング分岐
if (props.content.type === 'img') { ... }
else if (props.content.type === 'iframe' || props.content.type === 'whiteboard') { ... }
else if (props.content.type === 'youtube') { ... }
else if (props.content.type === 'gdrive') { ... }
else if (props.content.type === 'pdf') { ... }
else if (props.content.type === 'text') { ... }
else if (props.content.type === 'screen' || props.content.type === 'camera') { ... }
else if (props.content.type === 'playbackScreen' || props.content.type === 'playbackCamera') { ... }
```

### 問題

1. **型の区別が文字列のみ** — `type: ContentType` の文字列だけが型を区別する手段。TypeScriptの型システムが活かせていない。
2. **全型が同じデータ構造** — 画像には `originalSize` が重要だが、テキストには `url` に JSON が入る、YouTube には URL パラメータが必要…と型ごとに意味が異なるフィールドが同一インターフェースに詰め込まれている。
3. **レンダリングのif-else連鎖** — `Content.tsx` で11種類の型をif-elseで分岐。新しい型追加が困難。
4. **コンテンツ作成ロジックの集中** — `SharedContentCreator.ts` (499行) にURL解析、Gyazo/GDriveアップロード、画像サイズ取得、各型のバリデーションが混在。
5. **型別バリデーション関数が散在** — `isContentEditable()`, `isContentMaximizable()`, `isContentRequireLogin()`, `isContentWallpaper()`, `canContentBeAWallpaper()` が `ISharedContent.ts` で独立した関数として定義。
6. **playbackScreen/playbackCamera の扱い** — ContentType に含まれているが、実質的に screen/camera と別物。`SharedContents.ts` の `all` 配列で roomContents と playbackContents をマージして扱っているため、型階層が複雑。

### 提案

#### Step 3A:  discriminated union による型別データ構造

```typescript
// 理想形（イメージ）
interface ContentBase extends MapObject {
  id: string;
  name: string;
  ownerName: string;
  color: number[];
  textColor: number[];
  zorder: number;
  pinned: boolean;
}

interface ImageContent extends ContentBase {
  type: 'img';
  url: string;
  size: [number, number];
  originalSize: [number, number];
}

interface TextContent extends ContentBase {
  type: 'text';
  messages: TextMessages;  // url にJSON文字列として埋めるのではなく型として表現
  size: [number, number];
}

interface YouTubeContent extends ContentBase {
  type: 'youtube';
  params: Map<string, string>;  // URLパラメータを構造化
  size: [number, number];
}

// ... 各型ごとに interface を定義

// 共用体型としてエクスポート
type SharedContent = ImageContent | TextContent | YouTubeContent | PDFContent
  | IFrameContent | ScreenContent | CameraContent | GDriveContent
  | WhiteboardContent | PlaybackScreenContent | PlaybackCameraContent;
```

**備考**: これは大規模な変更になる。既存コードとデータ互換性（サーバーとの送受信、localStorage 保存）を維持するために、以下の段階的アプローチを推奨する。

#### Step 3B: 段階的導入案

**Phase 1 — 型別レンダリングの多相化（if-else 排除）**
- `Content.tsx` の if-else 連鎖を、型→コンポーネントのマップに置き換え
- 各型のレンダリングコンポーネントを統一インターフェースで登録

```typescript
const contentRenderers: Record<string, React.FC<ContentProps>> = {
  img: ImageContentComponent,
  text: TextContentComponent,
  youtube: YouTubeComponent,
  // ...
}
```

**Phase 2 — 共有データ構造の型安全化**
- `ISharedContent` を discriminated union に変更
- シリアライズ/デシリアライズ用の変換関数を用意（既存の `contentsToSend`, `receiveToContents`, `loadToContents` を拡張）
- `url` にエンコードしていたデータを適切な型に分解

**Phase 3 — コンテンツ作成ロジックの分散**
- `SharedContentCreator.ts` から型ごとの作成関数を分離
- 各型の作成関数を `createContent/` サブディレクトリに配置

```
src/models/content/
├── types.ts            # discriminated union 定義
├── serialize.ts        # 送信用/保存用変換
├── create/
│   ├── image.ts        # createContentOfImage など
│   ├── text.ts
│   ├── youtube.ts
│   ├── gdrive.ts
│   └── iframe.ts
└── predicates.ts       # isContentEditable など（現在の ISharedContent.ts から移動）
```

#### Step 3C: ゾーン情報の整理

現在、`SharedContents` クラスで:
- `@observable.shallow zones: ISharedContent[]` — `.filter(c => c.zone !== undefined)`
- `@observable.shallow closedZones: ISharedContent[]` — `.filter(c => c.zone === 'close')`

これらは computed 相当のものだが、`updateAll()` 内で手動更新している。
→ computed として定義し直すか、ゾーンのみを扱う独立したモデルに分離することを検討。

```typescript
// SharedContents 内で computed 化（MobX v6 対応）
@computed get zones() {
  return this.sorted.filter(c => c.zone !== undefined).reverse();
}
@computed get closedZones() {
  return this.zones.filter(c => c.zone === 'close');
}
```

---

## 4. 実施手順（推奨順序）

### Phase A: 影響の少ないものから（1〜2日）

1. **ストアディレクトリ再編** — ファイル移動と import 修正。動作に影響しない機械的作業。
   - `AudioParameters/` → `media/`
   - `MessageLoads.ts` → `media/`
   - `ErrorInfo.ts` からデバイス列挙・テストBotを分離（まず関数として外出し）
   - `Settings.ts` のスコープ拡大

2. **Content.tsx の if-else → レンダラマップ化**
   - 既存の各コンポーネント（GDrive, PDF, Text, YouTube, ScreenContent 等）はそのまま
   - `RawContent` 内の条件分岐のみレンダラマップに置き換え
   - 新しい型追加が容易になる

### Phase B: Participant 継承の整理（2〜3日）

3. **`information` の型パラメータ化**
   - `ParticipantBase<T>` に変更
   - `LocalParticipant extends ParticipantBase<LocalInformation>`
   - `RemoteParticipant extends ParticipantBase<RemoteInformation>`
   - `PlaybackParticipant extends ParticipantBase<RemoteInformation>`
   - コンポーネント側の型アサーションを削除

4. **`ParticipantBase` の責務整理**
   - `TracksStore` を LocalParticipant と RemoteParticipant のみに
   - ストレージ保存ロジックを LocalParticipant から分離

### Phase C: Content の型安全化（3〜5日、MUIアップグレード前の最大の変更）

5. **`ISharedContent` を discriminated union に** — もっとも影響範囲が大きい
   - 全コンポーネントの `props.content.type === 'xxx'` を型ガードに
   - シリアライズ/デシリアライズ関数の整備
   - `SharedContentCreator.ts` の分割

6. **ゾーン計算の整理**
   - `SharedContents` 内のゾーン更新を computed 化
   - ゾーン関連ロジックの明確化

### Phase D: MUI アップグレード（Phase C 完了後）

---

## 5. リスクと注意点

1. **データ互換性**: 特に Content の discriminated union 化は、サーバーとの通信フォーマット（`SharedContentDataToSend` 等）に影響する。`contentsToSend()` / `receiveToContents()` / `loadToContents()` の変更を慎重に行う必要がある。

2. **MobX のリアクティビティ**: computed への変更が既存の observer コンポーネントの再描画に影響しないか確認。特に `zones`, `closedZones` を手動更新から computed に変更する際は注意。

3. **循環参照**: `Map.ts` → `participants` → `Conference` → ... の循環依存が既存。これを解消するには interface 経由の依存か、イベント駆動への移行が必要。

4. **テスト範囲**: このリファクタリングは MUI アップグレードの前提であり、各 Phase 完了後に `tsc` と `vite build` が通ることを確認すること。動作確認は MUI アップグレード後にまとめて行う判断も可能。

5. **段階的コミット**: 各 Phase ごとにコミットし、レビュアブルな単位を保つ。機械的なリファクタリングとロジック変更は混在させない。

---

## 6. 未確定・議論が必要な点

1. **`Store<T>` 型ユーティリティ**: `stores/utils.ts` で `export type Store<T> = { [K in keyof T]: T[K] | (T[K] & IObservable) }` としているが、これが実際に役立っているか要検証。不要なら削除。

2. **EventEmitter の継承**: `SharedContents extends EventEmitter` としているが、MobX との併用で設計が複雑になっている。イベント部分を MobX の reaction/authorun に置き換えられるか検討。

3. **グローバル公開**: `declare const d:any; d.xxx = xxx` が多数のストアで使われている。デバッグ用途なら維持、そうでなければ削除。

4. **`localPlugins/` ディレクトリ**: 現在 `DevicePreference.ts` のみ。将来プラグイン機構を目指した構造と思われるが、今のままならフラットに統合しても良い。
