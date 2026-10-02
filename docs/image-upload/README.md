# image-upload — 画像の貼り付け・アップロード(各自の Gyazo / Google Drive)

**いつ読むか**: 画像を貼っても何も起きない・表示されない / Gyazo との連携を触る /
アップロード先(Drive のフォルダ、Gyazo のアプリ)を変える / アバター画像のアップロードを触る

## 構成

マップへの貼り付け・画像の共有ダイアログ・アバター画像は、どれも同じ規則でアップロードする:
**その人が Gyazo と連携していれば、その人の Gyazo に。していなければ、または Gyazo が失敗したら Google Drive に。**
部屋で共有するのは、アップロード先の画像の URL だけ。

### 各自の Gyazo {#gyazo}

1. **連携**(各自、最初の1回): 画像の共有ダイアログの「Gyazo と連携」でポップアップを開き、Gyazo の
   許可のページへ(`GyazoAuth.ts`、`config.gyazoClientId`)。許可すると Gyazo は
   `config.gyazoRedirectUri`(`https://binaural.me/`、アプリに登録したもの)に `?code=...&state=...` を付けて戻す。
   そのページは自分がポップアップだと分かると、コードを開いた側に渡して閉じる(`handleGyazoCallback`、アプリは起動しない)。
   開いた側は main の `gyazoToken`(`bmMediasoupServer-architecture#gyazo-token`)でコードをトークンに交換し、
   localStorage に置く。トークンに期限は無い。本人が Gyazo 側で連携を解除すると 401 になり、そのとき忘れる
2. **アップロード**(`Gyazo.ts`): `upload.gyazo.com` は他のサイトから返事を読むことを許していない(CORS)。
   それでも、フォームの POST は送ること自体は止められないので、`mode: 'no-cors'` で送る。画像の説明(`desc`)に
   1枚ごとの目印「Binaural Meet <8桁の16進>」を付けておき、CORS を許している `api.gyazo.com` の一覧から
   その目印の画像を探して URL を得る。約4秒以内に見つからなければ失敗とみなす(no-cors の返事は成功も失敗も読めない)

### Google Drive {#gdrive}

ブラウザが画像を base64 で main に送り(`uploadFile`)、main がサービスアカウント
(`binaural-meet@binaural-meet.iam.gserviceaccount.com`)で `config.googleDriveUploadFolderId` のフォルダに置く。
URL は `https://drive.google.com/thumbnail?id=<ファイルID>&sz=w1000`。参加者は各自の Google アカウントで見るので、
フォルダは「リンクを知っている人は閲覧可」で、サービスアカウントがファイルを追加できる必要がある。今は共有ドライブの
「BMUploadImage」。5MB を超える画像は送らない。

## 構成ファイル一覧

| ファイル | 役割 |
|---|---|
| `src/models/api/GyazoAuth.ts` | 連携(ポップアップ、コードの受け渡し、トークンの保存・破棄) |
| `src/models/api/Gyazo.ts` | Gyazo へのアップロードと、目印による URL の取得 |
| `src/models/api/GoogleDrive.ts` | Drive へのアップロード(main の `uploadFile` 経由) |
| `src/stores/sharedContents/SharedContentCreator.ts` | `createContentOfImage`: Gyazo → Drive の順で試す |
| `src/components/footer/share/ImageInput.tsx` | 共有ダイアログ。Gyazo/Drive の選択と連携ボタン |
| `public/config.js` | `gyazoClientId`・`gyazoRedirectUri`(公開してよい値) |
| bmMediasoupServer `config.js`(本番 main) | `gyazo.clientSecret`(**秘密**)・`googleDriveUploadFolderId` |

## セキュリティ上の要点

- **Gyazo の `client_secret` は main の `config.js` にだけ置く。** このリポジトリも public/config.js も公開されている
- 以前はクライアントに共有のアクセストークンが書かれていた。誰でも取り出せ、その持ち主の Gyazo の画像を消すこともできた。
  今は各自のトークンが本人のブラウザにあるだけ
- Gyazo に上げた画像は、その人の Gyazo で(URL を知っている人に)公開される。Drive の画像も「リンクを知っている人は閲覧可」

## 既知の制限

- 同じ人が別の画面から同時に Gyazo に大量に上げると、最新10枚から目印の画像が押し出されて見つからないことがある
  (そのときは Drive に回る)
- 連携のポップアップがブラウザに止められると、連携できない(エラーとして表示する)
- 戻り先 URL はアプリの登録と完全に一致する必要がある。binaural.me 以外(開発環境など)では Gyazo と連携できない

## 設計判断の記録

### なぜ「各自の Gyazo」で、中継もサーバー経由も使わないのか {#why-own-gyazo}

2026-10-02、共有トークンが失効していた。新しいトークンを共有する案は、キーをブラウザに配る以上だれでも取り出せる
(画像の削除までできる)ので採らなかった。main 経由でアップロードする案も、ユーザーの希望(「アップロードは各自が行い
URL のみ BM で共有」)に合わないので採らなかった。CORS 中継(binaural.me の cors_proxy)を通す案も検討したが、
URL は CORS を許している `api.gyazo.com` から読めるので、中継は要らなかった。
