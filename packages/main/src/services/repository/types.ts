// ZBRS Type Definitions for Zaphnath Bible Repository Standard

export interface ZBRSManifest {
  zbrs_version: string;
  repository: RepositoryInfo;
  content: ContentInfo;
  technical: TechnicalInfo;
  extensions?: Record<string, ExtensionInfo>;
}

export interface RepositoryInfo {
  id: string;
  name: string;
  description: string;
  version: string;
  language: LanguageInfo;
  translation: TranslationInfo;
  publisher: PublisherInfo;
  created_at: string;
  updated_at: string;
}

export interface LanguageInfo {
  code: string;
  name: string;
  direction: 'ltr' | 'rtl';
  script?: string;
}

export interface TranslationInfo {
  type: 'formal' | 'dynamic' | 'paraphrase' | 'interlinear';
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
}

export interface TechnicalInfo {
  encoding: 'UTF-8';
  compression: 'none' | 'gzip' | 'brotli';
  checksum: string;
  size_bytes: number;
}

export interface ExtensionInfo {
  version: string;
  data?: any;
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
  testament: 'old' | 'new';
  chapters_count: number;
  verses_count: number;
  genre?: 'law' | 'history' | 'wisdom' | 'prophecy' | 'gospel' | 'epistle' | 'apocalyptic';
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
  type?: 'textual' | 'translation' | 'explanation' | 'cross_reference';
}

export interface CrossReference {
  reference: string;
  text?: string;
}

export interface StudyNote {
  title: string;
  content: string;
  type?: 'historical' | 'cultural' | 'theological' | 'linguistic' | 'archaeological';
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
  type: 'official' | 'third-party' | 'local';
  url: string;
  name: string;
  enabled: boolean;
  last_checked?: string;
}

// Import and Validation Types

export interface ImportProgress {
  stage: 'discovering' | 'validating' | 'downloading' | 'processing' | 'complete' | 'error';
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
  severity: 'error' | 'warning';
}

export interface ValidationWarning {
  code: string;
  message: string;
  path?: string;
}

export interface ImportOptions {
  repository_url: string;
  validate_checksums: boolean;
  download_audio: boolean;
  overwrite_existing: boolean;
  progress_callback?: (progress: ImportProgress) => void;
}

export interface ImportResult {
  success: boolean;
  repository_id: string;
  books_imported: number;
  errors: string[];
  warnings: string[];
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
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ZBRSError';
  }
}

export class ValidationError extends ZBRSError {
  constructor(message: string, public path?: string, details?: any) {
    super(message, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
  }
}

export class NetworkError extends ZBRSError {
  constructor(message: string, public url: string, details?: any) {
    super(message, 'NETWORK_ERROR', details);
    this.name = 'NetworkError';
  }
}

export class IntegrityError extends ZBRSError {
  constructor(message: string, public file_path: string, details?: any) {
    super(message, 'INTEGRITY_ERROR', details);
    this.name = 'IntegrityError';
  }
}
