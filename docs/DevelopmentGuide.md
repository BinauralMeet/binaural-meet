# Development Guide

Binaural Meet is built with [Vite](https://vitejs.dev/) and tested with [Vitest](https://vitest.dev/).

## Installation

### Install tools

In the case of Windows environment. The following are recommended.

- NodeJS
- yarn
- VSCode
- Git for Windows
- Tortoise Git (if you prefer)

### Get the source tree and create the environment

1. Clone the repository from GitHub.
3. Open the "binaural-meet" folder by VSCode.
4. Start a terminal in VSCode. If PowerShell or CMD is started, please set it to use Git Bash.
   1. Open "View" - "Command palette" and type "Terminal: Clear Selection"
   2. Open "View" - "Command palette" and type "Terminal: Select Default Profile" and choose "Git Bash"
5. Install yarn: execute "npm install -g yarn"' in the console
6. Set shell for yarn

```bash
yarn config set script-shell /usr/bin/bash
```

## Available Scripts

In the project directory, you can run:

### `yarn start`

Runs the Vite dev server.\
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

The page reloads on edits via Vite's HMR.

### `yarn test`

Runs the Vitest suite once (`vitest run`). Use `yarn test:watch` for interactive watch mode.
See `docs/TestingGuide.md` for details on manual/CDP-driven testing beyond the unit test suite.

### `yarn build`

Type-checks (`tsc`) and builds the app for production via `vite build`.\
The build is minified and ready to be deployed.

### `yarn serve`

Serves the production build locally via `vite preview`, for a final check before deploying.

## Learn More

See the [Vite documentation](https://vitejs.dev/guide/) and the [Vitest documentation](https://vitest.dev/guide/).

To learn React, check out the [React documentation](https://reactjs.org/).




# The technology stack of Binaural Meet

## React Hooks

[React Hooks](https://reactjs.org/docs/hooks-intro.html) is used,

## MobX

[MobX](https://mobx.js.org/) is used to manage the states.
