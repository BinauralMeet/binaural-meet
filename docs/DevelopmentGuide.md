# Development Guide

Binaural Meet was bootstrapped with [create-react-app](https://github.com/facebook/create-react-app) and configured with [react-app-rewired](https://github.com/timarney/react-app-rewired#readme).

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

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

The page will reload if you make edits.\
You will also see any lint errors in the console.

### `yarn test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

Note: No test has been created yet.

### `yarn build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified, and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `yarn eject`

**Note: this is a one-way operation. Once you `eject`, you can't go back!**
Don't use eject. Instead, use react-app-rewired.

If you aren't satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you are on your own.

You don't have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn't feel obligated to use this feature. However we understand that this tool wouldn't be useful if you couldnft customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).




# The technology stack of Binaural Meet

## React Hooks

[React Hooks](https://reactjs.org/docs/hooks-intro.html) is used,

## MobX

[MobX](https://mobx.js.org/) is used to manage the states.
