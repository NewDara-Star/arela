#!/bin/bash
echo "Starting verification..." > verification.log
export PATH=$PATH:./node_modules/.bin

echo "Building test bundle..." >> verification.log
npx -y esbuild scripts/test_guard.ts --bundle --platform=node --format=esm --outfile=test_bundle.js --external:fs-extra --external:zod >> verification.log 2>&1

if [ -f test_bundle.js ]; then
    echo "Bundle created. Running test..." >> verification.log
    node test_bundle.js >> verification.log 2>&1
else
    echo "Bundle creation failed!" >> verification.log
fi

echo "Done." >> verification.log
