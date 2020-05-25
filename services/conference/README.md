# Conference

Conference is a space for users to communicate.

## Conference room name
```
https://this/is/url/?name=conference-room-name
```
In the above url, `conference-room-name` would be read as id. And that id would be used to join corresponding conference.

## Development

### Install dependencies

1. Install packages

   ```bash
   yarn install
   ```

2. Install lib-jitsi-meet

   ```bash
   cd libs/lib-jitsi-meet
   yarn link
   cd ../../
   yarn link lib-jitsi-meet

   cd libs/@types/lib-jitsi-meet
   yarn link
   cd ../../../
   yarn link @types/lib-jitsi-meet
   ```

### Tools
- Lint code

   ```bash
   yarn lint
   ```

- Build

   ```bash
   yarn build
   ```

- Clean

   ```bash
   yarn clean
   ```

- Watch mode
   ```bash
   yarn dev
   ```

- Test components using storybook
   ```bash
   yarn storybook
   ```

- Test dev build with dummy participants

   In this part, we need two seperate bash to hold two developments environments.
      ```bash
      yarn storybook
      ```

      ```bash
      yarn dev
      ```

   To add dummy participants for test purpose, please enter `Dummy Connection` tab and press `Add a participant` button.

## How to install lib-jitsi-meet
```bash
git submodule update --init
cd libs/lib-jitsi-meet
yarn install
cd ../../
```

### yarn run link
```bash
yarn run link
```

### Details in link scripts
> You don't need to run this script indeed.
```bash
cd libs/lib-jitsi-meet
yarn link
cd ../../
yarn link lib-jitsi-meet

cd libs/@types/lib-jitsi-meet
yarn link
cd ../../../
yarn link @types/lib-jitsi-meet
```
