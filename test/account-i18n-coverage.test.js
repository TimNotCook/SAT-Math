/* 账户面板里「直接印在界面上的字」不许漏英文。
   事故面：英文模式下点「Create an account」/「Forgot password?」，
   子面板整段回落成中文（设置密码 / 确认密码 / 注册并登录 / 重置说明），
   而且之前的巡检只查首屏，翻到子面板才发现。
   这里静态扫 cloud-account.js 里 el(tag, cls, '中文') 的第三参，
   每条都必须在 i18n 的英文词典里有对应键。 */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const ACC = fs.readFileSync(path.join(ROOT, 'cloud-account.js'), 'utf8');
const I18N = fs.readFileSync(path.join(ROOT, 'i18n.js'), 'utf8');

/* 词典键：'中文': 'English' 里冒号左边那一段 */
const KEYS = new Set();
I18N.replace(/'((?:[^'\\]|\\.)*)'\s*:\s*["']/g, (m, k) => { KEYS.add(k); return m; });

test('账户面板直出的中文都有英文词条', () => {
  const missing = [];
  ACC.replace(/el\('(\w+)',\s*[^,]+,\s*'((?:[^'\\]|\\.)*)'/g, (m, tag, text) => {
    if (/[\u4e00-\u9fff]/.test(text) && !KEYS.has(text)) missing.push(tag + ': ' + text);
    return m;
  });
  assert.deepStrictEqual(missing, [], '英文模式下这些字会是中文：\n' + missing.join('\n'));
});
