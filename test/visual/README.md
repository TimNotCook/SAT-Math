# 视觉回归测试（样式改动的「尺子」）

这是 AGENTS.md 红线「开工三前提」第一条要求的那把尺子：**明暗双主题 × drill/exam/wrong 三页 × 关键交互态，逐像素截图存档**。任何动 CSS 层叠 / 主题 / 布局的改动，都必须先过这一关。

## 组成

| 文件 | 作用 |
|---|---|
| `capture.mjs` | headless Chrome + CDP 截图（零 npm 依赖，复用系统 Chrome） |
| `compare.py`  | PIL 逐像素比对，输出漂移占比报告 |
| `baseline/`   | 基准快照（`*.png` + `manifest.json`），**提交进 git** |
| `README.md`   | 本文件 |

## 用法

```bash
# 1) 生成/刷新基准（默认起本地服务，输出到 baseline/）
node test/visual/capture.mjs --out test/visual/baseline

# 2) 改动后：截当前快照到 current/，再与基准比对
node test/visual/capture.mjs --out test/visual/current
python3 test/visual/compare.py test/visual/baseline test/visual/current

# 3) 抽查线上域名（不自动起本地服务）
node test/visual/capture.mjs --base https://timnotcook.github.io/SAT-Math --out test/visual/current
```

退出码：`0` 全通过；`1` 有 FAIL。

## 判定口径

- 逐像素算 RGB 通道最大差 `delta`。
- **显著变化像素** = `delta > 16`（滤掉字体抗锯齿 / 亚像素抖动噪声）。
- 单张图显著变化占比 `> 0.1%`（默认，`--threshold` 可调）→ FAIL。
- 截图尺寸不一致 → 直接 FAIL（布局变了）。

## 覆盖矩阵（10 张）

`light/dark × {drill 落地页, drill 做题页, exam 模考 intro, exam 抽查答题页, wrong}`

## 确定性保证

- 固定视口 1280×900、deviceScaleFactor=1。
- 主题在页面脚本执行前写入 `localStorage`（不闪屏、不依赖交互）。
- 导航/点击后等 `document.fonts.ready` + 固定沉降时长。
- 截图前强制停掉 transition/animation，排除中间态抖动。

## 何时重录基准

以下情况必须重录 baseline（`--out test/visual/baseline`）并 commit：

1. 有意的视觉/样式/布局改动（重录前先在说明里讲清改了什么）。
2. 更换字体文件（`fonts/`）、主题变量、官方色板。
3. 截图矩阵本身增删（同步更新 `capture.mjs` 的 `SHOTS`）。

**没改视觉就出现的 FAIL，是回归，不许用重录掩盖。**
