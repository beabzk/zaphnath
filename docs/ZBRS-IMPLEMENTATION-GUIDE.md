# ZBRS Implementation Guide

## Overview

This guide provides practical instructions for implementing the Zaphnath Bible Repository Standard (ZBRS) v1.0 in your applications and creating compliant Bible repositories.

## For Repository Creators

### Quick Start

1. **Choose Your Base Structure**
   ```
   my-bible-repository/
   ├── manifest.json
   ├── books/
   ├── audio/ (optional)
   ├── assets/ (optional)
   └── README.md
   ```

2. **Create Your Manifest**
   - Copy from `examples/repositories/minimal-example/manifest.json`
   - Update all fields with your translation details
   - Ensure `zbrs_version` is "1.0"

3. **Add Your Books**
   - Use naming convention: `{order:02d}-{name}.json`
   - Follow the book schema structure
   - Validate each book file

4. **Test and Deploy**
   - Validate with ZBRS tools
   - Host on GitHub, GitLab, or web server
   - Add to repository index

### Detailed Steps

#### 1. Repository Metadata

Your `manifest.json` must include:

```json
{
  "zbrs_version": "1.0",
  "repository": {
    "id": "unique-identifier",
    "name": "Human Readable Name",
    "description": "Detailed description",
    "version": "1.0.0",
    "language": {
      "code": "en",
      "name": "English", 
      "direction": "ltr"
    },
    "translation": {
      "type": "formal|dynamic|paraphrase|interlinear",
      "year": 2023,
      "copyright": "Copyright information",
      "license": "CC0-1.0",
      "source": "Source manuscripts"
    },
    "publisher": {
      "name": "Your Organization",
      "url": "https://example.com",
      "contact": "contact@example.com"
    }
  }
}
```

#### 2. Book Files

Each book follows this structure:

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
          "text": "In the beginning..."
        }
      ]
    }
  ]
}
```

#### 3. Validation

Before publishing, validate your repository:

```bash
# Using Zaphnath CLI (when available)
zaphnath validate /path/to/repository

# Or programmatically
const result = await validator.validateRepository(repositoryPath);
```

#### 4. Hosting Options

**GitHub/GitLab (Recommended)**
- Free hosting with version control
- Automatic HTTPS
- Easy collaboration
- Example: `https://raw.githubusercontent.com/user/repo/main/`

**Static Web Hosting**
- Netlify, Vercel, GitHub Pages
- CDN distribution
- Custom domains

**Self-Hosted**
- Full control
- Must provide HTTPS
- Handle CORS headers

### Best Practices

1. **Use Semantic Versioning** - Update version when content changes
2. **Provide Checksums** - Include SHA-256 hashes for integrity
3. **Optimize File Sizes** - Compress JSON, use efficient encoding
4. **Include Metadata** - Add book outlines, themes, cross-references
5. **Test Thoroughly** - Validate before publishing
6. **Document Changes** - Maintain changelog for updates

## For Application Developers

### Integration Steps

1. **Install ZBRS Support**
   ```typescript
   import { RepositoryService } from './services/repository';
   
   const repoService = RepositoryService.getInstance();
   await repoService.initialize();
   ```

2. **Discover Repositories**
   ```typescript
   const repositories = await repoService.discoverRepositories();
   console.log(`Found ${repositories.length} repositories`);
   ```

3. **Import Repository**
   ```typescript
   const result = await repoService.importRepository({
     repository_url: 'https://example.com/bible-repo/',
     validate_checksums: true,
     overwrite_existing: false,
     progress_callback: (progress) => {
       console.log(`${progress.stage}: ${progress.progress}%`);
     }
   });
   ```

4. **Handle Validation**
   ```typescript
   const validation = await repoService.validateRepositoryUrl(url);
   if (!validation.valid) {
     console.error('Validation errors:', validation.errors);
     return;
   }
   ```

### Error Handling

```typescript
try {
  const result = await repoService.importRepository(options);
  if (!result.success) {
    console.error('Import failed:', result.errors);
  }
} catch (error) {
  if (error instanceof NetworkError) {
    console.error('Network issue:', error.message);
  } else if (error instanceof ValidationError) {
    console.error('Invalid repository:', error.message);
  }
}
```

### Security Considerations

