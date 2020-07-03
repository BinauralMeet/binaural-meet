# Protocol for Shared contents

### Specification

- Each participant can share new contents. 
  - Contents has id, type, text (URL), pose, size and timestamp properties. 
```tsx
class MapObject{
  pose: Pose2D
}
class Content: MapObject{
  id:string
  type:string
  url:string
  pose: PoseMap2D
  size: [number, number]
  zorder: number //  unix timestamp when shared or moved to top.
}```

- Each participant can control all shared contents.
- Even when a participant leave room, contents will remain.

### Protocol

Each participant has followings as participant as properties of Jitsi conference as: 

```tsx
ParticipantProperty{
  //  properties for contents
  contents:Content[]	// contents owned by this participant
  
  //  propaties to change the content
  update: Content[] 	// Update requrest to other participants. Once the content in the 'contents' is updated. The content must be removed from this array.
  remove: string[]	// Remove requiest to other participants. Once the content is removed, the id must removed from this array.
}
```

Arbitrations

- When a participant leave from the room. The contents owned by the participant will move to the next participant. 
 - Next means the participant with next larger id or the smallest id.
 - Until contents moved to next participant, the contents of left participant must be kept.
- When content with the same id owned by more than two participants, participant with smaller id loose the content.
- When two or more contents have the same zorder, the zorder of the content with the larger id will be incremented by the owner.
