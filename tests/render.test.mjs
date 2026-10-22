import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
const root = path.resolve(import.meta.dirname, '..');
const source = await readFile(path.join(root, 'src/build.mjs'), 'utf8');
test('hero identifies the author and provides contact and project paths', () => {
  assert.match(source, /Привет, я Данил/);
  assert.match(source, /href=\\"#projects\\"|href="#projects"/);
  assert.match(source, /href=\\"#contact\\"|href="#contact"/);
});
test('cases are only published with content', () => {
  assert.match(source, /project\.status === 'published'/);
  assert.match(source, /requires sections/);
});
test('footer has a privacy information link', () => {
  assert.match(source, /privacy\//);
});
