/* 填空题的中文提示/校验语必须进词典
   2026-11-28 巡检发现：英文界面下抽查页的填空提示「可输入整数、小数或分数…」
   和格式警告、以及讲义页填空的「确定」按钮仍是中文（字典漏翻）。
   这些串只出现在脚本动态写入的文本节点里，靠 i18n 的 MutationObserver 补翻，
   所以必须整串进 EN 词典，不能只翻前缀。 */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const SRC = fs.readFileSync(path.join(__dirname, '..', 'i18n.js'), 'utf8');

const NEED = [
  '可输入整数、小数或分数，例如 12、4.5 或 3/4。',
  '每空可输入整数、小数或分数，例如 12、4.5 或 3/4。',
  '只能输入数字、小数点、斜杠和负号，不要带 %、$、逗号、字母或单位',
  '每一空只能写数字、小数点、斜杠和负号，不要带 %、$、逗号、字母或单位',
  '格式无效：可写小数（如 0.75）或分数（如 3/4）',
  '确定',
];

test('填空提示、格式警告、确定按钮都在英文词典里', () => {
  for (const k of NEED) {
    assert.ok(SRC.includes("'" + k + "':"), 'i18n 词典缺词条：' + k + '（英文界面会漏出中文）');
  }
});

test('英文模式下填空文案与脚本原文一致（防止改脚本不改词典）', () => {
  const drill = fs.readFileSync(path.join(__dirname, '..', 'drill.js'), 'utf8');
  const exam = fs.readFileSync(path.join(__dirname, '..', 'exam.js'), 'utf8');
  const jy = fs.readFileSync(path.join(__dirname, '..', 'jiangyi-page.js'), 'utf8');
  const scripts = drill + exam + jy;
  for (const k of NEED) {
    if (k === '确定') {
      assert.ok(jy.includes('确定'), '讲义页确认按钮文案变了，词典词条要同步');
      continue;
    }
    if (scripts.includes(k)) continue;
    assert.fail('脚本里已没有这条文案，词典词条应同步删除：' + k);
  }
});
