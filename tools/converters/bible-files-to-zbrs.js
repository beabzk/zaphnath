#!/usr/bin/env node

/**
 * Bible Files to ZBRS Converter
 *
 * Converts the existing bible-files directory structure to ZBRS v1.0 format
 * Supports both English KJV and Amharic Bible formats
 */

console.log('🔄 Bible Files to ZBRS Converter starting...');

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Book order mapping for Protestant canon
const BOOK_ORDER = {
  // Old Testament
  'genesis': 1, 'gen': 1,
  'exodus': 2, 'exo': 2,
  'leviticus': 3, 'lev': 3,
  'numbers': 4, 'num': 4,
  'deuteronomy': 5, 'deu': 5,
  'joshua': 6, 'jos': 6,
  'judges': 7, 'jdg': 7,
  'ruth': 8, 'rut': 8,
  '1-samuel': 9, '1sa': 9, '1samuel': 9,
  '2-samuel': 10, '2sa': 10, '2samuel': 10,
  '1-kings': 11, '1ki': 11, '1kings': 11,
  '2-kings': 12, '2ki': 12, '2kings': 12,
  '1-chronicles': 13, '1ch': 13, '1chronicles': 13,
  '2-chronicles': 14, '2ch': 14, '2chronicles': 14,
  'ezra': 15, 'ezr': 15,
  'nehemiah': 16, 'neh': 16,
  'esther': 17, 'est': 17,
  'job': 18, 'job': 18,
  'psalms': 19, 'psa': 19,
  'proverbs': 20, 'pro': 20,
  'ecclesiastes': 21, 'ecc': 21,
  'song-of-solomon': 22, 'sng': 22, 'songofsolomon': 22,
  'isaiah': 23, 'isa': 23,
  'jeremiah': 24, 'jer': 24,
  'lamentations': 25, 'lam': 25,
  'ezekiel': 26, 'ezk': 26,
  'daniel': 27, 'dan': 27,
  'hosea': 28, 'hos': 28,
  'joel': 29, 'jol': 29,
  'amos': 30, 'amo': 30,
  'obadiah': 31, 'oba': 31,
  'jonah': 32, 'jon': 32,
  'micah': 33, 'mic': 33,
  'nahum': 34, 'nam': 34,
  'habakkuk': 35, 'hab': 35,
  'zephaniah': 36, 'zep': 36,
  'haggai': 37, 'hag': 37,
  'zechariah': 38, 'zec': 38,
  'malachi': 39, 'mal': 39,
  // New Testament
  'matthew': 40, 'mat': 40,
  'mark': 41, 'mrk': 41,
  'luke': 42, 'luk': 42,
  'john': 43, 'jhn': 43,
  'acts': 44, 'act': 44,
  'romans': 45, 'rom': 45,
  '1-corinthians': 46, '1co': 46, '1corinthians': 46,
  '2-corinthians': 47, '2co': 47, '2corinthians': 47,
  'galatians': 48, 'gal': 48,
  'ephesians': 49, 'eph': 49,
  'philippians': 50, 'php': 50,
  'colossians': 51, 'col': 51,
  '1-thessalonians': 52, '1th': 52, '1thessalonians': 52,
  '2-thessalonians': 53, '2th': 53, '2thessalonians': 53,
  '1-timothy': 54, '1ti': 54, '1timothy': 54,
  '2-timothy': 55, '2ti': 55, '2timothy': 55,
  'titus': 56, 'tit': 56,
  'philemon': 57, 'phm': 57,
  'hebrews': 58, 'heb': 58,
  'james': 59, 'jas': 59,
  '1-peter': 60, '1pe': 60, '1peter': 60,
  '2-peter': 61, '2pe': 61, '2peter': 61,
  '1-john': 62, '1jn': 62, '1john': 62,
  '2-john': 63, '2jn': 63, '2john': 63,
  '3-john': 64, '3jn': 64, '3john': 64,
  'jude': 65, 'jud': 65,
  'revelation': 66, 'rev': 66
};

function getBookOrder(bookName) {
  const normalized = bookName.toLowerCase().replace(/\.json$/, '');
  return BOOK_ORDER[normalized] || 0;
}

function getTestament(order) {
  return order <= 39 ? 'old' : 'new';
}

function generateZBRSBookName(order) {
  const bookNames = Object.keys(BOOK_ORDER).filter(name => BOOK_ORDER[name] === order);
  return bookNames.find(name => !name.includes('-') && name.length > 3) || bookNames[0];
}

