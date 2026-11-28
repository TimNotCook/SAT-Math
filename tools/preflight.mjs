#!/usr/bin/env node
/* tools/preflight.mjs — 推送前的最后一道闸（只看 HEAD 里真正要推的东西）
 *
 * 为什么需要：main 上已经出现过两次同型事故——一次把 `<<<<<<< HEAD` 冲突标记
 * 提交进 exam.js（整页 SyntaxError，模考/抽查/成绩页全挂，线上也中招），
 * 一次把 image-import.js 写成了 0 字节（一批图片导入单测全红）。
 * 这两种都不是"业务写错了"，是提交前根本没跑检查。npm test 能抓到，
 * 但没人跑；所以把它塞进 pre-push：不通过就不许推。
 *
 * 检查项（全部基于 HEAD 快照，不看工作树，避免误伤别人的未提交改动）：
 *   1) Git 冲突标记（<<<<<<< / ======= / >>>>>>>）
 *   2) 空的 .js 文件
 *   3) 每个 .js 的语法（node --check）；.mjs 不查，页面脚本都是普通脚本
 *
 * 用法：
 *   node tools/preflight.mjs          # 直接跑，PASS/FAIL
 *   git config core.hooksPath ...     # 或装成 .git/hooks/pre-push
 */
import { execFileSync } from 'child_process';
import { writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

const git = (...a) => execFileSync('git', a, { encoding: 'utf8' });
let files;
try {
  files = git('ls-tree', '-r', '--name-only', 'HEAD').split('\n').filter(Boolean);
} catch (e) {
  console.error('读不到 HEAD 文件列表（不是 git 仓库？）：' + e.message);
  process.exit(2);
}
files = files.filter((f) =>
  /\.js$/.test(f) &&
  !f.startsWith('docs/') &&
  !f.startsWith('node_modules/') &&
  !/\.min\.js$/.test(f));

const problems = [];
let checked = 0;
for (const f of files) {
  let src;
  try { src = git('show', `HEAD:${f}`); } catch { continue; }
  if (!src.trim()) { problems.push(`${f}: 空文件（0 内容）`); continue; }
  const marker = src.split('\n').find((l) => /^(<<<<<<<|=======|>>>>>>>)/.test(l));
  if (marker) problems.push(`${f}: Git 冲突标记残留「${marker.slice(0, 12)}」`);
  const tmp = join(tmpdir(), 'preflight-' + f.replace(/\//g, '_'));
  try {
    writeFileSync(tmp, src);
    execFileSync(process.execPath, ['--check', tmp], { stdio: 'pipe' });
  } catch (e) {
    const line = String(e.stderr || '').split('\n').find((l) => /Error|error/.test(l)) || '语法错误';
    problems.push(`${f}: ${line.trim().slice(0, 120)}`);
  } finally {
    try { unlinkSync(tmp); } catch {}
  }
  checked++;
}

if (problems.length) {
  console.error(`❌ 推送前检查不通过（${problems.length} 项 / 共查 ${checked} 个 js）：`);
  for (const p of problems.slice(0, 20)) console.error('   - ' + p);
  if (problems.length > 20) console.error(`   ...还有 ${problems.length - 20} 项`);
  process.exit(1);
}
console.log(`✅ 推送前检查通过：${checked} 个 js 无冲突标记、非空、语法正确`);
