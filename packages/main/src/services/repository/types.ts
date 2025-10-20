// ZBRS Type Definitions for Zaphnath Bible Repository Standard

// Parent Repository Manifest (type: "parent")
export interface ZBRSParentManifest {
  zbrs_version: string;
  repository: ParentRepositoryInfo;
  publisher: PublisherInfo;
  translations: TranslationReference[];
  technical: TechnicalInfo;
  extensions?: Record<string, ExtensionInfo>;
}

// Translation Manifest (individual translation)
export interface ZBRSTranslationManifest {
  zbrs_version: string;
  repository: RepositoryInfo;
  content: ContentInfo;
  technical: TechnicalInfo;
  extensions?: Record<string, ExtensionInfo>;
}

// Union type for all manifest types
export type ZBRSManifest = ZBRSParentManifest | ZBRSTranslationManifest;

// Parent repository info (for coordination manifests)
export interface ParentRepositoryInfo {
  id: string;
  name: string;
  description: string;
  version: string;
  type: "parent";
  created_at: string;
  updated_at: string;
}

// Translation repository info (for individual translations)
export interface RepositoryInfo {
  id: string;
  name: string;
  description: string;
  version: string;
  language: LanguageInfo;
  translation: TranslationInfo;
  created_at: string;
  updated_at: string;
}

// Translation reference in parent manifest
export interface TranslationReference {
  id: string;
  name: string;
  directory: string;
  language: LanguageInfo;
  status: "active" | "inactive" | "deprecated";
}

export interface LanguageInfo {
  code: string;
  name: string;
  direction: "ltr" | "rtl";
  script?: string;
}

export interface TranslationInfo {
  type: "formal" | "dynamic" | "paraphrase" | "interlinear";
  year: number;
  copyright: string;
  license: string;
  source: string;
  translators?: string[];
}

export interface PublisherInfo {
  name: string;
  url?: string;
  contact?: string;
}

export interface ContentInfo {
  books_count: number;
  testament: {
    old: number;
    new: number;
  };
  features: {
    audio: boolean;
    cross_references: boolean;
    footnotes: boolean;
    study_notes: boolean;
  };
  books?: ContentBookReference[];
}

export interface TechnicalInfo {
  encoding: "UTF-8";
  compression: "none" | "gzip" | "brotli";
  checksum: string;
  size_bytes: number;
}

export interface ExtensionInfo {
  version: string;
  data?: any;
}

export interface ContentBookReference {
  path: string;
  checksum: string;
  size_bytes?: number;
  media_type?: string;
}

export interface ZBRSBook {
  book: BookInfo;
  chapters: Chapter[];
  metadata?: BookMetadata;
}

export interface BookInfo {
  id: string;
  name: string;
  abbreviation: string;
  order: number;
  testament: "old" | "new";
  chapters_count: number;
  verses_count: number;
  genre?:
    | "law"
    | "history"
    | "wisdom"
    | "prophecy"
    | "gospel"
    | "epistle"
    | "apocalyptic";
  author?: string;
}

export interface Chapter {
  number: number;
  verses: Verse[];
  title?: string;
  audio?: string;
}

export interface Verse {
  number: number;
  text: string;
  audio?: string;
  footnotes?: Footnote[];
  cross_references?: CrossReference[];
  study_notes?: StudyNote[];
}

export interface Footnote {
  marker: string;
  text: string;
  type?: "textual" | "translation" | "explanation" | "cross_reference";
}

export interface CrossReference {
  reference: string;
  text?: string;
}

export interface StudyNote {
  title: string;
  content: string;
  type?:
    | "historical"
    | "cultural"
    | "theological"
    | "linguistic"
    | "archaeological";
  author?: string;
}

export interface BookMetadata {
  outline?: OutlineSection[];
  themes?: string[];
}

export interface OutlineSection {
  title: string;
  start_chapter: number;
  start_verse: number;
  end_chapter?: number;
  end_verse?: number;
}

// Repository Discovery Types

export interface RepositoryIndex {
  version: string;
  repositories: RepositoryIndexEntry[];
}

export interface RepositoryIndexEntry {
  id: string;
  name: string;
  url: string;
  language: string;
  license: string;
  verified: boolean;
  last_updated: string;
  description?: string;
  tags?: string[];
}

export interface RepositorySource {
  type: "official" | "third-party" | "local";
  url: string;
  name: string;
  enabled: boolean;
  last_checked?: string;
}

export interface RepositoryDbRecord {
  id: string;
  name: string;
  description: string | null;
  version: string;
  type: "parent" | "translation";
  parent_id: string | null;
  language: string | null;
  created_at: string;
  updated_at: string;
  imported_at?: string | null;
  metadata?: string | null;
}

// Import and Validation Types

export interface ImportProgress {
  stage:
    | "discovering"
    | "validating"
    | "downloading"
    | "processing"
    | "complete"
    | "error";
  progress: number; // 0-100
  message: string;
  current_book?: string;
  total_books?: number;
  processed_books?: number;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  code: string;
  message: string;
  path?: string;
  severity: "error";
  details?: Record<string, unknown>;
  name?: string;
}

export interface ValidationWarning {
  code: string;
  message: string;
  path?: string;
  severity?: "warning";
  details?: Record<string, unknown>;
  name?: string;
}

export interface ImportOptions {
  repository_url: string;
  validate_checksums: boolean;
  download_audio: boolean;
  overwrite_existing: boolean;
  import_type?: "full" | "translation"; // New: specify import type
  selected_translations?: string[]; // New: for selective translation import
  progress_callback?: (progress: ImportProgress) => void;
}

export interface ImportResult {
  success: boolean;
  repository_id: string;
  books_imported: number;
  translations_imported?: string[];
  translations_skipped?: string[];
  errors: ValidationError[];
  warnings: ValidationWarning[];
  duration_ms: number;
}

// Security and Integrity Types

export interface SecurityPolicy {
  allow_http: boolean;
  max_repository_size: number;
  max_file_size: number;
  allowed_domains: string[];
  blocked_domains: string[];
  require_checksums: boolean;
}

export interface IntegrityCheck {
  file_path: string;
  expected_checksum: string;
  actual_checksum: string;
  valid: boolean;
}

// Error Types

export class ZBRSError extends Error {
  constructor(message: string, public code: string, public details?: any) {
    super(message);
    this.name = "ZBRSError";
  }
}

export class NetworkError extends ZBRSError {
  constructor(message: string, public url: string, details?: any) {
    super(message, "NETWORK_ERROR", details);
    this.name = "NetworkError";
  }
}

export class IntegrityError extends ZBRSError {
  constructor(message: string, public file_path: string, details?: any) {
    super(message, "INTEGRITY_ERROR", details);
    this.name = "IntegrityError";
  }
}

// Type Guard Functions

export function isParentManifest(
  manifest: ZBRSManifest
): manifest is ZBRSParentManifest {
  return (
    "translations" in manifest &&
    "publisher" in manifest &&
    "repository" in manifest &&
    (manifest.repository as any).type === "parent"
  );
}

export function isTranslationManifest(
  manifest: ZBRSManifest
): manifest is ZBRSTranslationManifest {
  return (
    "content" in manifest &&
    !("translations" in manifest) &&
    !("publisher" in manifest)
  );
}

export function isParentRepositoryInfo(
  repo: ParentRepositoryInfo | RepositoryInfo
): repo is ParentRepositoryInfo {
  return (repo as ParentRepositoryInfo).type === "parent";
}
