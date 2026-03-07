import { useCallback, useEffect, useState } from 'react';
import type { TranslationInfo } from '@/types/store';

type RepositoryLike = {
  id: string;
  type?: 'parent' | 'translation';
};

type UseRepositoryListTranslationsParams = {
  repositories: RepositoryLike[];
  translationsByParent: Record<string, TranslationInfo[]>;
  loadTranslations: (parentId: string) => Promise<TranslationInfo[]>;
};

export function useRepositoryListTranslations({
  repositories,
  translationsByParent,
  loadTranslations,
}: UseRepositoryListTranslationsParams) {
  const [expandedParents, setExpandedParents] = useState<Set<string>>(new Set());
  const [translationsLoadingByParent, setTranslationsLoadingByParent] = useState<
    Record<string, boolean>
  >({});
  const [translationErrorByParent, setTranslationErrorByParent] = useState<Record<string, string>>(
    {}
  );

  const loadTranslationsForParent = useCallback(
    async (parentId: string) => {
      if (translationsByParent[parentId] || translationsLoadingByParent[parentId]) {
        return;
      }

      setTranslationsLoadingByParent((prev) => ({ ...prev, [parentId]: true }));
      setTranslationErrorByParent((prev) => {
        const next = { ...prev };
        delete next[parentId];
        return next;
      });

      try {
        await loadTranslations(parentId);
      } catch (translationError) {
        console.error(`Failed to fetch translations for ${parentId}:`, translationError);
        setTranslationErrorByParent((prev) => ({
          ...prev,
          [parentId]:
            translationError instanceof Error
              ? translationError.message
              : 'Failed to load translations',
        }));
      } finally {
        setTranslationsLoadingByParent((prev) => ({ ...prev, [parentId]: false }));
      }
    },
    [loadTranslations, translationsByParent, translationsLoadingByParent]
  );

  useEffect(() => {
    const activeParentIds = new Set(
      repositories.filter((repo) => repo.type === 'parent').map((repo) => repo.id)
    );

    setExpandedParents((prev) => {
      const filtered = new Set([...prev].filter((id) => activeParentIds.has(id)));
      return filtered.size === prev.size ? prev : filtered;
    });

    setTranslationsLoadingByParent((prev) =>
      Object.fromEntries(Object.entries(prev).filter(([id]) => activeParentIds.has(id)))
    );

    setTranslationErrorByParent((prev) =>
      Object.fromEntries(Object.entries(prev).filter(([id]) => activeParentIds.has(id)))
    );
  }, [repositories]);

  useEffect(() => {
    expandedParents.forEach((parentId) => {
      void loadTranslationsForParent(parentId);
    });
  }, [expandedParents, loadTranslationsForParent]);

  const toggleParentExpansion = useCallback(
    (parentId: string) => {
      const shouldExpand = !expandedParents.has(parentId);

      setExpandedParents((prev) => {
        const next = new Set(prev);
        if (next.has(parentId)) {
          next.delete(parentId);
        } else {
          next.add(parentId);
        }
        return next;
      });

      if (shouldExpand) {
        void loadTranslationsForParent(parentId);
      }
    },
    [expandedParents, loadTranslationsForParent]
  );

  return {
    expandedParents,
    translationErrorByParent,
    translationsLoadingByParent,
    toggleParentExpansion,
  };
}
