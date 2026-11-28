#!/usr/bin/env node
/* 生成线上发布清单 release.json。
 *
 * 只写构建产物，不入库：pages-deploy 在 upload-pages-artifact 之前跑一次，
 * canary 用 commit 对比“线上到底是哪一版”，不再靠人眼 curl 猜缓存。
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const sha = String(process.env.GITHUB_SHA || '').trim()
  || execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
const version = JSON.parse(readFileSync(resolve(root, 'version.json'), 'utf8'));
const out = {
  commit: sha,
  short: sha.slice(0, 7),
  version: String(version.v || ''),
  builtAt: new Date().toISOString(),
  runId: String(process.env.GITHUB_RUN_ID || ''),
  runAttempt: String(process.env.GITHUB_RUN_ATTEMPT || ''),
};
writeFileSync(resolve(root, 'release.json'), JSON.stringify(out, null, 2) + '\n');
console.log('release.json:', JSON.stringify(out));
