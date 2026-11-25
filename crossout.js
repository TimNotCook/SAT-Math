/* Digital SAT cross-out state — shared by drill.html and exam.html.
 *
 * Official Bluebook lets a student cross out choices as scratch work. Crossing
 * out is deliberately independent from the answer: it never changes the
 * selected letter, the score, or Mark for Review. State is stored by question
 * id so it survives reloads, question changes and Back navigation.
 *
 * Storage shape: { "<qid>": ["A", "C"] }
 */
(function (root) {
  'use strict';
  var KEY = 'tdsat_crossout_v1';
  var LETTERS = ['A', 'B', 'C', 'D'];
  var X_ICON = '<svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true" focusable="false">' +
    '<path d="M2 2 10 10M10 2 2 10" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';
  var memory = {};

  function read() {
    var raw;
    try { raw = root.localStorage && root.localStorage.getItem(KEY); }
    catch (e) { return memory; }
    if (!raw) return memory;
    try {
      var parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        memory = parsed;
        return parsed;
      }
      return {};
    } catch (e) { return {}; }
  }
  function write(data) {
    memory = data;
    try { if (root.localStorage) root.localStorage.setItem(KEY, JSON.stringify(data)); }
    catch (e) { /* private mode / quota: the in-memory copy still works this session */ }
  }
  function clean(value) {
    if (!Array.isArray(value)) return [];
    var out = [];
    LETTERS.forEach(function (letter) {
      if (value.indexOf(letter) >= 0 && out.indexOf(letter) < 0) out.push(letter);
    });
    return out;
  }
  function list(qid) {
    if (!qid) return [];
    var data = read();
    return clean(data[qid]);
  }
  function has(qid, letter) {
    return list(qid).indexOf(letter) >= 0;
  }
  function set(qid, letter, on) {
    if (!qid || LETTERS.indexOf(letter) < 0) return false;
    var data = read();
    var current = clean(data[qid]);
    var next = current.filter(function (x) { return x !== letter; });
    if (on) next.push(letter);
    next.sort(function (a, b) { return LETTERS.indexOf(a) - LETTERS.indexOf(b); });
    if (next.length) data[qid] = next;
    else delete data[qid];
    write(data);
    return next.indexOf(letter) >= 0;
  }
  function toggle(qid, letter) {
    return set(qid, letter, !has(qid, letter));
  }
  function clear(qid) {
    var data = read();
    if (Object.prototype.hasOwnProperty.call(data, qid)) {
      delete data[qid];
      write(data);
    }
  }
  function label(letter, on, locked) {
    if (locked) return '选项 ' + letter + (on ? ' 已划掉（只读）' : '（只读）');
    return (on ? '取消划掉选项 ' : '划掉选项 ') + letter;
  }
  function buttonHtml(letter, on, locked) {
    return '<button type="button" class="crossout-toggle' + (on ? ' is-on' : '') + '"' +
      ' data-crossout="' + letter + '" aria-pressed="' + (on ? 'true' : 'false') + '"' +
      ' aria-label="' + label(letter, on, locked) + '" title="' + label(letter, on, locked) + '"' +
      (locked ? ' disabled aria-disabled="true" tabindex="-1"' : '') + '>' + X_ICON + '</button>';
  }
  function syncRow(row, qid) {
    if (!row) return;
    var choice = row.querySelector('.drill-choice');
    var button = row.querySelector('.crossout-toggle');
    var letter = (choice && choice.dataset.choice) || row.dataset.choice;
    if (!choice || !letter) return;
    var on = has(qid, letter);
    choice.classList.toggle('is-crossed', on);
    if (button) {
      var locked = button.disabled;
      button.classList.toggle('is-on', on);
      button.setAttribute('aria-pressed', on ? 'true' : 'false');
      button.setAttribute('aria-label', label(letter, on, locked));
      button.title = label(letter, on, locked);
    }
  }
  function toggleRow(row, qid, letter) {
    if (!row || !qid) return false;
    var choice = row.querySelector('.drill-choice');
    letter = letter || (choice && choice.dataset.choice);
    if (!letter) return false;
    var on = toggle(qid, letter);
    syncRow(row, qid);
    try {
      row.dispatchEvent(new CustomEvent('td:crossout', {
        bubbles: true, detail: { qid: qid, letter: letter, crossed: on }
      }));
    } catch (e) { /* CustomEvent unsupported: state is already saved */ }
    return on;
  }
  function bind(container, qid, locked) {
    if (!container || !qid) return;
    Array.prototype.forEach.call(container.querySelectorAll('.drill-choice-row'), function (row) {
      syncRow(row, qid);
      var button = row.querySelector('.crossout-toggle');
      if (!button || locked || button.disabled) return;
      button.addEventListener('click', function (event) {
        event.preventDefault();
        event.stopPropagation();
        var letter = button.dataset.crossout;
        toggleRow(row, qid, letter);
      });
    });
  }
  function isEditableTarget(target) {
    if (!target || !target.tagName) return false;
    if (target.isContentEditable) return true;
    return /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName);
  }
  /* Shift + 1..4 maps to choices A..D. event.code keeps this working while
     Shift turns the printed key into ! @ # $ on US layouts. */
  function keyLetter(event) {
    if (!event || !event.shiftKey || event.altKey || event.ctrlKey || event.metaKey) return '';
    var code = event.code || '';
    var match = /^Digit([1-4])$/.exec(code);
    if (!match && /^[1-4]$/.test(event.key || '')) match = [null, event.key];
    if (!match) return '';
    return LETTERS[parseInt(match[1], 10) - 1];
  }

  root.TD_CROSSOUT = {
    KEY: KEY,
    list: list,
    has: has,
    set: set,
    toggle: toggle,
    clear: clear,
    buttonHtml: buttonHtml,
    bind: bind,
    syncRow: syncRow,
    toggleRow: toggleRow,
    isEditableTarget: isEditableTarget,
    keyLetter: keyLetter
  };
})(window);
