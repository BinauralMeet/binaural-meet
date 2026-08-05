# Testing Guide (test.binaural.me)

**いつ読むか**: このホスト上でBinaural Meetを動かして手動・CDP経由でテストする

このサーバー上で Binaural Meet の開発・テストを行う際の手順。
サーバー起動やmediasoupポート運用など、クライアント/サーバーをまたぐ運用面の詳細は
親workspace `bm/` の `dev-environment` トピック(`bm` で `doc show dev-environment`)
を参照。

## 1. 開発サーバーの起動 {#dev-server}

### 内部アクセス用（通常の開発）

```bash
yarn start
# → http://localhost:3000/
```

### 外部ブラウザからの確認用

```bash
yarn start:sandbox-proxy
# → https://test.binaural.me/sandbox/port3000/
```

初回アクセス時は Google OAuth ログインが必要。

## 2. ヘッドあり Chrome を使った自動テスト {#headful-chrome-testing}

このサーバーには、WebGL 対応（SwiftShader）のヘッドあり Chrome が常駐している。
Playwright または CDP 経由で操作できる。

### 接続情報

- CDP エンドポイント: `ws://x.y.z.w:z/...`
- HTTP エンドポイント: `http://x.y.z.w:z/json`
- WebGL: ✅ SwiftShader ソフトウェアレンダリング
- フェイクメディア: ✅ `--use-fake-device-for-media-stream`
- ポートはユーザーごとに割り当てられる(サンドボックス環境固有の採番)

### Playwright サンプル

```javascript
const { chromium } = require('playwright');
const browser = await chromium.connectOverCDP('http://x.y.z.w:z');
const page = await browser.newPage();

// エラー監視
page.on('pageerror', err => console.log('[PAGE_ERROR]', err.message));

// ルーム参加
await page.goto('http://localhost:3000/sandbox/port3000/', { waitUntil: 'domcontentloaded' });
await page.fill('input[name="entrance-name"]', 'TestBot');
await page.fill('input[name="entrance-venue"]', 'testroom');
await page.click('button:has-text("Enter")');
await page.waitForTimeout(3000);

// Entrance バイパス
await page.evaluate(() => { if (d.error) d.error.clear(); });
```

### ?testBot モード

サーバー接続不要で UI テストのみ行う場合:

```
http://localhost:3000/sandbox/port3000/?testBot
```

管理画面のテストには `d.roomInfo.isAdmin = true` が必要。

### RoomInfo ストアの操作（d.roomInfo 経由）

```javascript
// 背景色変更（Back color 相当）
d.roomInfo.backgroundFill = [100, 150, 200];

// パターン色変更（Pattern color 相当）
d.roomInfo.backgroundColor = [200, 100, 50];

// 初期値リセット（Default ボタン相当）
d.roomInfo.backgroundFill = d.roomInfo.defaultBackgroundFill;
d.roomInfo.backgroundColor = d.roomInfo.defaultBackgroundColor;
```

## 3. ユニットテスト {#unit-tests}

```bash
yarn test        # 全テスト実行
yarn test:watch  # ウォッチモード
```

テストフレームワーク: Vitest + @testing-library/react + jsdom

## 4. SketchPicker（カラーピッカー）テスト {#sketchpicker-test}

プリセットカラーのスウォッチをクリックして onChange を発火:

```javascript
const picker = document.querySelector('.sketch-picker');
for (const div of picker.querySelectorAll('div')) {
  const s = div.getAttribute('style') || '';
  if (s.includes('width: 16px') && s.includes('height: 16px')) {
    const inner = div.querySelector('div');
    if (inner) (inner as HTMLElement).click();
  }
}
```

## 5. 既知の注意点 {#known-issues}

- `freeRenderTarget` は null セーフ（`src/models/utils/vrm.ts`）
- `freeThreeContext` は `forceContextLoss()` を呼ばない（キャンバス再マウント時に WebGL コンテキストを維持）
- RD 接頭辞の YouTube プレイリストは `loadList` 非対応のため `load(videoId)` にフォールバック
