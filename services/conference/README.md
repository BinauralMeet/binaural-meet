# Conference

Conference is a space for users to communicate.

## Conference room name
```
https://this/is/url/conference-room-name
```
In the above url, `conference-room-name` would be read as id. And that id would be used to join corresponding conference.

## Development

1. Install dependencies

   ```bash
   yarn install
   ```

2. Lint code

   ```bash
   yarn lint
   ```

3. Build

   ```bash
   yarn build
   ```

4. Clean

   ```bash
   yarn clean
   ```

5. Watch mode
   ```bash
   yarn dev
   ```

6. Test components using storybook
   ```bash
   yarn storybook
   ```

7. Test dev build with dummy participants

   In this part, we need two seperate bash to hold two developments environments.
      ```bash
      yarn storybook
      ```

      ```bash
      yarn dev
      ```

   To add dummy participants for test purpose, please enter `Dummy Connection` tab and press `Add a participant` button.

## How to install lib-jitsi-meet

### yarn link
```bash
cd libs/lib-jitsi-meet
yarn link
cd ../../
yarn link lib-jitsi-meet

cd libs/@types/lib-jitsi-meet
yarn link
cd ../../../
yarn link @types/lib-jitsi-meet
