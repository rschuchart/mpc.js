#!/bin/bash

# generate npm package
./node_modules/.bin/tsc --module commonjs --outDir lib/ src/node-mpc.ts src/browser-mpc.ts src/live-mpd-objects.ts

# generate bower package
./node_modules/.bin/browserify -s MPC -p tsify -d src/browser-mpc.ts src/live-mpd-objects.ts | ./node_modules/.bin/exorcist bower/mpc.js.map > bower/mpc.js

# generate documentation
./node_modules/.bin/typedoc -m commonjs --out doc/ --disableOutputCheck src/live-mpd-objects.ts src/node-mpc.ts src/browser-mpc.ts
