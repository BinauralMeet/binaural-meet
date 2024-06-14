#!/bin/sh
tar zcf bm.tgz dist
scp ./bm.tgz hase@binaural.me:~/public_packages/
