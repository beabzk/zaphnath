export type ParentRepositoryInput = {
  id: string;
  name: string;
  description: string;
  version: string;
};

export type TranslationRepositoryInput = {
  id: string;
  name: string;
  description: string;
  language: string;
  version: string;
  parent_id: string;
  directory_name?: string;
  status?: string;
};

export type RepositoryTranslationInput = {
  id: string;
  parent_repository_id: string;
  translation_id: string;
  translation_name: string;
  translation_description?: string | null;
  translation_version: string;
  directory_name: string;
  language_code: string;
  status?: string;
};
