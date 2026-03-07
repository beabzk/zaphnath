import { ZBRSValidator } from './validator.js';
import type {
  ImportProgress,
  TranslationReference,
  ValidationResult,
  ValidationWarning,
  ZBRSParentManifest,
} from './types.js';

interface ParentImportTranslationTask {
  translation: TranslationReference;
  sequenceNumber: number;
  totalTranslations: number;
  slotStart: number;
  slotEnd: number;
}

interface ParentImportPlan {
  validation: ValidationResult;
  skippedTranslationIds: string[];
  translationTasks: ParentImportTranslationTask[];
}

const PARENT_IMPORT_START = 20;
const PARENT_IMPORT_RANGE = 75;

export class RepositoryParentImportPlanner {
  constructor(private validator: ZBRSValidator) {}

  public planParentImport(
    manifest: ZBRSParentManifest,
    selectedTranslations: string[] | undefined
  ): ParentImportPlan {
    const validation = this.validator.validateParentManifest(manifest);
    const selectedTranslationIds = new Set(selectedTranslations ?? []);
    const useSelectiveImport = selectedTranslationIds.size > 0;
    const availableTranslationIds = new Set(
      manifest.translations.map((translation) => translation.id)
    );
    const skippedTranslationIds = useSelectiveImport
      ? manifest.translations
          .filter((translation) => !selectedTranslationIds.has(translation.id))
          .map((translation) => translation.id)
      : [];
    const selectionWarnings = this.getUnknownSelectionWarnings(
      selectedTranslationIds,
      availableTranslationIds
    );
    const translationsToImport = useSelectiveImport
      ? manifest.translations.filter((translation) => selectedTranslationIds.has(translation.id))
      : manifest.translations;
    const totalTranslations = translationsToImport.length;

    return {
      validation: {
        ...validation,
        warnings: [...validation.warnings, ...selectionWarnings],
      },
      skippedTranslationIds,
      translationTasks: translationsToImport.map((translation, index) => ({
        translation,
        sequenceNumber: index + 1,
        totalTranslations,
        slotStart: PARENT_IMPORT_START + (index / totalTranslations) * PARENT_IMPORT_RANGE,
        slotEnd: PARENT_IMPORT_START + ((index + 1) / totalTranslations) * PARENT_IMPORT_RANGE,
      })),
    };
  }

  public mapChildProgress(
    task: ParentImportTranslationTask,
    progress: ImportProgress
  ): ImportProgress {
    const boundedChildProgress = Math.max(0, Math.min(100, progress.progress));
    const mappedProgress =
      task.slotStart + ((task.slotEnd - task.slotStart) * boundedChildProgress) / 100;

    return {
      ...progress,
      progress: Math.round(mappedProgress),
      message: `[${task.sequenceNumber}/${task.totalTranslations}] ${progress.message}`,
    };
  }

  private getUnknownSelectionWarnings(
    selectedTranslationIds: Set<string>,
    availableTranslationIds: Set<string>
  ): ValidationWarning[] {
    if (selectedTranslationIds.size === 0) {
      return [];
    }

    const unknownSelections = [...selectedTranslationIds].filter(
      (translationId) => !availableTranslationIds.has(translationId)
    );
    if (unknownSelections.length === 0) {
      return [];
    }

    return [
      {
        code: 'UNKNOWN_TRANSLATION_SELECTION',
        message: `Selected translations not found in parent manifest: ${unknownSelections.join(', ')}`,
        name: 'ValidationWarning',
      },
    ];
  }
}
