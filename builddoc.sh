#!/bin/bash

cd packages/doc/website
npm run build
cd ../../..
rm -rf docs
mv packages/doc/website/build/cormo docs

cd packages/cormo
npm run doc
cd ../..
