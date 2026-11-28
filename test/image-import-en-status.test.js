/* test/image-import-en-status.test.js
 *
 * 2026-11-28 巡检：错题页「图片识别导入」面板在英文界面下，status 行和各类提示
 * 整段是中文——image-import.js 里只有登录两句话走 EN_UI() 三目，其余全是写死的中文，
 * 而且是运行时拼出来的整句，MutationObserver 逐节点翻译也捞不到。
 *
 * 这里把 i18n.js 的 EN 词典与 PATS 抠出来跑一遍 t()，锁住这批文案不漏中文。
 */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const SRC = fs.readFileSync(path.join(ROOT, 'i18n.js'), 'utf8');

/* 直接跑真实实现：给 i18n.js 一个最小 window/document，再用它挂出来的 __i18nT */
const sandbox = {
  window: {},
  document: {
    addEventListener() {},
    querySelectorAll() { return []; },
    querySelector() { return null; },
    createElement() { return { style: {}, setAttribute() {}, appendChild() {} }; },
    createTextNode(t) { return { nodeValue: t }; },
    documentElement: { setAttribute() {}, lang: 'zh' },
    head: { appendChild() {} },
    body: { appendChild() {} },
    readyState: 'loading',
    title: ''
  },
  localStorage: { getItem() { return null; }, setItem() {} },
  MutationObserver: class { observe() {} disconnect() {} },
  setTimeout() {},
};
sandbox.window = { localStorage: sandbox.localStorage, MutationObserver: sandbox.MutationObserver, setTimeout: sandbox.setTimeout, document: sandbox.document, location: { href: 'http://localhost/' }, navigator: { language: 'zh-CN' } };
new Function('window', 'document', 'localStorage', 'MutationObserver', 'navigator', 'setTimeout', SRC)(
  sandbox.window, sandbox.document, sandbox.localStorage, sandbox.MutationObserver, sandbox.window.navigator, sandbox.setTimeout
);
const t = sandbox.window.__i18nT;
assert.strictEqual(typeof t, 'function', 'i18n.js 没有挂出 __i18nT，测试无法验证真实翻译');

const CASES = [
  '云服务暂不可用，请稍后重试',
  '当前 SDK 不支持云端登录，请更新后重试',
  '云端未登录，跳过精确匹配；本地识别结果仅供核对，不会自动导入。',
  '云端未登录，本次用本地识别（精度较低）；点「登录云端账号」可启用精确识别。',
  '像是深色背景，取反后再认一次…',
  '照片偏灰/拍歪了，先压平打正再认…',
  '没有可撤销的导入',
  '文字太短，至少贴半句题干（8 个字符以上）。',
  '题库里没找到像这道题的，换个说法或只贴题干里的关键词。',
  '敲两个字符以上再找，比如 24 或 slope。',
  '没找到，换个关键词试试（数字或题干短语更准）。',
  '请选择图片文件（PNG / JPG / WebP 等）',
  '正在识别上一批图片，请稍候…',
  '没有需要重试的图片',
  '这台浏览器不支持本地识别内核；把题干里几个词敲进下面的搜框，照样能查题导入。',
  '这台浏览器的内核禁用了 WebAssembly，本地识别起不来',
  '本地识别超时（网络过慢），请换个网络或稍后点「重试失败项」。',
  '本地识别组件加载超时，请换个网络或稍后点「重试失败项」。',
  '云端比对不可用，文本匹配也不够稳（可从下面的题目里点一个）',
  '需到 WorkBuddy 后台把本站点域名重新加入允许列表',
  '从粘贴的文字里找这道题…',
  '选项缺失：这道题的选项在原书里无法识别，本题暂不可作答。',
  '电子笔直接写；圆点调粗细；手型图标让开画布，可点选项和翻页',
  '移动模式：画布已让开，可直接点选项、翻页、开题号导航；点手型图标回到书写',
  '登录发起失败：Network down',
  '本地识别引擎这次没起来（wasm disabled）。不用等它，把题干文字贴到上面的框里点「用文字导入」，一样能配题写库。',
  '文字最像的是 线性方程与函数图像 · #12（76%），但没到自动写入的把握，下面点一下即导入。',
  '没找到匹配「4x 24x」的题。试试只敲数字（如 24 36）或题干里的英文短语。',
  '题库里找到 3 道，点一道即导入。',
  '这道题已有作答记录，按「只增不改」原则没有改动（线性方程 · #12）。',
  '自检中：内核 wasm✓ 缓存 sw✓，正在识别测试图…',
  '自检通过：1.8 秒，认到「x + 3 = 7」，匹配分 92%（这一条只是演示图，不会写进错题本）',
  '自检失败：2.4 秒 · timeout（这不是你的错，把这句话发我就行）',
];

test('导入面板的每条运行态文案在英文模式下都不留中文', () => {
  const bad = [];
  for (const s of CASES) {
    const out = t(s);
    if (/[\u4e00-\u9fff]/.test(out)) bad.push(s + '  =>  ' + out);
  }
  assert.deepEqual(bad, []);
});
