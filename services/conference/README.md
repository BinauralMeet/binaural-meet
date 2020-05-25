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

   1. Download lib-jitsi-meet and install dependencies

      ```bash
      git submodule update --init
      cd libs/lib-jitsi-meet
      yarn install
      cd ../../
      ```
   
   2. Link to our project

      ```bash
      yarn run link
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

### Test

- Watch mode
   
   ```bash
   yarn dev
```
   
- Storybook
   ```bash
   yarn storybook
   ```

- Test dev build with dummy participants

   In this part, we need two separate bash to hold two developments environments.  
   
      ```bash  
   yarn storybook
      ```

      ```bash
   yarn dev
      ```

   To add dummy participants for test purpose, please enter `Dummy Connection` tab and press `Add a participant` button.
