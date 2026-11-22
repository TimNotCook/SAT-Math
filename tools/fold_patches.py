#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""一次性数据手术：把运行时补丁折叠进源数据文件（罪状3/4/6）。
1. questions.js: TD-21-26 答案 3500、SR-215 答案 B、37 条题干订正、image 字段指向真实文件或删除
2. text.js: 同步题干订正 + image 字段修正
3. figure_crops.js: 删除末尾 IIFE 脚本注入（数据层不再携带执行代码）
输出均为可 diff 的多行格式。
"""
import json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)

def load_js_global(path, name):
    """从 window.NAME = <json>; 文件里解析 JSON 对象。"""
    src = open(path, encoding='utf-8').read()
    m = re.search(r'window\.' + name + r'\s*=\s*', src)
    assert m, f'{path}: 未找到 window.{name}'
    # 用 JSON decoder 从等号后逐字符解析（数据里不应有函数）
    dec = json.JSONDecoder()
    obj, _ = dec.raw_decode(src[m.end():])
    return obj

# ---------- 1. 载入三份数据 ----------
BANK = load_js_global('data/questions.js', 'TD_BANK')
TEXT = load_js_global('data/text.js', 'TD_TEXT')
CROPS = load_js_global('data/figure_crops.js', 'TD_FIG_CROPS')

# images/fig 真实存在的文件（image 字段只允许指向真实文件）
fig_files = set(os.listdir('images/fig'))
real_ids = {qid for qid, p in CROPS.items()
            if os.path.basename(p) in fig_files}
print(f'TD_FIG_CROPS 映射 {len(CROPS)} 项，其中 {len(real_ids)} 项对应真实文件')

# ---------- 2. 补丁数据（从 data/grid-fix.js 与 data/stem-patch.js 原文转录） ----------
STEM = {
    'SP1-049': 'The table shows some values of x and their corresponding values f(x) for the linear function f. What is the x-intercept of the graph of y = f(x) in the xy-plane?',
    'SP1-091': 'The table shows the coordinates of three points on a line in the xy-plane, where k and n are constants. If the slope of the line is 2, what is the value of k + n?',
    'SR-156': 'The table shows three values of x and their corresponding values of y, where y = f(x) + 3. The function f can be written in the form f(x) = x^{3} + bx^{2} + cx + d, where b, c, and d are constants. What is the y-intercept of the graph of y = f(x) in the xy-plane?',
    'SP1-048': 'For the linear function f, the table shows three values of x and their corresponding values of f(x). Function f is defined by f(x) = ax + b, where a and b are constants. What is the value of a - b?',
    'SP1-050': 'For the linear function g, the table shows four values of x and their corresponding values of g(x). The function g can be written as g(x) = mx + b, where m and b are constants. What is the value of b?',
    'SP1-053': 'The table shows two values of x and their corresponding values of y. The graph of the linear equation representing this relationship passes through the point (1/4, a). What is the value of a?',
    'SP1-054': 'The table shows two values of x and their corresponding values of y. The graph of the linear equation representing this relationship passes through the point (1/7, a). What is the value of a?',
    'SP1-089': 'The table gives coordinates of two points on a line in the xy-plane. The y-intercept of the line is (k \u2212 5, b), where k and b are constants. What is the value of b?',
    'SP1-090': 'The table shows three values of x and their corresponding values of f(x). For the linear function f, if h(x) = f(x) \u2212 13, which equation defines h?',
    'SP1-092': 'There is a linear relationship between x and y. The table shows three values of x and their corresponding value of y in terms of a constant n. What is the slope of the line that represents this relationship in the xy-plane?',
    'SP1-099': 'The table shows three values of x and their corresponding values of g(x), where g(x) = f(x)/(x + 3) and f is a linear function. What is the y-intercept of the graph of y = f(x) in the xy-plane?',
    'SP1-101': 'The table shows three values of x and their corresponding values of y, where s is a constant. There is a linear relationship between x and y. Which of the following equations represents this relationship?',
    'U2-02': 'The manager of an online news service received the report above on the number of subscriptions sold by the service. The manager estimated that the percent increase from 2012 to 2013 would be double the percent increase from 2013 to 2014. How many subscriptions did the manager expect would be sold in 2014?',
    'U2-03': 'The table summarizes the number of objects in each group. The number of objects in group C is p% of the number of objects in group A. What is the value of p?',
    'TD-21-10': 'The table summarizes the number of objects in each group. The number of objects in group C is p% of the number of objects in group A. What is the value of p?',
    'U2-10': 'The table summarizes members of a local organization by age and whether they live north or south of Center St. If a member of the organization is selected at random, what is the probability that the selected member is at least 45 years old?',
    'TD-24-07': 'The table summarizes members of a local organization by age and whether they live north or south of Center St. If a member of the organization is selected at random, what is the probability that the selected member is at least 45 years old?',
    'U2-15': 'The results of two random samples of votes for a proposition are shown above. The samples were selected from the same population, and the margins of error were calculated using the same method. Which of the following is the most appropriate reason that the margin of error for sample A is greater than the margin of error for sample B?',
    'TD-24-04': 'The table summarizes the distribution of age and assigned group for 120 participants in a study. One of these participants will be selected at random. What is the probability of selecting a participant from group A, given that the participant is at least 10 years of age?',
    'TD-24-08': 'The table gives the distribution of favorite core subject and grade level for 80 students. If a student is selected at random, what is the probability of selecting a student whose favorite core subject is mathematics?',
    'TD-24-15': 'The table gives the distribution of flavor and type of topping for customer orders at an ice cream shop. If a customer order is selected at random, what is the probability of selecting an order with sprinkles, given the flavor of ice cream is vanilla?',
    'U2-11': 'For a certain computer game, individuals receive an integer score that ranges from 2 through 10. The table below shows the frequency distribution of the scores of the 9 players in group A and the 11 players in group B. The median of the scores for group B is how much greater than the median of the scores for group A?',
    'TD-23-12': 'Sam opened a savings account at a bank. The table shows the exponential relationship between the time t, in years, since Sam opened the account and the total amount n, in dollars, in the account. If Sam made no additional deposits or withdrawals, which of the following equations best represents the relationship between t and n?',
    'TD-24-12': 'The table shows the distribution of people in a certain city by age group. If a person in this city is selected at random, which of the following is closest to the probability of selecting a person who is greater than 65 years old, given that the person is at least 18 years old?',
    'TD-24-13': 'The table shows the distribution by species and eye color for the 30 canids living in a nature conservancy. If one canid is selected at random, what is the probability that it will be either a grey wolf with yellow eyes or a coyote with brown eyes?',
    'TD-25-01': 'The table summarizes the UV index value recorded by a research assistant at noon each day for 49 days. According to the table, a UV index value of 1 was recorded on how many days?',
    'U2-12': 'The table summarizes the UV index value recorded by a research assistant at noon each day for 49 days. According to the table, a UV index value of 1 was recorded on how many days?',
    'TD-25-10': 'The table shows the heights, in inches, of 12 infants at a daycare. According to the table, what is the mean height, in inches, of these infants?',
    'TD-25-24': 'Data set A and data set B each consist of 26 values. The table shows the frequencies of the values for each data set. Which of the following statements best compares the means of the two data sets?',
    'TD-25-29': 'The table shows the frequencies of the data values for four data sets. Which data set has the greatest mean?',
    'TD-42-12': 'The table gives the perimeters of similar triangles TUV and XYZ, where TU corresponds to XY. The length of TU is 6. What is the length of XY?',
    'TD-43-20': 'The table gives the areas and perimeters of two similar rectangles, where n is a constant. What is the value of n?',
    'TD-24-05': 'Each rock in a collection of 50 rocks was classified as either igneous, metamorphic, or sedimentary, as shown in the frequency table. If one of these rocks is selected at random, what is the probability of selecting a rock that is igneous?',
    'TD-11-09': 'The table shows three values of x and their corresponding values of y, where n is a constant, for the linear relationship between x and y. What is the slope of the line that represents this relationship in the xy-plane?',
    'TD-22-12': 'In 2000, a census was taken to determine the population of a certain town. The graph gives the estimated population y, in thousands, of this town x years after the 2000 census was taken, where 0 \u2264 x \u2264 5. Based on the graph, which of the following is the closest to the estimated population 2 years after the 2000 census was taken?',
    'TD-22-16': 'The scatterplot shows the population of town T starting in 2000 and projected through 2045. According to the line of best fit, which of the following best approximates the year in which the population of town T is projected to reach 5,000?',
    'TD-25-05': 'A store owner recorded the number of units of a certain product that were sold per day for 28 days. What is the minimum number of units of this product sold per day for these 28 days?',
}
ANSWER_FIX = {'TD-21-26': ('3500', 3500), 'SR-215': ('B', None)}

# ---------- 3. 手术 questions.js ----------
qs = BANK['questions']
stats = {'img_fixed': 0, 'img_removed': 0, 'stem_fixed': 0, 'ans_fixed': 0}
by_id = {q['id']: q for q in qs}
for q in qs:
    qid = q.get('id')
    if qid in STEM:
        q['stem'] = STEM[qid]; stats['stem_fixed'] += 1
    if qid in ANSWER_FIX:
        ans, val = ANSWER_FIX[qid]
        q['answer'] = ans
        if val is not None:
            q['value'] = val
        stats['ans_fixed'] += 1
    if qid in real_ids:
        real = 'images/fig/' + os.path.basename(CROPS[qid])
        if q.get('image') != real:
            q['image'] = real; stats['img_fixed'] += 1
    elif 'image' in q:
        del q['image']; stats['img_removed'] += 1

# 校验补丁全部命中
missing = [k for k in STEM if k not in by_id] + [k for k in ANSWER_FIX if k not in by_id]
assert not missing, f'补丁 id 未在题库命中: {missing}'
print('questions.js:', stats)

# ---------- 4. 手术 text.js ----------
tstats = {'stem_fixed': 0, 'img_fixed': 0, 'img_removed': 0}
for qid, t in TEXT.items():
    if qid in STEM:
        t['stem'] = STEM[qid]; tstats['stem_fixed'] += 1
    if qid in real_ids:
        real = 'images/fig/' + os.path.basename(CROPS[qid])
        if t.get('image') != real:
            t['image'] = real; tstats['img_fixed'] += 1
    elif 'image' in t:
        del t['image']; tstats['img_removed'] += 1
print('text.js:', tstats)

# ---------- 5. 写回 questions.js（一题一行，可 diff） ----------
def write_questions():
    out = ['/* TD SAT Math 题库（唯一答案源）。',
           '   本文件由源数据直接维护：答案/题干订正必须写到这里，禁止运行时补丁。',
           '   格式：一题一行，便于 code review 与 git diff。 */',
           'window.TD_BANK = {']
    out.append('  "units": ' + json.dumps(BANK['units'], ensure_ascii=True, separators=(',', ':')) + ',')
    out.append('  "questions": [')
    for q in qs:
        out.append('    ' + json.dumps(q, ensure_ascii=True, separators=(',', ':')) + ',')
    if out[-1].endswith(','):
        out[-1] = out[-1][:-1]
    out.append('  ]')
    out.append('};')
    open('data/questions.js', 'w', encoding='utf-8').write('\n'.join(out) + '\n')

def write_text():
    out = ['/* TD SAT Math 题干文本库（渲染层读取的题干/选项/图形声明）。',
           '   订正必须写到这里，禁止运行时补丁。一题一行，便于 diff。 */',
           'window.TD_TEXT = {']
    keys = list(TEXT.keys())
    for k in keys:
        out.append('  ' + json.dumps(k, ensure_ascii=True) + ': ' +
                   json.dumps(TEXT[k], ensure_ascii=True, separators=(',', ':')) + ',')
    if out[-1].endswith(','):
        out[-1] = out[-1][:-1]
    out.append('};')
    open('data/text.js', 'w', encoding='utf-8').write('\n'.join(out) + '\n')

write_questions()
write_text()

# ---------- 6. figure_crops.js 去掉 IIFE 注入（罪状六） ----------
src = open('data/figure_crops.js', encoding='utf-8').read()
cut = src.find(';;(function(){var s=document.createElement')
assert cut > 0, '未找到 IIFE 注入段'
open('data/figure_crops.js', 'w', encoding='utf-8').write(src[:cut] + ';\n')
print('figure_crops.js: 已剥离 IIFE 脚本注入', cut, '->', len(src))

# ---------- 7. 校验输出可被 JSON 解析 ----------
B2 = load_js_global('data/questions.js', 'TD_BANK')
T2 = load_js_global('data/text.js', 'TD_TEXT')
assert len(B2['questions']) == len(qs), '题数变化!'
assert B2['questions'] == qs and T2 == TEXT, '往返不一致!'
td = next(q for q in B2['questions'] if q['id'] == 'TD-21-26')
assert td['answer'] == '3500' and td['value'] == 3500, 'TD-21-26 未修复'
sr = next(q for q in B2['questions'] if q['id'] == 'SR-215')
assert sr['answer'] == 'B', 'SR-215 未修复'
print('往返校验通过: 题数', len(B2['questions']), '| TD-21-26 answer=3500 | SR-215 answer=B')
print('questions.js 新大小:', os.path.getsize('data/questions.js'), '行数:', sum(1 for _ in open('data/questions.js')))
