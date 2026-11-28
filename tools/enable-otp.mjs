/**
 * 一条命令把 Supabase 的「邮箱验证码」通道打开。
 *
 * 背景：Supabase 免费版 + 自带邮件服务时禁止改邮件模板（PATCH 会返回
 * entitlement_required）。只有配上一套自定义 SMTP 之后，模板才能写进
 * {{ .Token }}，邮件正文里才会出现 6 位数字。
 *
 * 用法（不要把密码写进仓库）：
 *   SUPABASE_PAT=sbp_xxx node tools/enable-otp.mjs \
 *     --host smtp.example.com --port 587 --user apikey-xxx --pass 'xxxx' \
 *     --from 'SAT Math <no-reply@example.com>' --test-email you@example.com --flip
 *
 * 参数：
 *   --host/--port/--user/--pass   SMTP 凭证（--port 465 表示 SSL，587 表示 STARTTLS）
 *   --from   发件人，可写 "名字 <地址>"，也可只写地址
 *   --name   发件人显示名（--from 已带名字时可省）
 *   --admin  管理员邮箱（可选，Supabase 发信用）
 *   --test-email  配好后立刻往这个邮箱真发一封验证码，验证链路
 *   --flip   成功后把 cloud-config.js 里的 otpCode 改成 true
 *   --ref    项目 ref，默认读 cloud-config.js 里的 URL
 * 环境变量：SUPABASE_PAT
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const args = {};
for (let i = 2; i < process.argv.length; i++) {
  const a = process.argv[i];
  if (!a.startsWith('--')) continue;
  const k = a.slice(2);
  const v = process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[++i] : true;
  args[k] = v;
}

const configSrc = fs.readFileSync(path.join(ROOT, 'cloud-config.js'), 'utf8');
const urlMatch = configSrc.match(/url:\s*'https:\/\/([a-z0-9]+)\.supabase\.co'/i);
const anonMatch = configSrc.match(/anonKey:\s*'([^']+)'/);
const siteMatch = configSrc.match(/siteUrl:\s*'([^']+)'/);
const REF = args.ref || (urlMatch && urlMatch[1]) || '';
const ANON = anonMatch ? anonMatch[1] : '';
const SITE = siteMatch ? siteMatch[1] : '';
const PAT = process.env.SUPABASE_PAT || '';

if (!PAT) {
  console.error('缺少 SUPABASE_PAT（Supabase → Account → Access Tokens 生成的 sbp_ token）');
  process.exit(1);
}
if (!REF) {
  console.error('读不到项目 ref，用 --ref 指定');
  process.exit(1);
}
const need = ['host', 'port', 'user', 'pass'];
const missing = need.filter((k) => !args[k]);
if (missing.length) {
  console.error('缺少 SMTP 参数：' + missing.map((k) => '--' + k).join(' '));
  process.exit(1);
}

/* 换掉模板里默认的「点链接」形态：正文先给 6 位码，链接退到第二行做兜底。
   两段都保留，是因为有些邮箱会把纯数字段落折叠进引用。 */
const TEMPLATE = [
  '<h2>你的 SAT Math 登录码</h2>',
  '<p>把这 6 位数字填回网站即可登录：</p>',
  '<p style="font-size:26px;letter-spacing:6px;font-weight:700">{{ .Token }}</p>',
  '<p>1 小时内有效。不是本人操作可以忽略这封邮件。</p>',
  '<p style="color:#888;font-size:12px">也可以直接点这个链接登录：<a href="{{ .ConfirmationURL }}">一键登录</a></p>'
].join('\n');

const fromRaw = String(args.from || '').trim();
const fromName = args.name || (fromRaw.match(/^(.+?)\s*<[^>]+>$/) || [])[1] || 'SAT Math';
const fromEmail = (fromRaw.match(/<([^>]+)>/) || [])[1] || fromRaw;

const payload = {
  smtp_host: args.host,
  smtp_port: String(args.port),
  smtp_user: args.user,
  smtp_pass: args.pass,
  smtp_sender_name: fromName.trim(),
  smtp_sender_email: fromEmail,
  mailer_otp_length: 6,
  mailer_subjects_magic_link: '{{ .Token }} 是你的 SAT Math 登录码',
  mailer_templates_magic_link_content: TEMPLATE
};
if (args.admin) payload.smtp_admin_email = args.admin;

const base = `https://api.supabase.com/v1/projects/${REF}/config/auth`;
const headers = { Authorization: `Bearer ${PAT}`, 'Content-Type': 'application/json' };

async function main() {
  console.log(`PATCH ${base}`);
  const r = await fetch(base, { method: 'PATCH', headers, body: JSON.stringify(payload) });
  const text = await r.text();
  if (!r.ok) {
    console.error('配置失败 ' + r.status + '：' + text.slice(0, 400));
    process.exit(2);
  }
  let out = {};
  try { out = JSON.parse(text); } catch (e) { /* ignore */ }
  console.log('SMTP: ' + (out.smtp_host || args.host) + ':' + (out.smtp_port || args.port));
  console.log('发件人: ' + (out.smtp_sender_name || fromName) + ' <' + (out.smtp_sender_email || fromEmail) + '>');
  console.log('码长: ' + (out.mailer_otp_length || 6) + '，模板: ' + (out.mailer_templates_magic_link_content ? '已写入 {{ .Token }}' : '未确认'));

  if (args.flip) {
    const next = configSrc.replace(/otpCode\s*:\s*false/, 'otpCode: true');
    if (next !== configSrc) {
      fs.writeFileSync(path.join(ROOT, 'cloud-config.js'), next);
      console.log('已把 cloud-config.js 的 otpCode 改成 true（记得 python3 bump_assets.py）');
    } else {
      console.log('cloud-config.js 里 otpCode 已经是 true');
    }
  }

  if (args['test-email'] && ANON) {
    const otp = await fetch(`https://${REF}.supabase.co/auth/v1/otp?redirect_to=${encodeURIComponent(SITE + '/')}`, {
      method: 'POST',
      headers: { apikey: ANON, Authorization: `Bearer ${ANON}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: String(args['test-email']), create_user: true, redirect_to: SITE + '/' })
    });
    const body = await otp.text();
    console.log('真发一封：' + otp.status + ' ' + body.slice(0, 160));
    console.log('去收件箱看正文里有没有 6 位数字；有就说明整条链路通了。');
  }
}

main().catch((e) => { console.error(e); process.exit(3); });
