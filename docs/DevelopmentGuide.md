# Development Guide

This document describes the technology stack of jitsi-party, and how they are used in practice.

Note: The examples mentioned below are all in `conference` project by default.

## React Hooks

React Hooks is used, but you can also use class since they are compatible with each other. React hooks makes it easier to [reuse logics](https://reactjs.org/docs/hooks-intro.html#its-hard-to-reuse-stateful-logic-between-components), but it is also a bit [slow](https://hackernoon.com/react-hooks-slower-than-hoc-ff105586036) comparing to traditional HOC with class.

### Template

One sample of how to use React Hooks to create component is `StreamAvatar`, you can find it in storybook: `avatar-video`.

## MobX

MobX is used to manage the states. 

### Template

`Participant Store` is one example of usage of MobX. You can find it in `@stores` folder.

To use the store with React Hooks, more efforts are needed. In `@hooks` folder, you can find how the store is wrapped with React Context. And in storybook: `store-participants`, you can find how it is used in render participant information into cards.

### Related docs

You may also refer to this [doc](./PerformanceOptimizationPractice.md) to see how connect store directly to components optimize performance of React.