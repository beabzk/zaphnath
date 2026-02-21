# Zaphnath Bible Repository Standard (ZBRS) v1.1

## Overview

The Zaphnath Bible Repository Standard (ZBRS) defines a standardized format for Bible translations that can be imported into the Zaphnath Bible Reader application. This standard enables source-agnostic Bible data exchange and allows third-party developers to create compatible repositories.

## Core Principles

1. **Source Agnostic**: Works with any Bible translation or format
2. **Language Independent**: Supports any language and script
3. **Extensible**: Allows for future enhancements without breaking compatibility
4. **Discoverable**: Repositories can be found and validated automatically
5. **Secure**: Includes validation and integrity checks

## Repository Structure

ZBRS v1.1 defines a hierarchical repository structure where a single repository contains multiple Bible translation subdirectories. This organization allows for better management of multiple translations and languages within a unified repository.

### Repository Structure

```
repository-root/
├── manifest.json           # Parent repository metadata and coordination
├── README.md              # Parent repository description
├── kjv/                   # King James Version translation
│   ├── manifest.json      # Translation-specific metadata
│   ├── README.md          # Translation description
│   ├── books/             # Bible books directory
│   │   ├── 01-genesis.json
│   │   ├── 02-exodus.json
│   │   └── ...
│   └── audio/             # Optional audio files
│       ├── 01-genesis/
│       │   ├── chapter-01.mp3
│       │   └── ...
│       └── ...
├── web/                   # World English Bible translation
│   ├── manifest.json
│   ├── README.md
│   ├── books/
│   └── audio/
├── amharic-1962/          # Amharic Bible (1962) translation
│   ├── manifest.json
│   ├── README.md
│   ├── books/
│   └── audio/
├── nasv-2001/             # New American Standard Version (2001)
│   ├── manifest.json
│   ├── README.md
│   ├── books/
│   └── audio/
└── [more translations...]  # Additional translation directories can be added
```

### Translation Directory Structure

Each translation subdirectory follows this standardized structure:

```
translation-directory/
├── manifest.json           # Translation metadata and configuration
├── README.md              # Translation description and usage
├── books/                 # Bible books directory
│   ├── 01-genesis.json    # Individual book files
│   ├── 02-exodus.json
│   └── ...
└── audio/                 # Optional audio files
    ├── 01-genesis/
    │   ├── chapter-01.mp3
    │   └── ...
    └── ...
```

## File Specifications

### 1. Parent Repository Manifest (`manifest.json`)

The parent repository manifest coordinates multiple Bible translations and provides overall repository metadata:

```json
{
  "zbrs_version": "1.1",
  "repository": {
    "id": "beabzk-zbrs-repo",
    "name": "Beabzk Bible Repository Collection",
    "description": "A comprehensive collection of Bible translations in multiple languages",
    "version": "1.0.0",
    "type": "parent",
    "created_at": "2025-01-01T00:00:00Z",
    "updated_at": "2025-01-01T00:00:00Z"
  },
  "publisher": {
    "name": "Beabfekad Zikie",
    "url": "https://github.com/beabzk/zbrs-repo",
    "contact": "beabzk@proton.me"
  },
  "translations": [
    {
      "id": "kjv-1769",
      "name": "King James Version (1769)",
      "directory": "kjv",
      "language": {
        "code": "en",
        "name": "English",
        "direction": "ltr"
      },
      "status": "active",
      "checksum": "sha256:abc123...",
      "size_bytes": 4567890
    },
    {
      "id": "web-2000",
      "name": "World English Bible (2000)",
      "directory": "web",
      "language": {
        "code": "en",
        "name": "English",
        "direction": "ltr"
      },
      "status": "active",
      "checksum": "sha256:def456...",
      "size_bytes": 4123456
    },
    {
      "id": "amharic-1962",
      "name": "Amharic Bible (1962)",
      "directory": "amharic-1962",
      "language": {
        "code": "am",
        "name": "Amharic",
        "direction": "ltr",
        "script": "Ethi"
      },
      "status": "active",
      "checksum": "sha256:ghi789...",
      "size_bytes": 3987654
    }
  ],
  "technical": {
    "encoding": "UTF-8",
    "compression": "none"
  }
}
```

### 2. Translation Manifest (`translation-directory/manifest.json`)

Each translation directory contains its own manifest with translation-specific metadata:

```json
{
  "zbrs_version": "1.1",
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

### 3. Book Files (`translation-directory/books/*.json`)

Each Bible book within a translation directory is stored as a separate JSON file with standardized naming:

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
- Repository root `manifest.json` must be present and valid with `type: "parent"`
- Each translation directory must have its own `manifest.json` and `README.md`
- All translation directories referenced in the repository manifest must exist
- All books referenced in translation manifests must exist
- Book order must be sequential (1-66 for Protestant canon)
- All verses must have non-empty text

### Directory Structure Requirements
- Translation directories must follow the naming convention specified in the repository manifest
- Each translation directory must contain a `books/` subdirectory
- Book files must be located within the translation's `books/` directory

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
The Zaphnath project maintains an official registry at:
`https://raw.githubusercontent.com/beabzk/zbrs-registry/main/manifest.json`

```json
{
  "zbrs_version": "1.1",
  "registry": {
    "id": "zbrs-registry",
    "name": "Zaphnath Bible Repository Registry",
    "description": "Official registry of ZBRS-compatible Bible repositories",
    "version": "1.0.0",
    "created_at": "2025-08-17T11:48:00Z",
    "updated_at": "2025-08-17T11:48:00Z"
  },
  "repositories": [
    {
      "id": "zbrs-official",
      "name": "Official Zaphnath Bible Repositories",
      "url": "https://raw.githubusercontent.com/beabzk/zbrs-official/main/manifest.json",
      "description": "The official, verified collection of Bible repositories for the Zaphnath project.",
      "verified": true,
      "last_updated": "2025-08-17T11:48:00Z",
      "tags": ["official", "collection"]
    }
  ]
}
```

### Repository Discovery Process
When discovering a repository, applications should:
1. Fetch the repository root `manifest.json`
2. Validate that it has `type: "parent"`
3. Parse the `translations` array to discover available translations
4. For each translation, validate the corresponding translation directory and manifest

### Third-Party Repositories
Users can add custom repository URLs that follow the same hierarchical standard.

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
- Applications should first fetch the repository root manifest to discover available translations
- Translation directories can be imported individually or as a complete collection
- Directory naming should follow the convention specified in the repository manifest

---

**Version**: 1.1  
**Date**: 2025-01-01  
**Status**: Draft  
**Authors**: Zaphnath Project Team
