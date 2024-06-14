#!/bin/sh
yarn build
cd dist
scp -r * binaural.me:/usr/share/BinauralMeet/