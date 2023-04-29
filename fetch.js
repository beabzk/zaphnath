const selectElement = document.querySelector('#mySelect');
const bookNameElement = document.querySelector('#bookName');
const outputElement = document.querySelector('#output');

const bookNameToFile = {

  "1 Chronicles": "1Chronicles",
  "1 Corinthians": "1 Corinthians",
  "1 John": "1John",
  "1 Kings": "1Kings",
  "1 Peter": "1Peter",
  "1 Samuel": "1Samuel",
  "1 Thessalonians": "1Thessalonians",
  "1 Timothy": "1Timothy",
  "2 Chronicles": "2Chronicles",
  "2 Corinthians": "2 Corinthians",
  "2 John": "2John",
  "2 Kings": "2Kings",
  "2 Peter": "2Peter",
  "2 Samuel": "2Samuel",
  "2 Thessalonians": "2Thessalonians",
  "2 Timothy": "2Timothy",
  "3 John": "3John",
  "Acts": "Acts",
  "Amos": "Amos",
  "Colossians": "Colossians",
  "Daniel": "Daniel",
  "Deuteronomy": "Deuteronomy",
  "Ecclesiastes": "Ecclesiastes",
  "Ephesians": "Ephesians",
  "Esther": "Esther",
  "Exodus": "Exodus",
  "Ezekiel": "Ezekiel",
  "Ezra": "Ezra",
  "Galatians": "Galatians",
  "Genesis": "Genesis",
  "Habakkuk": "Habakkuk",
  "Haggai": "Haggai",
  "Hebrews": "Hebrews",
  "Hosea": "Hosea",
  "Isaiah": "Isaiah",
  "James": "James",
  "Jeremiah": "Jeremiah",
  "Job": "Job",
  "Joel": "Joel",
  "John": "John",
  "Jonah": "Jonah",
  "Joshua": "Joshua",
  "Jude": "Jude",
  "Judges": "Judges",
  "Lamentations": "Lamentations",
  "Leviticus": "Leviticus",
  "Luke": "Luke",
  "Malachi": "Malachi",
  "Mark": "Mark",
  "Matthew": "Matthew",
  "Micah": "Micah",
  "Nahum": "Nahum",
  "Nehemiah": "Nehemiah",
  "Numbers": "Numbers",
  "Obadiah": "Obadiah",
  "Philemon": "Philemon",
  "Philippians": "Philippians",
  "Proverbs": "Proverbs",
  "Psalms": "Psalms",
  "Revelation": "Revelation",
  "Romans": "Romans",
  "Ruth": "Ruth",
  "Song of Solomon": "SongofSolomon",
  "Titus": "Titus",
  "Zechariah": "Zechariah",
  "Zephaniah": "Zephaniah"
};

fetch('Bible-kjv/Books.json')
  .then(response => response.json())
  .then(jsonBooks => {
    jsonBooks.forEach(book => {
      const optionElement = document.createElement('option');
      optionElement.value = book;
      optionElement.textContent = book;
      selectElement.appendChild(optionElement);
    });
  });

selectElement.addEventListener('change', (event) => {
  const selectedBook = event.target.value;
  bookNameElement.textContent = selectedBook;
  const fileName = bookNameToFile[selectedBook];
  fetch(`Bible-kjv/${fileName}.json`)
    .then(response => response.json())
    .then(jsonBook => {
      outputElement.innerHTML = '';
      jsonBook.chapters.forEach(chapter => {
        const chapterElement = document.createElement('h2');
        chapterElement.textContent = `Chapter ${chapter.chapter}`;
        outputElement.appendChild(chapterElement);
        chapter.verses.forEach(verse => {
          const verseElement = document.createElement('p');
          verseElement.textContent = `${verse.verse}. ${verse.text}`;
          outputElement.appendChild(verseElement);
        });
      });
    });
});