function convertBookToZBRS(bookData, order) {
  const bookName = bookData.book || bookData.book_amharic || 'Unknown';
  const testament = getTestament(order);

  // Calculate totals
  let totalVerses = 0;
  const chapters = bookData.chapters.map(chapter => {
    const verses = chapter.verses.map(verse => {
      totalVerses++;
      return {
        number: parseInt(verse.verse),
        text: verse.text
      };
    });

    return {
      number: parseInt(chapter.chapter),
      verses: verses
    };
  });

  return {
    book: {
      id: generateZBRSBookName(order),
      name: bookName,
      abbreviation: bookName.substring(0, 3).toUpperCase(),
      order: order,
      testament: testament,
      chapters_count: chapters.length,
      verses_count: totalVerses
    },
    chapters: chapters
  };
}

function createManifest(repositoryInfo, books) {
  const oldTestamentCount = books.filter(b => b.book.testament === 'old').length;
  const newTestamentCount = books.filter(b => b.book.testament === 'new').length;

  return {
    zbrs_version: "1.0",
    repository: {
      id: repositoryInfo.id,
      name: repositoryInfo.name,
      description: repositoryInfo.description,
      version: "1.0.0",
      language: repositoryInfo.language,
      translation: repositoryInfo.translation,
      publisher: {
        name: "Zaphnath Project",
        url: "https://github.com/zaphnath-project",
        contact: "repositories@zaphnath.org"
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    content: {
      books_count: books.length,
      testament: {
        old: oldTestamentCount,
        new: newTestamentCount
      },
      features: {
        audio: false,
        cross_references: false,
        footnotes: false,
        study_notes: false
      }
    },
    technical: {
      encoding: "UTF-8",
      compression: "none",
      checksum: "sha256:0000000000000000000000000000000000000000000000000000000000000000",
      size_bytes: 0
    }
  };
}

function calculateChecksum(directory) {
  const hash = crypto.createHash('sha256');

  function addFileToHash(filePath) {
    if (fs.statSync(filePath).isFile()) {
      const content = fs.readFileSync(filePath);
      hash.update(content);
    }
  }

  function walkDirectory(dir) {
    const files = fs.readdirSync(dir).sort();
    for (const file of files) {
      const filePath = path.join(dir, file);
      if (fs.statSync(filePath).isDirectory()) {
        walkDirectory(filePath);
      } else {
        addFileToHash(filePath);
      }
    }
  }

  walkDirectory(directory);
  return `sha256:${hash.digest('hex')}`;
}

function getDirectorySize(directory) {
  let totalSize = 0;

  function walkDirectory(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stats = fs.statSync(filePath);
      if (stats.isDirectory()) {
        walkDirectory(filePath);
      } else {
        totalSize += stats.size;
      }
    }
  }

  walkDirectory(directory);
  return totalSize;
}

function convertBibleRepository(inputDir, outputDir, repositoryInfo) {
  console.log(`Converting ${inputDir} to ZBRS format...`);
  console.log(`Output directory: ${outputDir}`);

  // Create output directory structure
  const booksDir = path.join(outputDir, 'books');
  console.log(`Creating directories: ${outputDir}, ${booksDir}`);
  fs.mkdirSync(outputDir, { recursive: true });
  fs.mkdirSync(booksDir, { recursive: true });

  // Find JSON files
  const jsonDir = path.join(inputDir, 'json');
  console.log(`Looking for JSON files in: ${jsonDir}`);
  if (!fs.existsSync(jsonDir)) {
    throw new Error(`JSON directory not found: ${jsonDir}`);
  }

  const jsonFiles = fs.readdirSync(jsonDir).filter(f => f.endsWith('.json') && f !== 'Books.json');
  const books = [];

  // Convert each book
  for (const filename of jsonFiles) {
    const filePath = path.join(jsonDir, filename);
    const bookData = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    const order = getBookOrder(filename);
    if (order === 0) {
      console.warn(`Unknown book order for ${filename}, skipping...`);
      continue;
    }

    const zbrsBook = convertBookToZBRS(bookData, order);
    books.push(zbrsBook);

    // Write ZBRS book file
    const zbrsFilename = `${order.toString().padStart(2, '0')}-${zbrsBook.book.id}.json`;
    const zbrsPath = path.join(booksDir, zbrsFilename);
    fs.writeFileSync(zbrsPath, JSON.stringify(zbrsBook, null, 2));

    console.log(`Converted: ${filename} -> ${zbrsFilename}`);
  }

  // Sort books by order
  books.sort((a, b) => a.book.order - b.book.order);

  // Create manifest
  const manifest = createManifest(repositoryInfo, books);

  // Calculate actual checksum and size
  manifest.technical.checksum = calculateChecksum(outputDir);
  manifest.technical.size_bytes = getDirectorySize(outputDir);

  // Write manifest
  const manifestPath = path.join(outputDir, 'manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

  // Create README
  const readmePath = path.join(outputDir, 'README.md');
  const readmeContent = `# ${repositoryInfo.name}

${repositoryInfo.description}

## Repository Information

- **Language**: ${repositoryInfo.language.name}
- **Translation Type**: ${repositoryInfo.translation.type}
- **Books**: ${books.length}
- **ZBRS Version**: 1.0

## Usage

This repository follows the Zaphnath Bible Repository Standard (ZBRS) v1.0 and can be imported into any ZBRS-compatible application.

### Import into Zaphnath

\`\`\`javascript
const result = await window.repository.import('path/to/this/repository');
console.log(\`Imported \${result.books_imported} books\`);
\`\`\`

## License

${repositoryInfo.translation.license}
`;

  fs.writeFileSync(readmePath, readmeContent);

  console.log(`\n✅ Conversion complete!`);
  console.log(`📁 Output: ${outputDir}`);
  console.log(`📚 Books: ${books.length}`);
  console.log(`💾 Size: ${(manifest.technical.size_bytes / 1024).toFixed(1)} KB`);
  console.log(`🔒 Checksum: ${manifest.technical.checksum.substring(0, 16)}...`);
}

// Main execution
// For ES modules, check if this file is being run directly
const isMainModule = process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]));

