# Protocol for Shared contents

### Specification
- Each participant can share new content.
  - A content has id, type, text (URL), pose, size, name, and owner_name properties.

- Way to sync
  - Contents are owned by dataServer.
  - The dataServer does not distinguish the owner of the content.
  - When updated, the packet from the participant will update the server's content and be relayed to necessary participants.

```tsx
class MapObject{
  pose: Pose2D
}
class Content: MapObject{
  id:string
  type:string
  url:string
  size: [number, number]
  zorder: number //  unix timestamp when shared or moved to top.
}

```
- Each participant can control all shared contents.
- Even when a participant leaves the room, the contents will remain.
- When all participants leave the room, the contents in the room will gone.

### Arbitrations
- When two or more contents have the same zorder, the zorder of the content with the larger id will be incremented.
