#!/bin/sh
cd dist
rm index.zip
zip index.zip *
scp index.zip haselab.net:~hase/public_html/temp/meet/
mv config.js config.js.repo
scp * binaural.me:/usr/share/BinauralMeet/
mv config.js.repo config.js
