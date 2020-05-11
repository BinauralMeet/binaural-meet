# Participants Store: React Performance Optimization Practice

Participants have nested data structure for UI to render. For example,  `pariticpants - some participant - pose - position`. In [prototype 1](https://github.com/hasevr/jitsi-party), We've found that naive way of updating UI would cause lag after user interaction (like change local participant position with keyboard). For more fluent interaction, the following are our tries to optimize the performance of React.

## 1. Avoid using props for message passing
### Theory

In [round 1](https://medium.com/@alexandereardon/performance-optimisations-for-react-applications-b453c597b191) and [round 2](https://medium.com/@alexandereardon/performance-optimisations-for-react-applications-round-2-2042e5c9af97), author have introduced ways to improve performance.

He proposed to use：

1. use `shouldComponentUpdate` to avoid re-render on sibling nodes.

2. connected components to update specific node on virtual DOM directly. That avoids costs on reconciliation & render on its ancestor nodes.

### Practice

In storybook, `store-participants` demonstrate how we put that idea into practice. (MobX + React Hooks)

```js
const participants = {
    particpant_0: {
        pose: {
            position: [0, 0],
            orientation: 0
        },
        information: {
            name: 'name'
        }
    },
    ...
    participant_N: {
        ...
    }
}
```

We want to render participants list into UI. If we change only one participants' position, let's see how it would works:

1. If we use props to pass the change from root node, a lot of computation time would be wasted on reconciling and rendering the data that did not change:

   ![Render Performance 3](./imgs/RenderPerformance3.png)

2. To avoid re-rendering on sibling nodes (yellow ones on the upper image), we can use `useMemo` hook to remember the participant node. Only re-render it  when the id of participant have changed (add / delete).

   ![render performance](./imgs/RenderPerformance2.png)

3. If we connect every participant directly to the store (connect to MobX using `useContext` hook), parent nodes would not be reconciliated.

   ![render performance 1](./imgs/RenderPerformance1.png)

## 2. Batch state updates

### Practice

#### Problem

In map, we allow user to transform 2 things: 1. the pose of map itself, 2. pose of local participant relative to the map.  That means we have 2 coordinates: 1. screen coordinate, what mouse use, 2. map coordinate, what local participant use.

For a point P, $P_{ScreenCoordinate} = M * P_{MapCoordinate}$, where $M$ is transform matrix of map coordinate to screen coordinate.

So, 

- In `Map` component, we would update $M$ when user drag the map. 
- In every `Participant` component, we would have to refer to $M$ when user drag the participant, to convert mouse position from screen coordinate to map coordinate. Then we could update the position of dragged participant.

The problem is, since we use context to pass $M$ to `Participant`, every time we drag `Map`, every `Participant` would have to update because $M$ changed.

#### Solution

To avoid updating `Participant` when only `Map` is dragged with the assumption: only **one component** would be dragged at the one time.

With above assumption, we could hide the change on $M$ to `Participant` when `Map` is being dragged. Only when drag gesture is ended, we commit the final $M$ to a new state $CommitedM$, and pass $CommitedM$ to `Participant`.

## 3. Using dynamic CSS

### Theory

Calling `render` is not the only way to update styles. 

### Practice

#### Problem

In `Map` component, we allow user to rotate their map. However, user would not willing to see their video avatars also being rotated. Thus, we have to counter rotate those avatars.

The most simple way is to pass down the transform matrix $M$ down to every `Participant`. However, that would cause every `Participant` component render function being re-executed when user change `Map` rotation.

#### Solution

A better way is to create a same CSS class for all `Participant`s. In that class we update the transform to the counter rotation of current $M$. Then we pass the class name to all participants.

Since the class name would not change. React would not re-render those `Participant`s when rotating `Map`. CSS would automatically apply new styles to them.

## References

- [Dragging React Performance Forward](https://medium.com/@alexandereardon/dragging-react-performance-forward-688b30d40a33)

### 