1. **HTTPS Only** - Reject HTTP repositories in production
2. **Validate Origins** - Check repository sources
3. **Size Limits** - Enforce reasonable file size limits
4. **Checksum Verification** - Always verify content integrity
5. **Sandboxed Import** - Run imports in isolated environment

## Repository Index Management

### Official Index

The official Zaphnath repository index is maintained at:
`https://repositories.zaphnath.org/index.json`

### Adding to Official Index

1. **Create Compliant Repository**
2. **Submit Pull Request** to zaphnath-project/repositories
3. **Pass Review Process**
4. **Automatic Inclusion** in next index update

### Third-Party Indexes

You can create your own repository index:

```json
{
  "version": "1.0",
  "repositories": [
    {
      "id": "my-translation",
      "name": "My Bible Translation",
      "url": "https://example.com/my-bible/",
      "language": "en",
      "license": "CC-BY-4.0",
      "verified": false,
      "last_updated": "2025-01-01T00:00:00Z"
    }
  ]
}
```

## Migration from Other Formats

### From OSIS XML

```python
# Example Python script
import json
from lxml import etree

def osis_to_zbrs(osis_file, output_dir):
    # Parse OSIS XML
    tree = etree.parse(osis_file)
    
    # Extract books, chapters, verses
    # Convert to ZBRS format
    # Write JSON files
```

### From USFM

```javascript
// Example JavaScript conversion
const usfm = require('usfm-js');

function usfmToZbrs(usfmText) {
  const parsed = usfm.toJSON(usfmText);
  
  // Convert to ZBRS book format
  return {
    book: { /* book metadata */ },
    chapters: [ /* chapter data */ ]
  };
}
```

### From Existing JSON

If you have Bible data in a different JSON format, create a conversion script:

```typescript
function convertToZbrs(existingData: any): ZBRSBook {
  return {
    book: {
      id: existingData.bookId,
      name: existingData.bookName,
      // ... map other fields
    },
    chapters: existingData.chapters.map(ch => ({
      number: ch.chapterNumber,
      verses: ch.verses.map(v => ({
        number: v.verseNumber,
        text: v.verseText
      }))
    }))
  };
}
```

## Testing and Validation

### Automated Testing

```typescript
describe('ZBRS Repository', () => {
  test('validates manifest', async () => {
    const manifest = await loadManifest('test-repo');
    const result = await validator.validateManifest(manifest);
    expect(result.valid).toBe(true);
  });
  
  test('imports successfully', async () => {
    const result = await importer.importRepository({
      repository_url: 'test-repo-url',
      validate_checksums: true
    });
    expect(result.success).toBe(true);
  });
});
```

### Manual Testing

1. **Validate Structure** - Check all required files exist
2. **Test Import** - Import into Zaphnath application
3. **Verify Content** - Ensure text displays correctly
4. **Check Metadata** - Confirm book information is accurate
5. **Test Search** - Verify verses are searchable

## Performance Optimization

### Repository Size

- **Compress JSON** - Use gzip compression
- **Optimize Text** - Remove unnecessary whitespace
- **Split Large Books** - Consider chunking very long books
- **CDN Distribution** - Use content delivery networks

### Import Speed

- **Parallel Downloads** - Download multiple books simultaneously
- **Progress Reporting** - Keep users informed
- **Incremental Updates** - Only download changed content
- **Caching** - Cache frequently accessed repositories

## Troubleshooting

### Common Issues

1. **Invalid JSON** - Use JSON validator tools
2. **Missing Fields** - Check against schema
3. **Incorrect Ordering** - Verify book order numbers
4. **Encoding Issues** - Ensure UTF-8 encoding
5. **CORS Errors** - Configure server headers

### Debug Tools

```typescript
// Enable debug logging
const repoService = new RepositoryService({
  debug: true,
  verbose: true
});

// Check validation details
const result = await validator.validateManifest(manifest);
console.log('Validation details:', result.errors, result.warnings);
```

## Future Considerations

### ZBRS v2.0 Planning

- Enhanced audio support
- Multimedia content
- Advanced cross-references
- Collaborative annotations
- Offline synchronization

### Backward Compatibility

ZBRS v2.0 will maintain backward compatibility with v1.0 repositories, ensuring existing repositories continue to work.
