# Minimal Example Bible Repository

This is a minimal example repository demonstrating the Zaphnath Bible Repository Standard (ZBRS) v1.0 hierarchical structure.

## Repository Information

- **Repository Type**: Parent repository with translations
- **Translations**: 1 (King James Version - Minimal)
- **Total Books**: 3 (across all translations)
- **ZBRS Version**: 1.0

## Contents

This repository contains one translation with 3 books to demonstrate the hierarchical structure:

### King James Version (1769) - Minimal (`kjv-1769-min/`)
- **Genesis** (Old Testament) - First 2 chapters showing creation
- **Psalms** (Old Testament) - Psalm 1 showing wisdom literature
- **John** (New Testament) - First 5 verses showing gospel literature

## Purpose

This minimal example is designed to:

1. **Demonstrate ZBRS Structure** - Show the hierarchical repository organization
2. **Test Import Systems** - Provide a small dataset for testing repository and translation import
3. **Educational Reference** - Help developers understand the complete ZBRS standard
4. **Quick Validation** - Fast way to test ZBRS compliance tools

## Repository Structure

```
minimal-example/
├── manifest.json           # Repository coordination manifest
├── README.md              # This file
└── kjv-1769-min/          # King James Version translation
    ├── manifest.json       # Translation metadata
    ├── README.md           # Translation description
    └── books/              # Bible books directory
        ├── 01-genesis.json # Genesis (2 chapters)
        ├── 19-psalms.json  # Psalms (1 psalm)
        └── 43-john.json    # John (5 verses)
```

## Features Demonstrated

- ✅ **Hierarchical Structure** - Parent repository with translation subdirectories
- ✅ **Repository Coordination** - Parent manifest with translations array
- ✅ **Translation Organization** - Individual translation manifests and directories
- ✅ **Book Structure** - Proper chapter/verse hierarchy
- ✅ **Multiple Testaments** - Both Old and New Testament books
- ✅ **Different Genres** - Law, Wisdom, and Gospel literature
- ✅ **Metadata** - Book outlines and themes
- ✅ **Proper Ordering** - Correct book order numbers

## Features NOT Included

- ❌ **Multiple Translations** - Only one translation included
- ❌ **Audio Files** - No audio references
- ❌ **Cross References** - No verse cross-references
- ❌ **Footnotes** - No textual or translation notes
- ❌ **Study Notes** - No commentary or study materials
- ❌ **Complete Bible** - Only 3 books included

## Using This Repository

### Import into Zaphnath

```javascript
// Import the entire repository (all translations)
const result = await window.repository.import('path/to/minimal-example');
console.log(`Imported ${result.translations_imported} translations`);

// Import a specific translation
const result = await window.repository.import('path/to/minimal-example/kjv-1769-min');
console.log(`Imported ${result.books_imported} books`);
```

### Validate Structure

```javascript
// Validate the repository coordination
const repoValidation = await window.repository.validate('path/to/minimal-example');
console.log(repoValidation.valid); // Should be true

// Validate a specific translation
const translationValidation = await window.repository.validate('path/to/minimal-example/kjv-1769-min');
console.log(translationValidation.valid); // Should be true
```

### Extend This Example

To create your own repository based on this example:

1. **Copy the repository structure**
2. **Update the repository manifest** - Change repository details in the root `manifest.json`
3. **Add more translations** - Create additional translation directories (e.g., `web/`, `esv/`)
4. **Update translation manifests** - Modify each translation's `manifest.json`
5. **Add more books** - Include additional Bible books in each translation's `books/` directory
6. **Update the translations array** - Add new translations to the repository manifest

1. Copy this directory structure
2. Update `manifest.json` with your translation details
3. Replace the book files with your Bible text
4. Add more books following the same pattern
5. Validate with ZBRS tools

## License

This example is released under CC0 (Public Domain) to encourage adoption of the ZBRS standard.

## Technical Details

- **ZBRS Version**: 1.0
- **Encoding**: UTF-8
- **Total Size**: ~50KB
- **Books**: 3
- **Chapters**: 4
- **Verses**: 56
- **Languages**: English only
