const selectElement = document.querySelector('#bookSelector');
const bookNameElement = document.querySelector('#bookName');
const contentPageElement = document.querySelector('#contentPage');
const chapterSelectElement = document.querySelector('#chapSelector');

const bookNameToFile = {

  "1 Chronicles": "1Chronicles",
  "1 Corinthians": "1Corinthians",
  "1 John": "1John",
  "1 Kings": "1Kings",
  "1 Peter": "1Peter",
  "1 Samuel": "1Samuel",
  "1 Thessalonians": "1Thessalonians",
  "1 Timothy": "1Timothy",
  "2 Chronicles": "2Chronicles",
  "2 Corinthians": "2Corinthians",
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

// fetches the names of the books
fetch('../Bible-kjv/Books.json')
  .then(response => response.json())
  .then(jsonBooks => {
    jsonBooks.forEach(book => {
      const optionElement = document.createElement('option');
      optionElement.value = book;
      optionElement.textContent = book;
      selectElement.appendChild(optionElement);
    });
  });

// Define a function to update the displayed book
function updateBook(selectedBook) {
  // bookNameElement.textContent = selectedBook;
  const fileName = bookNameToFile[selectedBook];
  fetch(`../Bible-kjv/${fileName}.json`)
    .then(response => response.json())
    .then(jsonBook => {
      // Clear any existing options in the chapter selector
      contentPageElement.innerHTML = '';

      // Populate the chapter selector with options
      jsonBook.chapters.forEach((chapter, index) => {
        const optionElement = document.createElement('option');
        optionElement.value = index + 1; // chapter numbers start at 1
        optionElement.textContent = `Chapter ${index + 1}`;
        chapterSelectElement.appendChild(optionElement);
      });

      // Reset the chapter selector to the first option
      chapterSelectElement.selectedIndex = 0;

      // Display the first chapter by default
      updateChapter(jsonBook, 0);
    });
}

// Define a function to update the displayed chapter
function updateChapter(jsonBook, chapterIndex) {
  const chapter = jsonBook.chapters[chapterIndex];
  // Update the book name and clear any existing content
  bookNameElement.textContent = `${jsonBook.book} ${chapter.chapter}`;
  contentPageElement.innerHTML = '';
  // Display the verses of the selected chapter
  chapter.verses.forEach(verse => {
    const verseElement = document.createElement('p');
    verseElement.textContent = `${verse.verse}. ${verse.text}`;
    contentPageElement.appendChild(verseElement);
  });
}

// Add event listener to select element
selectElement.addEventListener('change', (event) => {
  updateBook(event.target.value);
});
// Add event listener to chapter selector
chapterSelectElement.addEventListener('change', (event) => {
  const selectedBook = selectElement.value;
  const fileName = bookNameToFile[selectedBook];
  fetch(`../Bible-kjv/${fileName}.json`)
    .then(response => response.json())
    .then(jsonBook => {
      updateChapter(jsonBook, event.target.value - 1);
    });
});

// Call updateBook for 'Genesis' when the page loads
window.onload = function() {
  updateBook('Genesis');
}