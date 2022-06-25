#!/bin/sh
#cp ../reposForServer/bmMediasoupServer/src/MediaMessages.ts ./src/models/api/
sed 's/from '"'"'mediasoup'"'"'/from '"'"'mediasoup-client'"'"'/g' ../reposForServer/bmMediasoupServer/src/MediaMessages.ts > ./src/models/conference/MediaMessages.ts
