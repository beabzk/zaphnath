import type { RepositoryState } from '@/types/store';
import type { RepositoryStoreGet, RepositoryStoreSet } from './repositoryStoreActionTypes';
import { createRepositoryStoreContentAsyncActions } from './repositoryStoreContentAsyncActions';
import { createRepositoryStoreRepositoryAsyncActions } from './repositoryStoreRepositoryAsyncActions';

export function createRepositoryStoreAsyncActions(
  set: RepositoryStoreSet,
  get: RepositoryStoreGet
): Pick<
  RepositoryState,
  | 'loadParentRepositories'
  | 'loadTranslations'
  | 'loadRepositories'
  | 'loadBooks'
  | 'loadChapter'
  | 'importRepository'
  | 'validateRepository'
> {
  return {
    ...createRepositoryStoreRepositoryAsyncActions(set, get),
    ...createRepositoryStoreContentAsyncActions(set, get),
  };
}
