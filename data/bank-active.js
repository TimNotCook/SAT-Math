/* 生效题库视图：把被裁定去重的题（retired / mergedInto）从抽题池里摘掉，全量仍留在 TD_BANK.all。
   retired/mergedInto 的来源 = docs/transcribe/bank-rulings.json（CI 由 tools/apply_bank_rulings.py 落字段）。
   这样 exam / drill / wrong / analysis 拿到的都是"能练的题"，且不需要每个页面各自写过滤。 */
(function () {
  'use strict';
  var B = window.TD_BANK;
  if (!B || !B.questions || B.all) return;
  B.all = B.questions;
  B.questions = B.questions.filter(function (q) { return !q.retired && !q.mergedInto; });
})();
