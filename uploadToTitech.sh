#!/bin/sh
cd build

scp titech.binaural.me:/usr/share/BinauralMeet/config.js config.js.org
scp -r * titech.binaural.me:/usr/share/BinauralMeet/
scp config.js.org titech.binaural.me:/usr/share/BinauralMeet/config.js
