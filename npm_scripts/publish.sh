#!/bin/bash

cd bower
git add -A .
git commit -m "Release $npm_package_version"
git tag "v$npm_package_version"
git push
git push --tags
