import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import {
  baseGeneratorJarPath,
  ensureBaseGeneratorJar,
  pinnedGeneratorVersion,
} from './api-generator.mjs';

async function withTempDir(callback) {
  const root = await mkdtemp(join(tmpdir(), 'talabat-api-generator-'));
  try {
    await callback(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

test('pinnedGeneratorVersion reads generator-cli.version from openapitools.json', async () => {
  await withTempDir(async (root) => {
    const config = join(root, 'openapitools.json');
    await writeFile(config, JSON.stringify({ 'generator-cli': { version: '7.11.0' } }));

    assert.equal(pinnedGeneratorVersion(config), '7.11.0');
  });
});

test('pinnedGeneratorVersion fails clearly when no version is pinned', async () => {
  await withTempDir(async (root) => {
    const config = join(root, 'openapitools.json');
    await writeFile(config, JSON.stringify({ 'generator-cli': {} }));

    assert.throws(() => pinnedGeneratorVersion(config), /generator-cli\.version/);
  });
});

test('baseGeneratorJarPath points at the CLI versions cache', () => {
  assert.equal(
    baseGeneratorJarPath('7.11.0', join('cli-root')),
    join('cli-root', 'versions', '7.11.0.jar'),
  );
});

test('ensureBaseGeneratorJar does not download when the jar is already cached', () => {
  let downloads = 0;

  ensureBaseGeneratorJar({
    jarPath: 'cached.jar',
    exists: () => true,
    download: () => {
      downloads += 1;
    },
  });

  assert.equal(downloads, 0);
});

test('ensureBaseGeneratorJar downloads the pinned jar when it is missing', () => {
  let present = false;
  let downloads = 0;

  ensureBaseGeneratorJar({
    jarPath: 'missing.jar',
    exists: () => present,
    download: () => {
      downloads += 1;
      present = true;
    },
  });

  assert.equal(downloads, 1);
});

test('ensureBaseGeneratorJar fails clearly when the download does not produce the jar', () => {
  assert.throws(
    () =>
      ensureBaseGeneratorJar({
        jarPath: 'still-missing.jar',
        exists: () => false,
        download: () => {},
      }),
    /still-missing\.jar/,
  );
});
