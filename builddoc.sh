#!/bin/bash

cd packages/doc/website
npm run build
cd ../../..
rm -rf docs
mv packages/doc/website/build/cormo docs
