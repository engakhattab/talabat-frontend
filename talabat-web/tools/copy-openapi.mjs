import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const workspaceRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const backendRoot = resolve(workspaceRoot, '..', '..', 'talabat');
const openApiDir = resolve(workspaceRoot, 'openapi');

const documents = [
  {
    source: resolve(backendRoot, 'src', 'Talabat', 'Talabat.API', 'openapi', 'customer-api.json'),
    target: resolve(openApiDir, 'customer-api.json'),
  },
  {
    source: resolve(
      backendRoot,
      'src',
      'Talabat',
      'Talabat.Delivery.API',
      'openapi',
      'delivery-api.json',
    ),
    target: resolve(openApiDir, 'delivery-api.json'),
  },
];

export function normalizeNumericSchemas(filePath) {
  const document = JSON.parse(readFileSync(filePath, 'utf8'));
  normalizeNumericDocument(document);
  writeFileSync(`${filePath}`, `${JSON.stringify(document, null, 2)}\n`);
}

export function normalizeNumericDocument(document) {
  visit(document);
  return document;
}

function visit(value) {
  if (Array.isArray(value)) {
    for (const item of value) {
      visit(item);
    }
    return;
  }

  if (!value || typeof value !== 'object') {
    return;
  }

  if (value.type === undefined && typeof value.format === 'string') {
    if (value.format === 'int32' || value.format === 'int64') {
      value.type = 'integer';
    }

    if (value.format === 'float' || value.format === 'double' || value.format === 'decimal') {
      value.type = 'number';
    }
  }

  for (const child of Object.values(value)) {
    visit(child);
  }
}

const isDirectExecution =
  process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectExecution) {
  mkdirSync(openApiDir, { recursive: true });

  for (const document of documents) {
    copyFileSync(document.source, document.target);
    normalizeNumericSchemas(document.target);
  }
}
