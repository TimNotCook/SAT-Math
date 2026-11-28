/* 守门：i18n 词典同一块里不许出现重复键。
   事故背景（2026-11-28）：06914dc 补英文词典时又把「题库暂无错题，仅显示导入错题」
   写了一遍，对象字面量后者覆盖前者，新译文（— showing imported ones only）
   永远不生效；同一类重复键还会让后续补词悄悄失效，肉眼很难发现。 */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const SRC = fs.readFileSync(path.join(__dirname, '..', 'i18n.js'), 'utf8');

function keysOf(blockName, endMarker) {
  const start = SRC.indexOf('var ' + blockName + ' = {');
  assert.ok(start > -1, blockName + ' 词典缺失');
  const end = SRC.indexOf(endMarker, start);
  assert.ok(end > start, blockName + ' 词典块没有收口');
  const block = SRC.slice(start, end);
  const keys = [...block.matchAll(/^\s*'([^']+)'\s*:/gm)].map(m => m[1]);
  const dup = keys.filter((k, i) => keys.indexOf(k) !== i);
  return { keys, dup: [...new Set(dup)] };
}

test('EN 精确词典块没有重复键', () => {
  const { keys, dup } = keysOf('EN', '\n  };');
  assert.ok(keys.length > 200, 'EN 词条数异常');
  assert.deepStrictEqual(dup, [], 'EN 词典有重复键，后写的会覆盖前一条');
});

test('PHRASES 短语词典块没有重复键', () => {
  const { keys, dup } = keysOf('PHRASES', '\n  };');
  assert.ok(keys.length > 20, 'PHRASES 词条数异常');
  assert.deepStrictEqual(dup, [], 'PHRASES 词典有重复键');
});

test('「题库暂无错题」使用最新译文，不再被旧条覆盖', () => {
  const { t } = require('../i18n.js');
  assert.equal(t('题库暂无错题，仅显示导入错题'), 'No wrong answers in the bank — showing imported ones only');
});
