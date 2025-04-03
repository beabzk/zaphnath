import React, { useState, useEffect, useMemo } from 'react';
import { invoke } from "@tauri-apps/api/core";
import './App.css';
import { Select, Card, Toggle, ScriptureView } from './components';

// --- Interfaces matching Rust structs ---

interface TranslationInfo {
  id: string;
  name: string;
  year?: number;
  folder: string;
}

interface LanguageInfo {
  code: string;
  name: string;
  translations: TranslationInfo[];
}

interface BookInfo {
  name: string; // Name displayed in UI (depends on which manifest was loaded)
  abbr: string; // Abbreviation for filename
  chapters: number;
}

interface Verse {
  verse: string; // "1" or "1-2" etc.
  text: string;
}

// Helper type for Chapter options
interface ChapterOption {
    chapter: number;
}

function App() {
  const [languages, setLanguages] = useState<LanguageInfo[]>([]);
  const [selectedLanguageCode, setSelectedLanguageCode] = useState<string>('');

  const [currentTranslations, setCurrentTranslations] = useState<TranslationInfo[]>([]);
  const [selectedTranslationId, setSelectedTranslationId] = useState<string>(''); // Store ID like KJV, AMH1962
  const [selectedTranslationFolder, setSelectedTranslationFolder] = useState<string>(''); // Store Folder like KJV, Amharic Bible 1962

  const [books, setBooks] = useState<BookInfo[]>([]);
  const [selectedBookAbbr, setSelectedBookAbbr] = useState<string>('');

  const [chapterOptions, setChapterOptions] = useState<ChapterOption[]>([]);
  const [selectedChapter, setSelectedChapter] = useState<number>(1);

  const [verses, setVerses] = useState<Verse[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Settings state
  const [fontSize, setFontSize] = useState<number>(16);
  const [darkMode, setDarkMode] = useState<boolean>(false);

  // 1. Fetch available languages and their translations on mount
  useEffect(() => {
    const loadInitialData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const manifest = await invoke<LanguageInfo[]>('get_translations_manifest');
        setLanguages(manifest);
        if (manifest.length > 0) {
          setSelectedLanguageCode(manifest[0].code); // Default to first language
        } else {
          setError("No languages found in manifest.");
        }
      } catch (err) {
        console.error("Failed to fetch translations manifest:", err);
        setError(`Failed to load languages: ${err}`);
      } finally {
        // setIsLoading(false); // Loading continues in subsequent effects
      }
    };
    loadInitialData();
  }, []);

  // 2. Update available translations when language changes
  useEffect(() => {
    const selectedLang = languages.find(lang => lang.code === selectedLanguageCode);
    if (selectedLang) {
      setCurrentTranslations(selectedLang.translations);
      if (selectedLang.translations.length > 0) {
        setSelectedTranslationId(selectedLang.translations[0].id); // Default to first translation
        setSelectedTranslationFolder(selectedLang.translations[0].folder);
      } else {
        setSelectedTranslationId('');
        setSelectedTranslationFolder('');
        setBooks([]); // Clear books if no translations for this language
      }
    } else {
      setCurrentTranslations([]);
      setSelectedTranslationId('');
        setSelectedTranslationFolder('');
      setBooks([]);
    }
  }, [selectedLanguageCode, languages]);

  // 3. Fetch book manifest when language or translation changes
  useEffect(() => {
    if (selectedLanguageCode && selectedTranslationFolder) {
      const loadBooks = async () => {
        setIsLoading(true);
        setError(null);
        setBooks([]); // Clear previous books
        try {
          const bookManifest = await invoke<BookInfo[]>('get_book_manifest', {
            languageCode: selectedLanguageCode,
            translationFolder: selectedTranslationFolder,
          });
          setBooks(bookManifest);
          if (bookManifest.length > 0) {
            setSelectedBookAbbr(bookManifest[0].abbr); // Default to first book abbr
          } else {
            setSelectedBookAbbr('');
            setError(`No books found for ${selectedTranslationFolder}.`);
          }
        } catch (err) {
          console.error("Failed to fetch book manifest:", err);
          setError(`Failed to load books: ${err}`);
        } finally {
          // setIsLoading(false); // Loading continues
        }
      };
      loadBooks();
    }
  }, [selectedLanguageCode, selectedTranslationFolder]); // Depend on folder name

   // 4. Update chapter options whenever selectedBookAbbr changes
   useEffect(() => {
        setChapterOptions([]); // Clear previous options
        if (selectedBookAbbr) {
            const selectedBookInfo = books.find((b) => b.abbr === selectedBookAbbr);
            if (selectedBookInfo) {
                const newChapterOptions = Array.from({ length: selectedBookInfo.chapters }, (_, i) => ({ chapter: i + 1 })); //1-indexed
                setChapterOptions(newChapterOptions);
                setSelectedChapter(1); // Reset to chapter 1
            } else {
                 setSelectedChapter(1); // Reset even if book info not found yet
            }
        }
    }, [selectedBookAbbr, books]); // Depend on books array as well

  // 5. Fetch chapter content when language, translation, book, or chapter changes
  useEffect(() => {
    if (selectedLanguageCode && selectedTranslationFolder && selectedBookAbbr && selectedChapter > 0) {
      const loadChapterContent = async () => {
        setIsLoading(true);
        setError(null);
        setVerses([]); // Clear previous verses
        try {
          const verseData = await invoke<Verse[]>('get_chapter_content', {
            languageCode: selectedLanguageCode,
            translationFolder: selectedTranslationFolder,
            bookAbbr: selectedBookAbbr,
            chapterNumber: selectedChapter,
          });
          setVerses(verseData);
        } catch (err) {
          console.error("Failed to fetch chapter content:", err);
          setError(`Failed to load chapter: ${err}`);
          setVerses([]);
        } finally {
          setIsLoading(false);
        }
      };
      loadChapterContent();
    } else {
        setIsLoading(false); // Ensure loading stops if prerequisites aren't met
        setVerses([]);
    }
  }, [selectedLanguageCode, selectedTranslationFolder, selectedBookAbbr, selectedChapter]);

  // Apply dark mode class
  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  // These options are now handled by the Select component

  // Handler for translation change
  const handleTranslationChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
      const newTransId = event.target.value;
      setSelectedTranslationId(newTransId);
      // Find the corresponding folder name
      const selectedTrans = currentTranslations.find(t => t.id === newTransId);
      if (selectedTrans) {
          setSelectedTranslationFolder(selectedTrans.folder);
      }
  };


  // Convert languages to Select options format
  const languageSelectOptions = useMemo(() => {
    return languages.map(lang => ({
      value: lang.code,
      label: lang.name
    }));
  }, [languages]);

  // Convert translations to Select options format
  const translationSelectOptions = useMemo(() => {
    return currentTranslations.map(t => ({
      value: t.id,
      label: t.name
    }));
  }, [currentTranslations]);

  // Convert books to Select options format
  const bookSelectOptions = useMemo(() => {
    return books.map(b => ({
      value: b.abbr,
      label: b.name
    }));
  }, [books]);

  // Convert chapters to Select options format
  const chapterSelectOptions = useMemo(() => {
    return chapterOptions.map(c => ({
      value: c.chapter.toString(),
      label: c.chapter.toString()
    }));
  }, [chapterOptions]);

  return (
    // Apply Amharic font if Amharic is selected
    <div
      className={`container mx-auto p-6 min-h-screen ${darkMode ? 'bg-neutral-950 text-neutral-50' : 'bg-neutral-100 text-neutral-900'} ${selectedLanguageCode === 'amh' ? 'font-amharic' : 'font-sans'}`}
      style={{ fontSize: `${fontSize}px` }}
    >
      <header className="mb-8">
        <h1 className="text-4xl font-bold text-center text-primary-700 dark:text-primary-400">Zaphnath</h1>
        <p className="text-center text-neutral-600 dark:text-neutral-400 mt-2">Bible Reader</p>
      </header>

      <div className="max-w-4xl mx-auto grid gap-6 md:grid-cols-[1fr_3fr] mb-6">
        {/* Sidebar with controls */}
        <aside>
          <Card className="mb-6">
            <h2 className="text-xl font-semibold mb-4 text-neutral-900 dark:text-neutral-100">Navigation</h2>

            <div className="space-y-4">
              {/* Language Selector */}
              <Select
                id="language-select"
                label="Language"
                value={selectedLanguageCode}
                onChange={(e) => setSelectedLanguageCode(e.target.value)}
                options={languageSelectOptions}
                disabled={isLoading}
              />

              {/* Translation Selector */}
              <Select
                id="translation-select"
                label="Translation"
                value={selectedTranslationId}
                onChange={handleTranslationChange}
                options={translationSelectOptions.length > 0 ? translationSelectOptions : [{ value: '', label: 'Select Language First' }]}
                disabled={isLoading || currentTranslations.length === 0}
              />

              {/* Book Selector */}
              <Select
                id="book-select"
                label="Book"
                value={selectedBookAbbr}
                onChange={(e) => setSelectedBookAbbr(e.target.value)}
                options={bookSelectOptions.length > 0 ? bookSelectOptions : [{ value: '', label: 'Select Translation First' }]}
                disabled={isLoading || books.length === 0}
              />

              {/* Chapter Selector */}
              <Select
                id="chapter-select"
                label="Chapter"
                value={selectedChapter.toString()}
                onChange={(e) => setSelectedChapter(parseInt(e.target.value, 10))}
                options={chapterSelectOptions.length > 0 ? chapterSelectOptions : [{ value: '', label: 'Select Book First' }]}
                disabled={isLoading || chapterOptions.length === 0}
              />
            </div>
          </Card>

          <Card>
            <h2 className="text-xl font-semibold mb-4 text-neutral-900 dark:text-neutral-100">Settings</h2>

            <div className="space-y-4">
              {/* Font Size */}
              <div>
                <label htmlFor="font-size" className="block mb-2 font-medium text-neutral-700 dark:text-neutral-300">Font Size: {fontSize}px</label>
                <input
                  type="range"
                  id="font-size"
                  min="12"
                  max="36"
                  value={fontSize}
                  onChange={(e) => setFontSize(parseInt(e.target.value))}
                  className="w-full h-2 bg-neutral-200 rounded-lg appearance-none cursor-pointer dark:bg-neutral-700"
                />
              </div>

              {/* Dark Mode Toggle */}
              <Toggle
                id="dark-mode"
                label="Dark Mode"
                checked={darkMode}
                onChange={setDarkMode}
              />
            </div>
          </Card>
        </aside>

        {/* Main Content */}
        <main>
          <Card className="h-full" elevation="lg">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
                {books.find(b => b.abbr === selectedBookAbbr)?.name || 'Scripture'} {selectedChapter}
              </h2>

              <div className="text-sm text-neutral-600 dark:text-neutral-400">
                {currentTranslations.find(t => t.id === selectedTranslationId)?.name || ''}
              </div>
            </div>

            <ScriptureView
              verses={verses}
              isLoading={isLoading}
              error={error}
              className="font-scripture"
            />
          </Card>
        </main>
      </div>

      <footer className="text-center text-sm text-neutral-600 dark:text-neutral-400 mt-8">
        <p>Zaphnath Bible Reader &copy; {new Date().getFullYear()}</p>
      </footer>
    </div>
  );
}

export default App;