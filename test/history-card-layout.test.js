/* 记录页窄屏卡片头：320 宽时分数/状态与标题抢同一行，标题只剩 70px，
   「submitted」被拆成「submitte / d」。这里锁住两条规则，防止回退。 */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const css = fs.readFileSync(path.join(__dirname, '..', 'app.css'), 'utf8');
const block = css.match(/@media\(max-width:640px\)\{[\s\S]*?\n\}/);
assert.ok(block, 'app.css 里找不到记录页窄屏样式块');

test('窄屏卡片头把分数挪到标题下一行，标题吃满整行', () => {
  assert.match(block[0], /\.hist-bar-head\{grid-template-columns:14px minmax\(0,1fr\) 22px;/,
    '窄屏卡片头仍是「标题 + 分数」同一行，320 宽会把单词拆断');
  assert.match(block[0], /\.hist-score\{grid-column:2;grid-row:2;/,
    '分数没有落到第二行');
});

test('标题按单词换行，不把 submitted 拆成两截', () => {
  assert.match(block[0], /\.hist-title\{[^}]*overflow-wrap:break-word/,
    '标题应使用 break-word，避免 anywhere 把单词从中间切断');
  assert.ok(!/\.hist-title\{[^}]*overflow-wrap:anywhere/.test(block[0]),
    '标题不能用 overflow-wrap:anywhere');
});
