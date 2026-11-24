/* 讲义复习题库（独立于 data/questions.js 的 TD_BANK）。
   当前为占位：题库侧按《讲义对账表》逐节全量录入后覆盖本文件。
   schema 与规则见 jiangyi-core.js 顶部注释；验收见 tools/verify_jiangyi.mjs。
   铁律：
   - id 只用 JY1-001…JY4-046 新前缀，绝不与 U1-01 / TD-xx 混号；
   - section 填真实小节号 1.1–4.5；source 必须三段齐全（讲义 p{页} #{页内题号}）；
   - answer 只抄答案页 p191–196，不许自己算；
   - 图形一律矢量重画，禁止裁扫描页（原书带 TESTDAILY / SAT教研组 水印）；
   - 例题（Example）不录：答案页没有对应答案的一律不录；
   - 对账：各节应有数 expect = 答案页该节最大题号，已录数必须等于它。 */
window.TD_JIANGYI = {
  source: '讲义（TESTDAILY）',
  units: [
    { id: 1, en: 'Algebra', cn: '代数', sections: [] },
    { id: 2, en: 'Problem Solving and Data Analysis', cn: '问题解决与数据分析', sections: [] },
    { id: 3, en: 'Advanced Math', cn: '高等数学', sections: [] },
    { id: 4, en: 'Geometry and Trigonometry', cn: '几何与三角', sections: [] }
  ],
  questions: []
};
