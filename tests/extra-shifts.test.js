const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const html = readFileSync(path.join(root, 'index.html'), 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
const translations = readFileSync(path.join(root, 'i18n.js'), 'utf8');

// Run the actual renderer with an inert DOM and storage, without a database.
function app(state = {}) {
  const elements = new Map();
  const context = vm.createContext({
    document: {
      documentElement: { setAttribute() {}, removeAttribute() {} },
      addEventListener() {},
      getElementById(id) {
        if (!elements.has(id)) elements.set(id, { innerHTML: '', addEventListener() {}, focus() {}, select() {} });
        return elements.get(id);
      },
    },
    navigator: { language: 'en' },
    localStorage: { getItem() { return null; } },
    addEventListener() {},
    setTimeout() {}, clearTimeout() {},
    fetch() { throw new Error('Tests must not access the database'); },
  });
  context.window = context;
  vm.runInContext(translations, context, { filename: 'i18n.js' });
  vm.runInContext(script, context, { filename: 'index.html' });
  const run = code => structuredClone(vm.runInContext(code, context));
  run(`Y = 2026; Mo = 10; LOAD = 'ok'; PAY = defaultPay();
    RATE = 220; TAX = 0.87;
    workSettings = { '2026-11': { shifts: 10, hoursPerShift: 10 } };`);
  for (const [key, value] of Object.entries(state)) run(`${key} = ${JSON.stringify(value)}`);
  return run;
}

const monthStatus = 'computeHoursStatusFor(2026, 10)';
const monthPay = 'calcRange(new Date(2026, 10, 1), new Date(2026, 10, 30))';
const extraShift = {
  workData: { '2026-11-01': '04:00:00' },
  overtimeRate: { '2026-11-01': 440 },
};

test('four extra hours at double rate leave the full 100-hour goal remaining', () => {
  const run = app(extraShift);
  assert.deepEqual(run(monthStatus), { target: 100, actual: 0, remaining: 100 });
  const pay = run(monthPay);
  assert.equal(pay.h, 4);
  assert.equal(pay.extraH, 4);
  assert.equal(pay.gross, 1760);
  assert.equal(pay.net, 1760 * 0.87);
});

test('only regular hours reduce the goal while pay includes both kinds of shift', () => {
  const run = app({ ...extraShift, workData: { ...extraShift.workData, '2026-11-02': '10:00:00' } });
  assert.deepEqual(run(monthStatus), { target: 100, actual: 10, remaining: 90 });
  assert.deepEqual(run(monthPay), { h: 14, extraH: 4, gross: 3960, net: 3960 * 0.87 });
});

test('extra shifts neither reach the goal early nor turn a completed goal into overtime', () => {
  const workData = { ...extraShift.workData };
  for (let day = 2; day <= 11; day++) workData[`2026-11-${String(day).padStart(2, '0')}`] = '10:00:00';
  const run = app({ ...extraShift, workData });
  assert.deepEqual(run(monthStatus), { target: 100, actual: 100, remaining: 0 });
  assert.equal(run(`${monthPay}.h`), 104);
  run("workData['2026-11-02'] = '11:00:00'");
  assert.deepEqual(run(monthStatus), { target: 100, actual: 101, remaining: -1 });
});

test('short regular days adjust the goal, but shortened extra shifts do not', () => {
  const run = app({
    ...extraShift,
    holidayAdj: {
      '2026-11-01': { type: 'shortened', hours: 6 },
      '2026-11-02': { type: 'shortened', hours: 1 },
      '2026-11-03': { type: 'holiday' },
    },
  });
  assert.deepEqual(run(monthStatus), { target: 99, actual: 0, remaining: 99 });
});

test('extra hours are counted with minute/second precision across month boundaries', () => {
  const run = app({
    workData: { '2026-10-31': '02:30:00', '2026-11-01': '04:15:30', '2026-11-02': '08:00:00' },
    overtimeRate: { '2026-10-31': 330, '2026-11-01': '440' },
  });
  assert.deepEqual(run(monthStatus), { target: 100, actual: 8, remaining: 92 });
  const pay = run('calcRange(new Date(2026, 9, 31), new Date(2026, 10, 2))');
  assert.ok(Math.abs(pay.extraH - (6.75 + 30 / 3600)) < 1e-10);
  assert.ok(Math.abs(pay.h - (14.75 + 30 / 3600)) < 1e-10);
  assert.ok(Math.abs(pay.gross - (2.5 * 330 + (4.25 + 30 / 3600) * 440 + 8 * 220)) < 1e-8);
});

test('an extra shift without logged hours changes neither the goal nor pay', () => {
  const run = app({ overtimeRate: extraShift.overtimeRate });
  assert.deepEqual(run(monthStatus), { target: 100, actual: 0, remaining: 100 });
  assert.deepEqual(run(monthPay), { h: 0, extraH: 0, gross: 0, net: 0 });
});

test('toggling an existing shift reclassifies its hours without changing the goal', () => {
  const run = app(extraShift);
  // Persistence is stubbed so the day editor can be exercised without writes.
  run('save = () => {}; workEditUnlocked[mKey(Y, Mo)] = true; openDay(1); dayDraft.extra = false; saveDay();');
  assert.deepEqual(run(monthStatus), { target: 100, actual: 4, remaining: 96 });
  assert.equal(run(`${monthPay}.gross`), 880);
  run('openDay(1); dayDraft.extra = true; dayDraft.rate = "440"; saveDay();');
  assert.deepEqual(run(monthStatus), { target: 100, actual: 0, remaining: 100 });
  assert.equal(run(`${monthPay}.gross`), 1760);
});

test('monthly and payout summaries show the extra hours separately in every language', () => {
  const run = app(extraShift);
  for (const lang of run('LANGS.map(l => l.code)')) {
    run(`LANG = ${JSON.stringify(lang)}`);
    const label = run("t('extra_hours', hrsFmt(4))");
    assert.notEqual(label, 'extra_hours');
    assert.equal(run('renderWork()').split(label).length - 1, 2, lang);
    assert.ok(run('renderWork()').includes(run("t('goal_of', hrsFmt(0), hrsFmt(100))")), lang);
    assert.ok(run('renderWork()').includes(run("t('worked', hrsFmt(4))")), lang);
  }
});

test('extra hours also appear in the payout list for cycle schedules', () => {
  const run = app(extraShift);
  run('PAY.mode = "cycle"; PAY.cycle = { len: 7, start: "2026-11-01", delay: 0 };');
  const list = run('renderWork()').split('<div class="po-list">')[1];
  assert.ok(list.includes(run("t('extra_hours', hrsFmt(4))")));
});

test('regular-only months keep their existing progress and do not show extra hours', () => {
  const run = app({ workData: extraShift.workData });
  assert.deepEqual(run(monthStatus), { target: 100, actual: 4, remaining: 96 });
  assert.equal(run(`${monthPay}.extraH`), 0);
  assert.ok(!run('renderWork()').includes('Including extra shifts:'));
});

test('the planner reserves all regular shifts in addition to extra days for every pattern', () => {
  const run = app({ ...extraShift, holidayAdj: { '2026-11-01': { type: 'shortened', hours: 6 } } });
  for (const pattern of ['5/2', '2/2', '7/0', 'flex']) {
    run(`workSettings['2026-11'].scheduleType = ${JSON.stringify(pattern)}`);
    const planner = run('renderPlanner()');
    assert.match(planner, /<b class="num">100 h<\/b>/, pattern);
    assert.equal((planner.match(/class="day[^"]*\bsug\b/g) || []).length, 10, pattern);
    assert.match(planner, /<div class="day[^"<>]*" title="[^"]*Extra shift[^\n]+?<span class="n">1<\/span><span class="ed">/, pattern);
    assert.doesNotMatch(planner, /class="day[^"<>]*\bsug\b[^"<>]*" title="[^"]*Extra shift/, pattern);
  }
});
