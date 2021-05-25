#!/bin/sh
yarn build
cd build
scp -r * binaural.me:/usr/share/BinauralMeet/
