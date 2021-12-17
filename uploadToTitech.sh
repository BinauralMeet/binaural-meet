#!/bin/sh
cd build

scp binaural.me:/usr/share/BinauralMeet/config.js config.js.org
scp -r * titech.binaural.me:/usr/share/BinauralMeet/
scp config.js.org binaural.me:/usr/share/BinauralMeet/config.js
