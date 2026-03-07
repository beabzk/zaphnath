import addFormats from 'ajv-formats';
import { existsSync, readFileSync } from 'fs';
import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';

import type { ValidationError } from './types.js';

export type SchemaError = {
  instancePath?: string;
  message?: string;
};

export type ValidateFunction = ((data: unknown) => boolean) & {
  errors?: SchemaError[] | null;
};

type AjvCompiler = {
  compile: (schema: unknown) => ValidateFunction;
};

type AddFormatsFunction = ((ajv: AjvCompiler) => void) | undefined;

const require = createRequire(import.meta.url);
const Ajv2020 = require('ajv/dist/2020.js') as new (
  options: Record<string, unknown>
) => AjvCompiler;

function createAjvCompiler(): AjvCompiler {
  const ajv = new Ajv2020({
    allErrors: true,
    strict: false,
    validateFormats: true,
    allowUnionTypes: true,
  });
  const addFormatsFn: AddFormatsFunction =
    typeof addFormats === 'function'
      ? addFormats
      : (addFormats as unknown as { default?: AddFormatsFunction }).default;

  addFormatsFn?.(ajv);
  return ajv;
}

function resolveSchemasDirectory(): string {
  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  const searchRoots = [process.cwd(), currentDir];

  for (const root of searchRoots) {
    let probe = root;
    while (true) {
      const candidate = path.join(probe, 'docs', 'schemas');
      const manifestPath = path.join(candidate, 'manifest.schema.json');
      const bookPath = path.join(candidate, 'book.schema.json');
      if (existsSync(manifestPath) && existsSync(bookPath)) {
        return candidate;
      }

      const parent = path.dirname(probe);
      if (parent === probe) {
        break;
      }
      probe = parent;
    }
  }

  throw new Error('Unable to locate docs/schemas directory');
}

function readJsonFile(filePath: string): unknown {
  const raw = readFileSync(filePath, 'utf-8');
  return JSON.parse(raw.replace(/^\uFEFF/, ''));
}

function pushSchemaErrors(
  target: ValidationError[],
  ajvErrors: SchemaError[] | null | undefined,
  prefix: string
): void {
  if (!ajvErrors) {
    return;
  }

  for (const error of ajvErrors) {
    const pointer = error.instancePath || '/';
    target.push({
      code: 'SCHEMA_VALIDATION',
      message: `${prefix}${pointer}: ${error.message ?? 'schema validation failed'}`,
      path: error.instancePath || undefined,
      severity: 'error',
      name: 'ValidationError',
    });
  }
}

export function createSchemaValidators(): {
  manifestValidator: ValidateFunction;
  bookValidator: ValidateFunction;
} {
  const ajv = createAjvCompiler();
  const schemasDir = resolveSchemasDirectory();
  const manifestSchemaPath = path.join(schemasDir, 'manifest.schema.json');
  const bookSchemaPath = path.join(schemasDir, 'book.schema.json');

  return {
    manifestValidator: ajv.compile(readJsonFile(manifestSchemaPath)),
    bookValidator: ajv.compile(readJsonFile(bookSchemaPath)),
  };
}

export function validateAgainstSchema(
  validator: ValidateFunction | null,
  payload: unknown,
  errors: ValidationError[],
  label: string
): void {
  if (!validator) {
    errors.push({
      code: 'SCHEMA_NOT_LOADED',
      message: 'Schema validator is not initialized',
      severity: 'error',
      name: 'ValidationError',
    });
    return;
  }

  const valid = validator(payload);
  if (!valid) {
    pushSchemaErrors(errors, validator.errors, `${label} `);
  }
}
