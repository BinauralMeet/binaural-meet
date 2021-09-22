# Protocol for Shared contents

### Specification
- Each participant can share new contents.
  - Contents has id, type, text (URL), pose, size, name and owner_name properties.

- Way to sync
  - Via Jitsi
    - Each participant's property has contents.
    - When leave, the contents are owned by the next participant.
    - When update, the packet will sent to the owner.
  - Via relay
    - Contents are owned by relayServer and properties are not used.
    - Relayserver does not distinguish owners.
    - When update, packet will update the content on the server and relayed.

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
- Even when a participant leave room, contents will remain.

### Protocol
Each participant has followings as participant as properties of Jitsi conference (Prosody manages the information) as:
```tsx
ParticipantProperty{
  //  properties for contents
  contents:Content[]	// contents owned by this participant
 }
```

- Conference.sendMessage() is used to request to modify other's contents. See sendContentUpdateRequest() in src/model/ConferenceSync.ts

### Arbitrations

- When a participant leave from the room. The contents owned by the participant will move to the next participant.
 - Next means the participant with next larger id or the smallest id.
 - Until contents moved to next participant, the contents of left participant must be kept.
- When content with the same id owned by more than two participants, participant with smaller id loose the content.
- When two or more contents have the same zorder, the zorder of the content with the larger id will be incremented by the owner.
