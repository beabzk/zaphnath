# Example Bible Repositories

This directory contains example repositories that demonstrate the Zaphnath Bible Repository Standard (ZBRS) v1.0.

## Repository Examples

### 1. Minimal Repository (`minimal-example/`)
A basic repository with just a few books to demonstrate the minimum required structure.

### 2. Full KJV Repository (`kjv-1769/`)
A complete King James Version repository showing all features of the ZBRS standard.

### 3. Multilingual Repository (`amharic-bible/`)
An example showing how to structure a non-English Bible repository.

## Repository Structure

Each example repository follows the ZBRS v1.0 standard:

```
repository-name/
├── manifest.json           # Repository metadata
├── books/                  # Bible books
│   ├── 01-genesis.json
│   ├── 02-exodus.json
│   └── ...
├── audio/                  # Optional audio files
├── assets/                 # Optional resources
└── README.md              # Repository description
```

## Using These Examples

### For Repository Creators
1. Copy one of these examples as a starting point
2. Modify the `manifest.json` with your repository details
3. Replace the book files with your Bible translation
4. Validate using the ZBRS validator tools
5. Host on GitHub, GitLab, or any web server

### For Developers
1. Use these examples to test the Zaphnath import system
2. Validate your ZBRS implementation against these examples
3. Reference the structure when building ZBRS-compatible tools

## Validation

All example repositories can be validated using the Zaphnath Bible Reader:

```javascript
// In the renderer process
const result = await window.repository.validate('path/to/repository');
console.log(result.valid); // Should be true for all examples
```

## Contributing

To add a new example repository:

1. Create a new directory following the ZBRS standard
2. Include a complete `manifest.json`
3. Add at least one complete book file
4. Test with the Zaphnath validator
5. Document any special features in the repository README

## License

These examples are provided under CC0 (Public Domain) to encourage adoption of the ZBRS standard.
