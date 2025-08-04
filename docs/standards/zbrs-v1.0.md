# Zaphnath Bible Repository Standard (ZBRS) v1.0

## Overview

The Zaphnath Bible Repository Standard (ZBRS) defines a standardized format for Bible translations that can be imported into the Zaphnath Bible Reader application. This standard enables source-agnostic Bible data exchange and allows third-party developers to create compatible repositories.

## Core Principles

1. **Source Agnostic**: Works with any Bible translation or format
2. **Language Independent**: Supports any language and script
3. **Extensible**: Allows for future enhancements without breaking compatibility
4. **Discoverable**: Repositories can be found and validated automatically
5. **Secure**: Includes validation and integrity checks

## Repository Structure

```
repository-root/
├── manifest.json           # Repository metadata and configuration
├── books/                  # Bible books directory
│   ├── 01-genesis.json     # Individual book files
│   ├── 02-exodus.json
│   └── ...
├── audio/                  # Optional audio files
│   ├── 01-genesis/
│   │   ├── chapter-01.mp3
│   │   └── ...
│   └── ...
├── assets/                 # Optional additional resources
│   ├── images/
│   └── fonts/
└── README.md              # Human-readable repository description
```

## File Specifications

### 1. Repository Manifest (`manifest.json`)

The manifest file contains metadata about the Bible repository:

```json
{
  "zbrs_version": "1.0",
  "repository": {
    "id": "kjv-1769",
    "name": "King James Version (1769)",
    "description": "The 1769 Oxford Standard Text of the King James Bible",
    "version": "1.0.0",
    "language": {
      "code": "en",
      "name": "English",
      "direction": "ltr"
    },
    "translation": {
      "type": "formal",
      "year": 1769,
      "copyright": "Public Domain",
      "license": "CC0-1.0",
      "source": "Oxford Standard Text"
    },
    "publisher": {
      "name": "Zaphnath Project",
      "url": "https://github.com/zaphnath-project",
      "contact": "repositories@zaphnath.org"
    },
    "created_at": "2025-01-01T00:00:00Z",
    "updated_at": "2025-01-01T00:00:00Z"
  },
  "content": {
    "books_count": 66,
    "testament": {
      "old": 39,
      "new": 27
    },
    "features": {
      "audio": false,
      "cross_references": false,
      "footnotes": false,
      "study_notes": false
    }
  },
  "technical": {
    "encoding": "UTF-8",
    "compression": "none",
    "checksum": "sha256:abc123...",
    "size_bytes": 4567890
  }
}
```

### 2. Book Files (`books/*.json`)

Each Bible book is stored as a separate JSON file with standardized naming:

**Naming Convention**: `{order:02d}-{name}.json`
- `01-genesis.json`, `02-exodus.json`, etc.
- Order follows traditional Protestant canon (Genesis=1, Revelation=66)

**Book File Structure**:

```json
{
  "book": {
    "id": "genesis",
    "name": "Genesis",
    "abbreviation": "Gen",
    "order": 1,
    "testament": "old",
    "chapters_count": 50,
    "verses_count": 1533
  },
  "chapters": [
    {
      "number": 1,
      "verses": [
        {
          "number": 1,
          "text": "In the beginning God created the heaven and the earth.",
          "audio": "audio/01-genesis/chapter-01.mp3#t=0,5.2"
        }
      ]
    }
  ]
}
```

## Schema Definitions

### Language Object
```json
{
  "code": "string (ISO 639-1/639-3)",
  "name": "string",
  "direction": "ltr|rtl",
  "script": "string (optional, ISO 15924)"
}
```

### Translation Object
```json
{
  "type": "formal|dynamic|paraphrase|interlinear",
  "year": "number",
  "copyright": "string",
  "license": "string (SPDX identifier)",
  "source": "string",
  "translators": ["string"] // optional
}
```

### Audio Reference Format
Audio files are referenced using Media Fragment URIs:
- `audio/01-genesis/chapter-01.mp3#t=0,5.2` (verse 1: 0-5.2 seconds)
- `audio/01-genesis/chapter-01.mp3#t=5.2,10.8` (verse 2: 5.2-10.8 seconds)

## Validation Rules

### Required Fields
- `manifest.json` must be present and valid
- All books referenced in manifest must exist
- Book order must be sequential (1-66 for Protestant canon)
- All verses must have non-empty text

### Optional Features
- Audio files and references
- Cross-references and footnotes
- Study notes and commentary
- Images and additional assets

### Data Integrity
- UTF-8 encoding required
- JSON must be valid and well-formed
- Checksums must match actual content
- File sizes must be reasonable (< 100MB per book)

## Repository Discovery

### Official Repository Index
The Zaphnath project maintains an official index at:
`https://repositories.zaphnath.org/index.json`

```json
{
  "version": "1.0",
  "repositories": [
    {
      "id": "kjv-1769",
      "name": "King James Version (1769)",
      "url": "https://repositories.zaphnath.org/kjv-1769/",
      "language": "en",
      "license": "CC0-1.0",
      "verified": true,
      "last_updated": "2025-01-01T00:00:00Z"
    }
  ]
}
```

### Third-Party Repositories
Users can add custom repository URLs that follow the same standard.

## Security Considerations

1. **HTTPS Required**: All remote repositories must use HTTPS
2. **Checksum Validation**: Content integrity verified via SHA-256
3. **Size Limits**: Reasonable file size limits to prevent abuse
4. **Content Validation**: JSON schema validation before import
5. **Sandboxed Import**: Import process runs in isolated environment

## Versioning

- **Standard Version**: ZBRS follows semantic versioning (1.0, 1.1, 2.0)
- **Repository Version**: Each repository has its own version for updates
- **Backward Compatibility**: Newer ZBRS versions support older repositories

## Extension Points

The standard allows for extensions while maintaining compatibility:

```json
{
  "extensions": {
    "zaphnath:study_notes": {
      "version": "1.0",
      "data": { /* custom data */ }
    }
  }
}
```

## Implementation Notes

- Repositories can be hosted on GitHub, GitLab, or any web server
- Static hosting is sufficient (no server-side processing required)
- CDN distribution recommended for performance
- Compression (gzip) recommended for network efficiency

---

**Version**: 1.0  
**Date**: 2025-01-01  
**Status**: Draft  
**Authors**: Zaphnath Project Team
