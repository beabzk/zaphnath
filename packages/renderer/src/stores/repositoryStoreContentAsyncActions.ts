import { repository } from '@app/preload';
import { toRendererBooks, toRendererChapterData } from '@/lib/repositoryContent';
import { toRepositoryError } from '@/lib/repositoryStoreAdapters';
import type { RepositoryState } from '@/types/store';
import type { RepositoryStoreGet, RepositoryStoreSet } from './repositoryStoreActionTypes';

export function createRepositoryStoreContentAsyncActions(
  _set: RepositoryStoreSet,
  get: RepositoryStoreGet
): Pick<RepositoryState, 'loadBooks' | 'loadChapter'> {
  return {
    loadBooks: async (repositoryId: string) => {
      const { setLoading, setError, setBooks } = get();

      try {
        setLoading(true);
        setError(null);

        const books = await repository.getBooks(repositoryId);
        setBooks(toRendererBooks(books));
      } catch (error) {
        setError(toRepositoryError(error, 'Failed to load books'));
      } finally {
        setLoading(false);
      }
    },

    loadChapter: async (bookId: string, chapterNumber: number) => {
      const { setLoading, setError, setCurrentChapter, setVerses } = get();

      try {
        setLoading(true);
        setError(null);

        const chapterData = await repository.getChapter(bookId, chapterNumber);
        const mappedChapterData = toRendererChapterData(bookId, chapterNumber, chapterData);

        if (mappedChapterData) {
          setCurrentChapter(mappedChapterData.chapter);
          setVerses(mappedChapterData.verses);
        }
      } catch (error) {
        setError(toRepositoryError(error, 'Failed to load chapter'));
      } finally {
        setLoading(false);
      }
    },
  };
}
