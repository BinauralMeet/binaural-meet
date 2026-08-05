# Shared contents

**いつ読むか**: sharedContent周りのstore(ContentStore/ContentSyncService/ContentTrackStore/PlaybackStore)に触る / コンテンツの同期・zorder・RTCトラックの扱いを確認する

> Rewritten after the `refactor/architecture-cleanup` roadmap (Phase 5/6) split
> the former `SharedContents` god-class into four focused stores. This
> describes the current shape; see that branch's commit history for how it
> got here.

### Data model

- `ISharedContent` (`src/models/ISharedContent.ts`) is a single interface, not
  a union type: every content has an `id`, `type` (`ContentType` — `'img' |
  'text' | 'pdf' | 'youtube' | 'iframe' | 'screen' | 'camera' | 'gdrive' |
  'whiteboard' | 'playbackScreen' | 'playbackCamera' | ''`), pose, size,
  `zorder`, `name`/`ownerName`.
- Behavior that varies per type (editable? maximizable? requires login? is an
  RTC track?) lives as free functions in that same file
  (`isContentEditable`, `isContentMaximizable`, `isContentRtc`, ...), each a
  `switch` over `c.type` ending in `assertNeverContentType(c.type)` — adding a
  new `ContentType` without updating one of these switches is a compile error,
  not a silent fallthrough.
- `zorder` is a Unix timestamp (ms / `TIME_RESOLUTION_IN_MS`) set when a
  content is shared or moved to top/bottom (`moveContentToTop`/
  `moveContentToBottom` in `ContentStore.ts`). Wallpapers use a separate low
  range (`<= TEN_YEAR`); everything else sits above it.

### The four stores (`src/stores/sharedContents/`)

| Store | Owns | Notes |
|---|---|---|
| `ContentSyncService` | `roomContents`/`roomContentsInfo` (the raw synced collections), local CRUD (`addLocalContent`, `removeByLocal`, ...), remote update/remove handling, the "who is editing" flag | Sends/receives through `ContentSyncTransport`, injected once by `Conference` via `setSyncTransport(this)` — this store (like other stores) never imports `@models/conference` directly, only the small transport interface |
| `ContentTrackStore` | `contentTracks` (cid → `MediaStreamTrack[]`), `mainScreenStream`/`mainScreenOwner` | Local RTC track bookkeeping only, no network protocol of its own |
| `PlaybackStore` | `playbackContents`, `playbackClips` (recorded-clip playback) | Fully independent of sync/RTC — a recorded content is never sent over the wire |
| `ContentStore` | Derived view state: `all`/`sorted`/`zones`/`closedZones`, `pasted`, `screenFps` | Reactively recomputed (MobX `autorun`) from `ContentSyncService.roomContents` + `PlaybackStore.playbackContents`; this is what components render from |

`SharedContentCreator.ts` holds the factory functions (`createContent`,
`defaultContent`) and the send/save field allowlists used when serializing a
content for the wire or for export.

### Sync behavior

- Contents are owned by the server (`dataServer`); the server does not
  distinguish who owns a content.
- A local update goes through `ContentSyncService.updateByLocal()`, which
  writes `roomContents` locally and calls
  `syncTransport.sendContentUpdateRequest()` — relayed to other participants
  by the server.
- Any participant can update or remove any content. A content outlives the
  participant that created it; it is only gone once every participant has
  left the room.
