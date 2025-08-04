#!/bin/bash

# Convert Bible Files to ZBRS Format
# This script converts the existing bible-files to ZBRS v1.0 format

set -e

echo "🔄 Converting Bible Files to ZBRS Format..."

# Create output directory
mkdir -p zbrs-repositories

# Convert King James Version
if [ -d "bible-files/eng/King James Version" ]; then
    echo "📖 Converting King James Version..."
    node tools/converters/bible-files-to-zbrs.js \
        "bible-files/eng/King James Version" \
        "zbrs-repositories/kjv-1769" \
        kjv
    echo "✅ KJV conversion complete"
else
    echo "⚠️  KJV directory not found, skipping..."
fi

# Convert Amharic Bible
if [ -d "bible-files/amh/Amharic Bible 1962" ]; then
    echo "📖 Converting Amharic Bible..."
    node tools/converters/bible-files-to-zbrs.js \
        "bible-files/amh/Amharic Bible 1962" \
        "zbrs-repositories/amharic-1962" \
        amharic
    echo "✅ Amharic conversion complete"
else
    echo "⚠️  Amharic directory not found, skipping..."
fi

echo ""
echo "🎉 All conversions complete!"
echo "📁 ZBRS repositories created in: zbrs-repositories/"
echo ""
echo "Next steps:"
echo "1. Validate repositories: npm run validate-zbrs"
echo "2. Test import: npm run test-import"
echo "3. Host repositories for distribution"
