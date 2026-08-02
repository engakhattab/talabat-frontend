import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { normalizeNumericDocument, normalizeNumericSchemas } from './copy-openapi.mjs';

test('normalizes missing numeric types without changing other OpenAPI content', () => {
  const document = {
    paths: {
      '/cart': { get: { operationId: 'GetCart' } },
    },
    components: {
      schemas: {
        Identifier: { format: 'int64', description: 'Database identifier' },
        Price: { format: 'decimal' },
        Existing: { type: 'string', format: 'int32' },
        Label: { description: 'Non-numeric schema' },
        Nested: {
          properties: {
            quantity: { format: 'int32' },
            weight: { format: 'double' },
          },
          allOf: [{ format: 'float' }],
        },
      },
    },
  };

  assert.equal(normalizeNumericDocument(document), document);
  assert.equal(document.components.schemas.Identifier.type, 'integer');
  assert.equal(document.components.schemas.Price.type, 'number');
  assert.equal(document.components.schemas.Existing.type, 'string');
  assert.equal(document.components.schemas.Label.type, undefined);
  assert.equal(document.components.schemas.Nested.properties.quantity.type, 'integer');
  assert.equal(document.components.schemas.Nested.properties.weight.type, 'number');
  assert.equal(document.components.schemas.Nested.allOf[0].type, 'number');
  assert.deepEqual(document.paths, {
    '/cart': { get: { operationId: 'GetCart' } },
  });
  assert.equal(document.components.schemas.Identifier.description, 'Database identifier');
});

test('normalizes files idempotently in a temporary directory', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'talabat-openapi-tools-'));
  const filePath = join(directory, 'customer-api.json');
  const fixture = {
    components: {
      schemas: {
        Total: { format: 'decimal' },
      },
    },
  };

  try {
    await writeFile(filePath, `${JSON.stringify(fixture)}\n`);
    normalizeNumericSchemas(filePath);
    const firstPass = await readFile(filePath, 'utf8');

    normalizeNumericSchemas(filePath);
    const secondPass = await readFile(filePath, 'utf8');

    assert.equal(secondPass, firstPass);
    assert.equal(JSON.parse(secondPass).components.schemas.Total.type, 'number');
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
