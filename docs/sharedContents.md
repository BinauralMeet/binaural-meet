# Protocol for Shared contents

### Specification

- Each participant can share new contents. 
  - Contents has id, type, text (URL), pose and size properties. 
- Each participant can control all shared contents.
- Even when a participant leave room, contents will remain.

### Protocol

Each participant has followings as participant as properties of Jitsi conference as: 

```tsx
Participant{
    order: string[]  	// Z order of all contents (id only) 
    contents:Content[]	// contents owned by this participant
    update: Content[] 	// Update requrest to other participants. Once the content in the 'contents' is updated. The object must be removed from this array.
    remove: string[]	// Remove requiest to other participants. Once the content is removed, the id from removed from this array.
}```
```

Arbitrations

- When a participant leave from the room. The contents owned by the participant will move to the next participant. 
  - Next means the participant with next larger id or the smallest id.
 - When content with the same id owned by more than two participants, participant with smaller id loose the content.
