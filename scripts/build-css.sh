#!/bin/sh
# Rebuild assets/css/site.css after adding or changing Tailwind classes in any page.
set -e
cd "$(dirname "$0")/.."
npx -y tailwindcss@3.4.17 -c scripts/tailwind.config.js -i scripts/tailwind.input.css -o assets/css/site.css --minify
