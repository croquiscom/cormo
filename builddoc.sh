#!/bin/bash

git clone -b gh-pages `git remote get-url origin` gh-pages

cd gh-pages
git rm -rf .
cd ..

cd packages/doc/website
npm run build
cd ../../..
cp -a packages/doc/website/build/cormo/* gh-pages

cd packages/cormo
npm run doc
cd ../..

cd gh-pages
git add --all
git commit -m 'publish documentation'
git push
cd ..

rm -rf gh-pages
