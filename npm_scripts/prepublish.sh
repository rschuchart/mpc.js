#!/bin/bash

./node_modules/.bin/tsc --module commonjs --outDir lib/ src/node-mpc.ts src/browser-mpc.ts

./node_modules/.bin/browserify -s MPC -p tsify -d src/browser-mpc.ts | exorcist bower/mpc.js.map > bower/mpc.js
