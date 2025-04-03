# Amharic Bible JSON Parser

This project contains a Python script (`parse_bible.py`) designed to parse HTML source files of the Amharic Bible and convert them into a structured JSON format.

## Purpose

The goal is to transform the Bible text from HTML into a machine-readable JSON format, making it easier to use for applications, analysis, or digital archiving.

## Source

The HTML source files were obtained from:
[https://bible.org/sites/bible.org/resources/foreign/amharic/](https://bible.org/sites/bible.org/resources/foreign/amharic/)

## How it Works

The script (`parse_bible.py`):
1.  Looks for HTML files in the `source/` directory. It expects files named according to specific conventions (e.g., `gen.htm`, `gen_toc.htm`, `gen-1.htm`).
2.  Uses `BeautifulSoup` to parse the HTML structure.
3.  Extracts book titles (English and Amharic using a predefined mapping), chapter numbers, verse numbers, and the corresponding Amharic text.
4.  Handles different scenarios based on the availability of main book files, table of contents (TOC) files, and individual chapter files.
5.  Outputs the structured data into individual JSON files within the `json/` directory (e.g., `json/gen.json`).
6.  Logs its progress and any errors to `bible_parser.log`.

## Output JSON Structure

Each generated JSON file follows this structure:

```json
{
  "book": "Genesis", // English book name
  "book_amharic": "ዘፍጥረት", // Amharic book name
  "chapters": [
    {
      "chapter": 1,
      "verses": [
        {
          "verse": "1", // Can be a single number or a range like "1-3"
          "text": "በ‌መ‌ጀ‌መ‌ሪ‌ያ እግ‌ዚ‌አብ‌ሔር ሰማይና ምድ‌ርን ፈጠረ።" // Amharic verse text
        },
        // ... more verses
      ]
    },
    // ... more chapters
  ]
}
```

## Requirements

*   Python 3
*   BeautifulSoup4 (`pip install beautifulsoup4`)

## Usage

1.  Place the downloaded HTML source files into a `source/` directory, ensuring they follow the expected naming convention.
2.  Install the necessary dependency: `pip install beautifulsoup4`
3.  Run the script from the project's root directory: `python parse_bible.py`
4.  The JSON files will be generated in the `json/` directory.

## Book Mappings

The script uses an internal mapping (`BOOK_MAPPINGS`) to associate file abbreviations (e.g., `gen`) with their corresponding English and Amharic names.