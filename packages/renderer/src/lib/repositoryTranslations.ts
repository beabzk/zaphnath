import type { Repository, TranslationInfo } from '@/types/store';

export type TranslationRecord = Partial<Zaphnath.RepositoryTranslationRow> & {
  id?: unknown;
  name?: unknown;
  directory?: unknown;
  language?: unknown;
};

type TranslationSource = TranslationRecord | TranslationInfo;

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function asNumber(value: unknown): number | undefined {
  return typeof value === 'number' ? value : undefined;
}

export function getTranslationId(translation: TranslationSource, fallbackId?: string): string {
  return (
    asString((translation as TranslationRecord).translation_id) ??
    asString(translation.id) ??
    fallbackId ??
    ''
  );
}

export function findTranslationRecordById(
  translations: TranslationRecord[],
  translationId: string
): TranslationRecord | null {
  return (
    translations.find((translation) => getTranslationId(translation) === translationId) ?? null
  );
}

export function toTranslationInfo(translation: TranslationRecord): TranslationInfo {
  return {
    id: getTranslationId(translation),
    name: asString(translation.translation_name) ?? asString(translation.name) ?? '',
    directory: asString(translation.directory_name) ?? asString(translation.directory) ?? '',
    language: asString(translation.language_code) ?? asString(translation.language) ?? '',
    status: asString(translation.status) ?? 'active',
    book_count: asNumber(translation.book_count),
    verse_count: asNumber(translation.verse_count),
  };
}

export function toTranslationInfoList(
  translations: TranslationRecord[] | null | undefined
): TranslationInfo[] {
  return (translations ?? []).map(toTranslationInfo);
}

export function createTranslationRepository(
  parent: Repository,
  translation: TranslationSource,
  fallback?: Partial<Repository>
): Repository {
  const record = translation as TranslationRecord;
  const translationId = getTranslationId(translation, fallback?.id ?? `${parent.id}-translation`);
  const translationName =
    asString(record.translation_name) ??
    asString(translation.name) ??
    fallback?.name ??
    translationId;

  return {
    id: translationId,
    name: translationName,
    description:
      asString(record.translation_description) ??
      fallback?.description ??
      `${translationName} from ${parent.name}`,
    language:
      asString(record.language_code) ??
      asString(translation.language) ??
      fallback?.language ??
      parent.language ??
      'en',
    version: asString(record.translation_version) ?? fallback?.version ?? parent.version ?? '1.0.0',
    created_at: asString(record.created_at) ?? fallback?.created_at ?? parent.created_at,
    updated_at: asString(record.updated_at) ?? fallback?.updated_at ?? parent.updated_at,
    type: 'translation',
    parent_id: parent.id,
    book_count: asNumber(translation.book_count) ?? fallback?.book_count,
    verse_count: asNumber(translation.verse_count) ?? fallback?.verse_count,
  };
}