if (isMainModule) {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.log(`
Usage: node bible-files-to-zbrs.js <input-dir> <output-dir> [repository-type]

Examples:
  node bible-files-to-zbrs.js "bible-files/eng/King James Version" "zbrs-repositories/kjv-1769"
  node bible-files-to-zbrs.js "bible-files/amh/Amharic Bible 1962" "zbrs-repositories/amharic-1962"
`);
    process.exit(1);
  }

  const inputDir = args[0];
  const outputDir = args[1];
  const repoType = args[2] || 'auto';

  // Repository configurations
  const repositories = {
    'kjv': {
      id: 'kjv-1769',
      name: 'King James Version (1769)',
      description: 'The 1769 Oxford Standard Text of the King James Bible',
      language: {
        code: 'en',
        name: 'English',
        direction: 'ltr'
      },
      translation: {
        type: 'formal',
        year: 1769,
        copyright: 'Public Domain',
        license: 'CC0-1.0',
        source: 'Oxford Standard Text'
      }
    },
    'amharic': {
      id: 'amharic-1962',
      name: 'Amharic Bible (1962)',
      description: 'Ethiopian Orthodox Tewahedo Church Amharic Bible',
      language: {
        code: 'am',
        name: 'Amharic',
        direction: 'ltr',
        script: 'Ethi'
      },
      translation: {
        type: 'formal',
        year: 1962,
        copyright: 'Ethiopian Orthodox Tewahedo Church',
        license: 'Traditional',
        source: 'Ge\'ez manuscripts'
      }
    }
  };

  // Auto-detect repository type
  let repositoryInfo;
  if (repoType === 'auto') {
    if (inputDir.includes('King James') || inputDir.includes('eng')) {
      repositoryInfo = repositories.kjv;
    } else if (inputDir.includes('Amharic') || inputDir.includes('amh')) {
      repositoryInfo = repositories.amharic;
    } else {
      console.error('Could not auto-detect repository type. Please specify: kjv or amharic');
      process.exit(1);
    }
  } else {
    repositoryInfo = repositories[repoType];
    if (!repositoryInfo) {
      console.error(`Unknown repository type: ${repoType}. Available: kjv, amharic`);
      process.exit(1);
    }
  }

  try {
    convertBibleRepository(inputDir, outputDir, repositoryInfo);
  } catch (error) {
    console.error('Conversion failed:', error.message);
    process.exit(1);
  }
}

export { convertBibleRepository, createManifest, convertBookToZBRS };
