import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { buildManifest, diffManifests } from './verify-generated-api.mjs';

async function fixtureTree(root, files) {
  for (const [relativePath, content] of Object.entries(files)) {
    const target = join(root, relativePath);
    await mkdir(join(root, relativePath.split(/[\\/]/).slice(0, -1).join('/')), {
      recursive: true,
    });
    if (content === null) {
      continue;
    }
    await writeFile(target, content);
  }
}

function manifestPaths(manifest) {
  return [...manifest.keys()].sort();
}

test('diff reports identical manifests as empty', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'talabat-verify-identical-'));
  try {
    const committed = join(directory, 'committed');
    const generated = join(directory, 'generated');
    const files = {
      'api/api.ts': 'export *;\n',
      'model/models.ts': 'export *;\n',
      'model/shared/address.ts': 'export interface Address {}\n',
    };
    await fixtureTree(committed, files);
    await fixtureTree(generated, files);

    const expected = buildManifest(committed);
    const actual = buildManifest(generated);
    assert.deepEqual(diffManifests(committed, generated, expected, actual), {
      added: [],
      removed: [],
      changed: [],
    });
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('diff reports added, removed, and changed relative paths', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'talabat-verify-drift-'));
  try {
    const committed = join(directory, 'committed');
    const generated = join(directory, 'generated');
    await fixtureTree(committed, {
      'api/api.ts': 'export * from a;\n',
      'model/shared/address.ts': 'export interface Address { id: number }\n',
      'model/shared/legacy.ts': 'export interface Legacy {}\n',
    });
    await fixtureTree(generated, {
      'api/api.ts': 'export * from a;\nexport * from b;\n',
      'model/shared/address.ts': 'export interface Address { id: string }\n',
      'model/catalog/restaurant.ts': 'export interface Restaurant {}\n',
    });

    const expected = buildManifest(committed);
    const actual = buildManifest(generated);
    const diff = diffManifests(committed, generated, expected, actual);
    assert.deepEqual([...diff.added].sort(), ['model/catalog/restaurant.ts']);
    assert.deepEqual([...diff.removed].sort(), ['model/shared/legacy.ts']);
    assert.deepEqual([...diff.changed].sort(), ['api/api.ts', 'model/shared/address.ts']);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('buildManifest excludes deterministic generator metadata by default filter', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'talabat-verify-metadata-'));
  try {
    const committed = join(directory, 'committed');
    await fixtureTree(committed, {
      '.openapi-generator/VERSION': '1.0.0\n',
      'api/api.ts': 'export *;\n',
    });

    const withMetadata = buildManifest(committed);
    assert.deepEqual(manifestPaths(withMetadata), [
      '.openapi-generator/VERSION',
      'api/api.ts',
    ]);

    const excluded = buildManifest(committed, (rel) => !/(^|\/)\.openapi-generator\//.test(rel));
    assert.deepEqual(manifestPaths(excluded), ['api/api.ts']);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('diff treats a replaced symlink target as changed', { skip: process.platform === 'win32' }, async () => {
  const directory = await mkdtemp(join(tmpdir(), 'talabat-verify-symlink-'));
  try {
    const committed = join(directory, 'committed');
    const generated = join(directory, 'generated');
    await fixtureTree(committed, { 'api/api.ts': 'export *;\n' });
    await fixtureTree(generated, { 'api/api.ts': 'export *;\n' });
    const link = join(generated, 'link.ts');
    await mkdir(join(generated, 'api'), { recursive: true });
    await symlink('api/api.ts', link);

    const expected = buildManifest(committed);
    const actual = buildManifest(generated);
    const diff = diffManifests(committed, generated, expected, actual);
    assert.deepEqual(diff.added, ['link.ts']);
    assert.deepEqual(diff.removed, []);
    assert.deepEqual(diff.changed, []);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
