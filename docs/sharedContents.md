# Protocol for Shared contents

### Specification

- Each participant can share new contents. 
  - Contents has id, type, text (URL), pose, size and timestamp properties. 
```tsx
class Participant{
  id:string
  type:string
  url:string
  pose: PoseMap2D
  size: [number, number]
  timestamp: number   //  unix timestamp for last update
}```

- Each participant can control all shared contents.
- Even when a participant leave room, contents will remain.

### Protocol

Each participant has followings as participant as properties of Jitsi conference as: 

```tsx
class Participant{
  //  properties for contents
  order: string[]  	// Z order of all contents (id only) 
  contents:Content[]	// contents owned by this participant
  
  //  propaties to change the content
  update: Content[] 	// Update requrest to other participants. Once the content in the 'contents' is updated. The content must be removed from this array.
  remove: string[]	// Remove requiest to other participants. Once the content is removed, the id must removed from this array.
  moveTop:Order[] //  move requrest to other pariticipants. Once the timestamp in order for all participants are updated, it must be removed.
  moveBottom:Order[]  //  move requrest to other pariticipants. Once the timestamp in order for all participants are updated, it must be removed.
}
class Order{
  id: string
  timestamp: number //  timestamp when move to top or bottom
}
```

Arbitrations

- When a participant leave from the room. The contents owned by the participant will move to the next participant. 
 - Next means the participant with next larger id or the smallest id.
 - Until contents moved to next participant, the contents of left participant must be kept.
- When content with the same id owned by more than two participants, participant with smaller id loose the content.
- When timestamps are the same, id is used to decide process order etc.
- When orders include ids which is not kept by any participants, the id must be removed. 
