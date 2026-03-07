import type { Repository as BaseRepository } from '@/types/store';

export interface RepositoryListRepository extends BaseRepository {
  translation_count?: number;
}

export interface DeleteTarget {
  id: string;
  name: string;
}
