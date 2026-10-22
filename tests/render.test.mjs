import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
const root = path.resolve(import.meta.dirname, '..');
const source = await readFile(path.join(root, 'src/build.mjs'), 'utf8');
test('hero identifies the author and provides contact and project paths', () => {
  assert.match(source, /Привет, я Данил/);
  assert.match(source, /href=\\"#projects\\"|href="#projects"/);
  assert.match(source, /data-contact-channel=\\"telegram\\"|data-contact-channel="telegram"/);
});
test('cases are only published with content', () => {
  assert.match(source, /project\.status === 'published'/);
  assert.match(source, /requires sections/);
});
test('footer has a privacy information link', () => {
  assert.match(source, /privacy\//);
});

test('value proposition and AI system are present', () => {
  assert.match(source, /Не просто сайты/);
  assert.match(source, /разрабатываю собственную ИИ-систему/);
  assert.match(source, /Больше четырёх лет/);
});
test('the old brand does not appear in public page builder', () => {
  assert.doesNotMatch(source, /VOID/i);
});
test('all project discussions use Telegram personal account', () => {
  assert.match(source, /site\.telegram/);
  assert.doesNotMatch(source, /mailto:/);
});
