# Minimal Example Bible Repository

This is a minimal example repository demonstrating the Zaphnath Bible Repository Standard (ZBRS) v1.0.

## Contents

This repository contains just 3 books to demonstrate the basic structure:

- **Genesis** (Old Testament) - First 2 chapters showing creation
- **Psalms** (Old Testament) - Psalm 1 showing wisdom literature
- **John** (New Testament) - First 5 verses showing gospel literature

## Purpose

This minimal example is designed to:

1. **Demonstrate ZBRS Structure** - Show the minimum required files and format
2. **Test Import Systems** - Provide a small dataset for testing
3. **Educational Reference** - Help developers understand the standard
4. **Quick Validation** - Fast way to test ZBRS compliance tools

## Repository Structure

```
minimal-example/
├── manifest.json           # Repository metadata
├── books/                  # Bible books directory
│   ├── 01-genesis.json     # Genesis (2 chapters)
│   ├── 19-psalms.json      # Psalms (1 psalm)
│   └── 43-john.json        # John (5 verses)
└── README.md              # This file
```

## Features Demonstrated

- ✅ **Basic Manifest** - All required metadata fields
- ✅ **Book Structure** - Proper chapter/verse hierarchy
- ✅ **Multiple Testaments** - Both Old and New Testament books
- ✅ **Different Genres** - Law, Wisdom, and Gospel literature
- ✅ **Metadata** - Book outlines and themes
- ✅ **Proper Ordering** - Correct book order numbers

## Features NOT Included

- ❌ **Audio Files** - No audio references
- ❌ **Cross References** - No verse cross-references
- ❌ **Footnotes** - No textual or translation notes
- ❌ **Study Notes** - No commentary or study materials
- ❌ **Complete Bible** - Only 3 books included

## Using This Repository

### Import into Zaphnath

```javascript
// In the Zaphnath renderer process
const result = await window.repository.import('path/to/minimal-example');
console.log(`Imported ${result.books_imported} books`);
```

### Validate Structure

```javascript
// Validate the repository
const validation = await window.repository.validate('path/to/minimal-example');
console.log(validation.valid); // Should be true
```

### Extend This Example

To create your own repository based on this example:

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
