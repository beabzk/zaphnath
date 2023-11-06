import { BOOK_NAME_MAP } from './bookNames.js';

const bookSelectElement = document.querySelector('#bookSelector');
const bookNameElement = document.querySelector('#bookName');
const contentPageElement = document.querySelector('#contentPage');
const chapterSelectElement = document.querySelector('#chapSelector');


// fetches the names of the books
fetch('../Bible-kjv/Books.json')
  .then(response => response.json())
  .then(jsonBooks => {
    jsonBooks.forEach(book => {
      const optionElement = document.createElement('option');
      optionElement.value = book;
      optionElement.textContent = book;
      bookSelectElement.appendChild(optionElement);
    });
  });

function updateBook(selectedBook) {

  // Clear existing options
  chapterSelectElement.innerHTML = ''; 
  contentPageElement.innerHTML = '';
  // Reset the chapter selector to the first option
  chapterSelectElement.selectedIndex = 0;

  const bookFile = BOOK_NAME_MAP[selectedBook];
  fetch(`../Bible-kjv/${bookFile}.json`)
    .then(response => response.json())
    .then(jsonBook => {



      // Populate the chapter selector with options
      jsonBook.chapters.forEach((chapter, index) => {
        const optionElement = document.createElement('option');
        optionElement.value = index + 1; // chapter numbers start at 1
        optionElement.textContent = `Chapter ${index + 1}`;
        chapterSelectElement.appendChild(optionElement);
      });



      // Display the first chapter by default
      updateChapter(jsonBook, 0);
    });
}

// A function to update the displayed chapter
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
bookSelectElement.addEventListener('change', (event) => {
  updateBook(event.target.value);
});
// Add event listener to chapter selector
chapterSelectElement.addEventListener('change', (event) => {

  const selectedBook = bookSelectElement.value;
  const bookFile = BOOK_NAME_MAP[selectedBook];

  fetch(`../Bible-kjv/${bookFile}.json`)
    .then(response => response.json())
    .then(jsonBook => {
      updateChapter(jsonBook, event.target.value - 1);
    });
});

// Call updateBook for 'Genesis' when the page loads
window.onload = function() {
  updateBook('Genesis');
}