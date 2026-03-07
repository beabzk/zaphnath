import type { RepositoryState } from '@/types/store';

export type RepositoryStoreSetState =
  | Partial<RepositoryState>
  | ((state: RepositoryState) => Partial<RepositoryState>);

export type RepositoryStoreSet = (
  partial: RepositoryStoreSetState,
  replace?: false,
  action?: string
) => void;

export type RepositoryStoreGet = () => RepositoryState;
