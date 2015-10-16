#!/bin/bash

# publish bower package
cd bower
git add -A .
git commit -m "Release $npm_package_version"
git tag "v$npm_package_version"
git push
git push --tags
cd ..

# publish documentation
cd doc
git add -A .
git commit -m "Release $npm_package_version"
git push
cd ..
