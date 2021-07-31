#!/bin/sh
tar zcf roomInfo.tgz build
scp ./roomInfo.tgz hase@binaural.me:~/public_packages/
