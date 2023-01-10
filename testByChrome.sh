#!/bin/bash
sudo su
apt update
apt install chromium-browser
chromium-browser --headless --no-sandbox --disable-gpu --disable-sync --no-first-run --disable-dev-shm-usage --user-data-dir=/tmp/chrome --remote-debugging-port=9222 --use-fake-ui-for-media-stream --use-fake-device-for-media-stream --autoplay-policy=no-user-gesture-required --allow-file-access-from-files https://binaural.me/testBot\?testBot https://binaural.me/testBot\?testBot https://binaural.me/testBot\?testBot https://binaural.me/testBot\?testBot https://binaural.me/testBot\?testBot https://binaural.me/testBot\?testBot


sudo curl -sS -o - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add
sudo bash -c "echo 'deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main' >> /etc/apt/sources.list.d/google-chrome.list"
sudo apt -y update
sudo apt -y install google-chrome-stable
/opt/google/chrome/chrome --headless --no-sandbox --disable-gpu --disable-sync --no-first-run --disable-dev-shm-usage --user-data-dir=/tmp/chrome --remote-debugging-port=9222 --use-fake-ui-for-media-stream --use-fake-device-for-media-stream --autoplay-policy=no-user-gesture-required --allow-file-access-from-files https://binaural.me/testBot\?testBot https://binaural.me/testBot\?testBot https://binaural.me/testBot\?testBot https://binaural.me/testBot\?testBot https://binaural.me/testBot\?testBot https://binaural.me/testBot\?testBot
