#!/bin/sh
tar zcf bm.tgz build
scp ./bm.tgz hase@binaural.me:~/public_packages/
