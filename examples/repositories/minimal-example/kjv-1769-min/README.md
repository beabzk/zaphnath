# King James Version (1769) - Minimal

A minimal King James Version translation demonstrating the ZBRS v1.0 translation directory structure.

## Translation Information

- **Language**: English
- **Translation Type**: Formal
- **Source**: King James Version (1769 Oxford Standard Text)
- **Books**: 3 (Genesis, Psalms, John)
- **ZBRS Version**: 1.0

## Contents

This translation contains just 3 books to demonstrate the basic structure:

- **Genesis** (Old Testament) - First 2 chapters showing creation
- **Psalms** (Old Testament) - Psalm 1 showing wisdom literature  
- **John** (New Testament) - First 5 verses showing gospel literature

## Translation Directory Structure

```
kjv-1769-min/
├── manifest.json           # Translation metadata
├── README.md              # This file
└── books/                 # Bible books directory
    ├── 01-genesis.json    # Genesis (2 chapters)
    ├── 19-psalms.json     # Psalms (1 psalm)
    └── 43-john.json       # John (5 verses)
```

## Features Demonstrated

- ✅ **Translation Manifest** - Translation-specific metadata
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

## Usage

### Import into Zaphnath

```javascript
// Import the entire repository (including this translation)
const result = await window.repository.import('path/to/minimal-example');
console.log(`Imported ${result.translations_imported} translations`);

// Or import just this translation
const result = await window.repository.import('path/to/minimal-example/kjv-1769-min');
console.log(`Imported ${result.books_imported} books`);
```

### Validate Translation

```javascript
// Validate this translation
const validation = await window.repository.validate('path/to/minimal-example/kjv-1769-min');
console.log(validation.valid); // Should be true
```

## License

CC0-1.0 - Public Domain
