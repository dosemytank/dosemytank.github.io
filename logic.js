if (typeof tl === 'undefined' && typeof require === 'function') require('./i18n.js'); // tłumaczenia w testach Node
/* ===== Logika bez interfejsu: profile zbiorników, analiza parametrów, trendy, szacowanie stężeń, terminy zadań.
   Działa w przeglądarce i w Node (testy). ===== */
const _C = typeof C !== 'undefined' ? C : require('./calc.js');
const DAY = 86400000;

/* ---------- daty (lokalne dni, bez stref czasowych) ---------- */
const dkey = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const dnum = s => { const [y, m, d] = s.split('-').map(Number); return Date.UTC(y, m - 1, d) / DAY; }; // numer dnia
const dfrom = n => { const d = new Date(n * DAY); return d.getUTCFullYear() + '-' + String(d.getUTCMonth() + 1).padStart(2, '0') + '-' + String(d.getUTCDate()).padStart(2, '0'); };
const dow = s => new Date(dnum(s) * DAY).getUTCDay();

/* ---------- parametry ---------- */
const PARAM = {
  pH: { l: 'pH', u: '', d: 1 }, KH: { l: 'KH', u: '°dH', d: 1 }, GH: { l: 'GH', u: '°dH', d: 1 },
  NO3: { l: 'NO₃', u: tl('mg/l'), d: 1, long: tl('Azotany NO₃') }, PO4: { l: 'PO₄', u: tl('mg/l'), d: 2, long: tl('Fosforany PO₄') },
  K: { l: 'K', u: tl('mg/l'), d: 1, long: tl('Potas K') }, Fe: { l: 'Fe', u: tl('mg/l'), d: 2, long: tl('Żelazo Fe') },
  NH4: { l: 'NH₄', u: tl('mg/l'), d: 2, long: tl('Amon/amoniak (test)') }, NO2: { l: 'NO₂', u: tl('mg/l'), d: 2, long: tl('Azotyny NO₂') },
  Mg: { l: 'Mg', u: tl('mg/l'), d: 1, long: tl('Magnez Mg') }, Ca: { l: 'Ca', u: tl('mg/l'), d: 1, long: tl('Wapń Ca') },
  temp: { l: tl('Temp.'), u: '°C', d: 1, long: tl('Temperatura') }, CO2: { l: 'CO₂', u: tl('mg/l'), d: 0, long: tl('CO₂ (wyliczone z pH i KH)') },
};
const MEASURED = ['pH', 'KH', 'GH', 'NO3', 'PO4', 'K', 'Fe', 'Mg', 'Ca', 'NH4', 'NO2', 'temp'];

/* Profile: ORIENTACYJNE cele startowe, każdy można zmienić w profilu zbiornika.
   Źródło: typowe zakresy z literatury hobbystycznej; konkretne gatunki mogą wymagać innych wartości. */
const PROFILES = {
  plant_lo: { name: tl('Roślinne bez CO₂ (low-tech)'), short: tl('Low-tech'), co2: false, plants: true, bufferNeeded: true,
    t: { pH: [6.5, 7.8], KH: [3, 10], GH: [4, 14], NO3: [5, 20], PO4: [0.2, 1.5], K: [5, 20], Fe: [0.02, 0.3], CO2: [2, 15], temp: [22, 26] } },
  plant_mid: { name: tl('Roślinne medium-tech'), short: tl('Medium-tech'), co2: false, plants: true, bufferNeeded: true,
    t: { pH: [6.2, 7.5], KH: [2, 8], GH: [4, 12], NO3: [5, 25], PO4: [0.3, 1.8], K: [5, 25], Fe: [0.03, 0.4], CO2: [5, 25], temp: [22, 26] } },
  plant_hi: { name: tl('Roślinne z CO₂ (high-tech)'), short: tl('High-tech z CO₂'), co2: true, plants: true, bufferNeeded: true,
    t: { pH: [6.0, 7.2], KH: [2, 8], GH: [4, 12], NO3: [10, 30], PO4: [0.5, 2], K: [10, 30], Fe: [0.05, 0.5], CO2: [20, 35], temp: [22, 26] } },
  shrimp_neo: { name: tl('Krewetkarium – Neocaridina'), short: tl('Krewetki Neocaridina'), co2: false, plants: true, bufferNeeded: true, shrimp: true,
    t: { pH: [6.8, 7.8], KH: [2, 8], GH: [6, 12], NO3: [0, 20], PO4: [0, 1.5], temp: [20, 25], CO2: [2, 20] } },
  shrimp_cari: { name: tl('Krewetkarium – Caridina (miękka woda)'), short: tl('Krewetki Caridina'), co2: false, plants: true, bufferNeeded: false, shrimp: true,
    t: { pH: [5.8, 6.8], KH: [0, 1], GH: [4, 6], NO3: [0, 15], PO4: [0, 1], temp: [20, 24] } },
  fish: { name: tl('Rybne / mało roślin'), short: tl('Rybne'), co2: false, plants: false, bufferNeeded: true,
    t: { pH: [6.5, 7.8], KH: [3, 12], GH: [5, 15], NO3: [0, 40], PO4: [0, 2], temp: [23, 27] } },
};
const targetsOf = tank => ({ ...(PROFILES[tank.type] || PROFILES.plant_lo).t, ...(tank.targets || {}) });

/* ---------- wolny amoniak (NH3) ---------- */
// Emerson i in. 1975: pKa = 0,09018 + 2729,92 / T[K]. Test akwarystyczny podaje zwykle sumę NH4⁺+NH3 jako NH4.
function freeNH3(totalAsNH4, pH, temp = 25) {
  const pKa = 0.09018 + 2729.92 / (temp + 273.15), frac = 1 / (Math.pow(10, pKa - pH) + 1);
  return { nh3: totalAsNH4 * (17.031 / 18.039) * frac, frac };
}

/* ---------- ocena pojedynczego pomiaru ---------- */
const has = v => typeof v === 'number' && isFinite(v);
function evaluate(tank, m) {
  const prof = PROFILES[tank.type] || PROFILES.plant_lo, T = targetsOf(tank), out = [];
  const push = (k, v, sev, msg, extra = {}) => out.push({ k, v, sev, msg, ...extra });
  const range = k => T[k] ? `${tl('cel {0}', fmtR(T[k]))}` : '';
  // toksyczne – zawsze pierwsze
  if (has(m.NH4)) {
    if (has(m.pH)) {
      const { nh3 } = freeNH3(m.NH4, m.pH, has(m.temp) ? m.temp : 25);
      const sev = nh3 > 0.05 ? 'bad' : nh3 > 0.02 ? 'warn' : m.NH4 > 0.25 ? 'info' : 'ok';
      push('NH4', m.NH4, sev, sev === 'bad' ? `${tl('Wolny NH₃ {0} mg/l. Podmień 30–50%, nie karm 24 h, nie czyść filtra.', nh3.toFixed(3))}`
        : sev === 'warn' ? `${tl('Wolny NH₃ {0} mg/l. Ogranicz karmienie, podmień część wody, test jutro.', nh3.toFixed(3))}`
        : sev === 'info' ? `${tl('Przy pH {0} wolny NH₃ {1} mg/l. Źródło: karmienie, martwe zwierzę, młody filtr.', m.pH, nh3.toFixed(3))}`
        : 'OK.', { nh3 });
    } else push('NH4', m.NH4, m.NH4 > 0.5 ? 'warn' : 'ok', m.NH4 > 0.5 ? tl('Zmierz pH – od niego zależy toksyczność.') : tl('Niski poziom.'));
  }
  if (has(m.NO2)) push('NO2', m.NO2, m.NO2 > 0.5 ? 'bad' : m.NO2 > 0.1 ? 'warn' : 'ok',
    m.NO2 > 0.5 ? tl('Podmień 30–50%, ogranicz karmienie, nie czyść filtra, test codziennie.')
      : m.NO2 > 0.1 ? tl('Ogranicz karmienie, podmień część wody.') : tl('W porządku.'));
  if (has(m.temp) && T.temp) { const [lo, hi] = T.temp, v = m.temp;
    push('temp', v, v < lo - 3 || v > hi + 3 ? 'bad' : v < lo || v > hi ? 'warn' : 'ok', v < lo ? `${tl('Chłodniej niż {0}. Sprawdź grzałkę.', range('temp'))}` : v > hi ? `${tl('Cieplej niż {0}. Napowietrzaj, sprawdź grzałkę.', range('temp'))}` : tl('W celu.')); }
  if (has(m.pH) && T.pH) { const [lo, hi] = T.pH, v = m.pH;
    push('pH', v, v < lo - 0.7 || v > hi + 0.7 ? 'bad' : v < lo || v > hi ? 'warn' : 'ok',
      v < lo ? `${tl('Niżej niż {0}. Sprawdź KH i CO₂. Zmiana maks. 0,3/dobę.', range('pH'))}` :
      v > hi ? `${tl('Wyżej niż {0}. Sprawdź KH i wapienne dekoracje.', range('pH'))}` : tl('W celu.')); }
  if (has(m.KH) && T.KH) { const [lo, hi] = T.KH, v = m.KH;
    const sev = v < lo ? (prof.bufferNeeded && v < 1 ? 'bad' : 'warn') : v > hi ? 'warn' : 'ok';
    push('KH', v, sev, v < lo ? (prof.bufferNeeded ? tl('Ryzyko nagłego spadku pH. Podmieniaj wodą o wyższym KH.') : `${tl('Niżej niż {0}.', range('KH'))}`) :
      v > hi ? `${tl('Wyżej niż {0}. Rozcieńczaj RO.', range('KH'))}` : tl('W celu.')); }
  if (has(m.GH) && T.GH) { const [lo, hi] = T.GH, v = m.GH;
    push('GH', v, v < lo || v > hi ? 'warn' : 'ok', v < lo ? `${tl('Miękka woda ({0}). {1}', range('GH'), prof.shrimp ? tl('Dodaj mineralizator (Ca, Mg).') : '')}` : v > hi ? `${tl('Twardsza niż {0}. Rozcieńczaj RO.', range('GH'))}` : tl('W celu.')); }
  if (has(m.NO3) && T.NO3) { const [lo, hi] = T.NO3, v = m.NO3;
    push('NO3', v, v > Math.max(2 * hi, 50) ? 'bad' : v > hi || v < lo ? 'warn' : 'ok',
      v > hi ? `${tl('Więcej niż {0}. Zwiększ podmiany{1}, ogranicz karmienie.', range('NO3'), prof.plants ? tl(' i zmniejsz nawóz z azotem') : '')}` :
      v < lo ? `${tl('Mniej niż {0}. {1}', range('NO3'), prof.plants ? tl('Zwiększ nawożenie azotem.') : '')}` : tl('W celu.')); }
  if (has(m.PO4) && T.PO4) { const [lo, hi] = T.PO4, v = m.PO4;
    push('PO4', v, v > hi || v < lo ? 'warn' : 'ok', v > hi ? `${tl('Więcej niż {0}. {1}', range('PO4'), prof.plants ? tl('Zmniejsz nawóz z P.') : tl('Ogranicz karmienie, zwiększ podmiany.'))}` :
      v < lo ? `${tl('Mniej niż {0}.', range('PO4'))}` : tl('W celu.')); }
  for (const k of ['K', 'Fe', 'Mg', 'Ca']) if (has(m[k]) && T[k]) { const [lo, hi] = T[k];
    push(k, m[k], m[k] < lo || m[k] > hi ? 'warn' : 'ok', m[k] < lo ? `${tl('Mniej niż {0}.', range(k))}` : m[k] > hi ? `${tl('Więcej niż {0}.', range(k))}` : tl('W celu.')); }
  // CO2 wyliczone z pH i KH – tylko orientacyjnie
  if (!m._noCO2 && has(m.pH) && has(m.KH) && m.KH > 0) {
    const c = _C.co2(m.pH, m.KH), [rl, rh] = _C.co2Range(m.pH, m.KH), band = { lo: rl, hi: rh };
    const push = (k, v, sev, msg) => out.push({ k, v, sev, msg: `${tl('Ok. {0}–{1} mg/l (wyliczone).', fmtV('CO2', rl), fmtV('CO2', rh))} ` + msg, ...band });
    if (m.KH < 1) push('CO2', c, 'info', tl('KH < 1 – wynik niewiarygodny.'));
    else if (!prof.co2 && c > 30) push('CO2', c, 'info', tl('Bez butli – wynik zawyżony przez inne kwasy (torf, liście, aktywne podłoże).'));
    else if (c > 45) push('CO2', c, 'bad', tl('Zmniejsz dawkę CO₂, napowietrzaj w nocy.'));
    else if (T.CO2) { const [lo, hi] = T.CO2; push('CO2', c, c > hi ? 'warn' : c < lo ? 'info' : 'ok', c > hi ? `${tl('Więcej niż {0} – obserwuj ryby.', range('CO2'))}` : c < lo ? `${tl('Mniej niż {0}.{1}', range('CO2'), prof.co2 ? tl(' Rośliny mogą rosnąć wolniej.') : '')}` : tl('W celu (wynik orientacyjny).')); }
  }
  return out;
}
const fmtR = r => `${String(r[0]).replace('.', DEC)}–${String(r[1]).replace('.', DEC)}`;
const SEV_W = { bad: 3, warn: 2, info: 1, ok: 0 };

/* ---------- serie pomiarów ---------- */
const series = (events, k) => events.filter(e => e.type === 'measure' && has(e[k])).sort((a, b) => a.ts - b.ts).map(e => ({ ts: e.ts, date: e.date, v: e[k] }));
function latestValues(events) { // ostatnia wartość każdego parametru + poprzednia
  const out = {};
  for (const k of MEASURED) { const s = series(events, k); if (s.length) out[k] = { ...s[s.length - 1], prev: s.length > 1 ? s[s.length - 2] : null }; }
  return out;
}

/* ---------- trendy i nagłe zmiany ---------- */
const JUMP = { pH: [0.5], KH: [2], GH: [3], temp: [2], NO3: [15, 2], PO4: [1.5, 2], NH4: [0.25], NO2: [0.1] };
function trends(tank, events, nowTs) {
  const T = targetsOf(tank), out = [];
  for (const k of Object.keys(JUMP)) {
    const s = series(events, k); if (s.length < 2) continue;
    const a = s[s.length - 2], b = s[s.length - 1], days = (b.ts - a.ts) / DAY, d = b.v - a.v, [abs, mult] = JUMP[k];
    if (days <= 10 && Math.abs(d) >= abs && (!mult || (a.v > 0 && (b.v / a.v >= mult || a.v / Math.max(b.v, 1e-9) >= mult)))) {
      out.push({ k, sev: 'warn', kind: 'jump', msg: `${tl('{0}: {1} → {2} w {3} dni. Powtórz test.', PARAM[k].l, fmtV(k, a.v), fmtV(k, b.v), Math.max(1, Math.round(days)))}` });
    }
  }
  for (const k of ['pH', 'KH', 'GH', 'NO3', 'PO4', 'K', 'Mg', 'Ca', 'temp']) {
    const s = series(events, k).filter(p => p.ts >= nowTs - 60 * DAY); if (s.length < 3 || !T[k]) continue;
    const n = s.length, xs = s.map(p => p.ts / DAY), ys = s.map(p => p.v), mx = xs.reduce((a, b) => a + b) / n, my = ys.reduce((a, b) => a + b) / n;
    const sxx = xs.reduce((a, x) => a + (x - mx) ** 2, 0); if (sxx === 0) continue;
    const slope = xs.reduce((a, x, i) => a + (x - mx) * (ys[i] - my), 0) / sxx, last = ys[n - 1], [lo, hi] = T[k], width = Math.max(hi - lo, 0.1);
    if (Math.abs(slope * 7) < 0.1 * width) continue;
    const in14 = last + slope * 14, inRange = last >= lo && last <= hi;
    const mono = ys.slice(-3).every((v, i, a) => i === 0 || (slope > 0 ? v >= a[i - 1] : v <= a[i - 1]));
    // prognoza liczbowa dopiero od 4 testów; przy 3 tylko kierunek (testy kropelkowe mają rozrzut ±1 stopnia skali)
    if (inRange && (in14 > hi || in14 < lo)) {
      const daysOut = Math.max(1, Math.round(((slope > 0 ? hi : lo) - last) / slope)), dir = slope > 0 ? tl('rośnie') : tl('spada');
      out.push({ k, sev: 'info', kind: 'trend', slopeWeek: slope * 7, msg: n >= 4 && mono
        ? `${tl('{0} {1} (ok. {2}{3} {4}/tydz.) – przy tym tempie wyjdzie poza cel w ciągu ~{5}. Sprawdź kolejnym testem.', PARAM[k].l, dir, slope > 0 ? '+' : '−', fmtV(k, Math.abs(slope * 7)), PARAM[k].u, daysOut < 7 ? 'tygodnia' : tl('{0} tyg.', Math.round(daysOut / 7)))}`
        : `${tl('{0} {1} w ostatnich testach – zbliża się do granicy celu. Sprawdź kolejnym testem.', PARAM[k].l, dir)}` });
    } else if (mono && !inRange) out.push({ k, sev: 'info', kind: 'trend', slopeWeek: slope * 7, msg: `${PARAM[k].l} ${slope > 0 ? tl('rośnie') : tl('spada')}${n >= 4 ? tl(' (ok. {0}{1} {2}/tydz.)', slope > 0 ? '+' : '−', fmtV(k, Math.abs(slope * 7)), PARAM[k].u) : ''} – ${(slope > 0) === (last > hi) ? tl('oddala się od celu') : tl('wraca do celu')}.` });
  }
  return out;
}
const fmtV = (k, v) => (Math.round(v * 10 ** (PARAM[k]?.d ?? 2)) / 10 ** (PARAM[k]?.d ?? 2)).toString().replace('.', DEC);

/* ---------- pełna analiza: ocena + trendy + co sprawdzić najpierw ---------- */
function analyze(tank, events, nowTs = Date.now()) {
  const last = latestValues(events), m = {}, ages = {};
  for (const k in last) { m[k] = last[k].v; ages[k] = (nowTs - last[k].ts) / DAY; }
  // pH, temp i NH4 łączymy tylko gdy pomiary z tego samego okresu (≤ 2 dni) – inaczej NH3 liczony z nieaktualnego pH byłby mylący
  const nhStale = has(m.NH4) && has(m.pH) && Math.abs(last.NH4.ts - last.pH.ts) > 2 * DAY;
  // CO₂ z pH i KH ma sens tylko dla pomiarów z tego samego czasu
  if (has(m.pH) && has(m.KH) && Math.abs(last.pH.ts - last.KH.ts) > 2 * DAY) m._noCO2 = true;
  let evals = evaluate(tank, m).map(e => ({ ...e, age: ages[e.k] ?? ages.pH }));
  if (nhStale) { const { pH, ...rest } = m; const nh = evaluate(tank, { NH4: m.NH4, ...(has(m.temp) ? { temp: m.temp } : {}) }).find(e => e.k === 'NH4'); evals = evals.map(e => e.k === 'NH4' ? { ...nh, msg: tl('{0} (pH z innego dnia).', nh.msg), age: ages.NH4 } : e); }
  const tr = trends(tank, events, nowTs);
  const stale = MEASURED.filter(k => ages[k] > 30 && ['pH', 'KH', 'NO3', 'PO4'].includes(k));
  const issues = [...evals.filter(e => e.sev !== 'ok'), ...tr].sort((a, b) => SEV_W[b.sev] - SEV_W[a.sev] || (a.k === 'NH4' || a.k === 'NO2' ? -1 : 0));
  const worst = issues.length ? issues[0].sev : 'ok';
  return { last, evals, trends: tr, issues, worst, stale, empty: !Object.keys(last).length };
}

// stężenie składnika w wodzie do podmian: kranówka zmieszana z RO wg udziału z profilu (RO bez wpisu = 0)
// rodzaj wody: 'tap' – kranówka, 'ro' – RO, 'mix' – kranówka + RO wg udziału (RO bez wpisu = 0)
const roShare = tank => tank.water === 'ro' ? 1 : tank.water === 'tap' ? 0 : Math.min(Math.max((+tank.roFrac || 0) / 100, 0), 1);
function tapOf(tank, k) {
  const f = roShare(tank), a = tank.tap && has(tank.tap[k]) ? tank.tap[k] : 0, b = tank.ro && has(tank.ro[k]) ? tank.ro[k] : 0;
  return a * (1 - f) + b * f;
}
/* ---------- zadania pielęgnacyjne ---------- */
const TASK_KINDS = {
  dose_macro: { name: tl('Nawóz makro (NPK)'), icon: 'leaf', log: 'dose' }, dose_micro: { name: tl('Nawóz mikro / żelazo'), icon: 'flask', log: 'dose' },
  water: { name: tl('Podmiana wody'), icon: 'wave', log: 'water' }, test: { name: tl('Test wody'), icon: 'test', log: 'measure' },
  filter: { name: tl('Czyszczenie filtra'), icon: 'mix' }, trim: { name: tl('Przycinanie roślin'), icon: 'garden' },
  media: { name: tl('Wymiana wkładów'), icon: 'pack' }, glass: { name: tl('Czyszczenie szyb'), icon: 'drop' }, other: { name: tl('Inne'), icon: 'cal' },
};
function taskCompletions(task, events) {
  return events.filter(e => (e.taskId === task.id) || (task.kind === 'water' && e.type === 'water') || (task.kind === 'test' && e.type === 'measure')).map(e => e.date);
}
function taskStatus(task, events, today) {
  const done = taskCompletions(task, events).sort(), last = done[done.length - 1] || null, t = dnum(today), start = dnum(task.start || today);
  const doneToday = last === today;
  if (task.mode === 'every') {
    const every = Math.max(1, task.every || 7), next = last ? Math.max(dnum(last) + every, start) : start;
    return { due: next <= t && !doneToday, overdue: Math.max(0, t - next), next: dfrom(next <= t && !doneToday ? next : (doneToday ? dnum(today) + every : next)), last, doneToday };
  }
  const days = task.days || []; if (!days.length) return { due: false, overdue: 0, next: null, last, doneToday };
  let sched = null; for (let i = 0; i <= 6; i++) { const n = t - i; if (n < start) break; if (days.includes(new Date(n * DAY).getUTCDay())) { sched = n; break; } }
  const due = sched != null && (!last || dnum(last) < sched);
  let next = null; for (let i = due ? 0 : 1; i <= 7; i++) { const n = t + i; if (n >= start && days.includes(new Date(n * DAY).getUTCDay())) { next = n; break; } }
  return { due, overdue: due ? t - sched : 0, next: next != null ? dfrom(due ? sched : next) : null, last, doneToday };
}

/* ---------- przypomnienia: eksport planu do kalendarza (.ics) ---------- */
const ICS_DAY = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
function icsFor(tankName, tasks, today, hour = 18) {
  const esc = t => String(t).replace(/[\\,;]/g, m => '\\' + m).replace(/\n/g, '\\n'), d = (today || '').replace(/-/g, ''), hh = String(hour).padStart(2, '0');
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  const L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//DoseMyTank//PL', 'CALSCALE:GREGORIAN'];
  for (const k of tasks) {
    const rule = k.mode === 'every' ? `FREQ=DAILY;INTERVAL=${Math.max(1, k.every || 7)}` : (k.days || []).length ? `FREQ=WEEKLY;BYDAY=${k.days.map(x => ICS_DAY[x]).join(',')}` : null;
    if (!rule) continue;
    const start = (k.start && k.start > today ? k.start : today).replace(/-/g, '');
    L.push('BEGIN:VEVENT', `UID:${k.id}@akwarysta` /* domena UID bez zmian: kalendarz rozpoznaje po niej wcześniej zaimportowane wydarzenia */, `DTSTAMP:${stamp}`, `DTSTART:${start}T${hh}0000`, 'DURATION:PT15M', `RRULE:${rule}`, `SUMMARY:${esc(tankName + ': ' + k.name)}`,
      'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${esc(k.name)}`, 'TRIGGER:PT0M', 'END:VALARM', 'END:VEVENT');
  }
  L.push('END:VCALENDAR'); return L.join('\r\n') + '\r\n';
}

/* ---------- kontroler nawożenia: suma składników ze wszystkich nawozów ----------
   plan: [{ pid, amt (ml|g na dawkę), n (dawek/tydz.) }], prod(pid) → { name, unit, ppm: { jon: mg/l w 1 l na 1 ml|g } }
   Wynik w mg/l tygodniowo w akwarium V l. Każdy jon liczony raz na produkt (bez podwójnego liczenia N z NO₃ i NH₄ – to osobne jony). */
function planTotals(plan, prod, V) {
  const total = {}, by = {}, missing = [];
  if (!(V > 0)) return { total, by, missing: [{ reason: tl('Brak objętości akwarium.') }] };
  for (const it of plan || []) {
    const p = prod(it.pid);
    if (!p) { missing.push({ pid: it.pid, reason: tl('Nawóz usunięty z bazy.') }); continue; }
    const amt = +it.amt, n = +it.n;
    if (!(amt > 0) || !(n > 0)) { missing.push({ pid: it.pid, name: p.name, reason: tl('Brak dawki lub liczby dawek.') }); continue; }
    const keys = Object.keys(p.ppm || {}).filter(k => p.ppm[k] > 0);
    if (!keys.length) { missing.push({ pid: it.pid, name: p.name, reason: tl('Brak składu – nie wiadomo, co dostarcza.') }); continue; }
    for (const k of keys) { const v = p.ppm[k] * amt * n / V; total[k] = (total[k] || 0) + v; (by[k] ||= []).push({ pid: it.pid, name: p.name, v }); }
  }
  const dup = Object.keys(by).filter(k => by[k].length > 1);
  return { total, by, missing, dup };
}
// n dawek w tygodniu → dni tygodnia (0=nd), równo rozłożone od poniedziałku
const spreadDays = n => { n = Math.min(Math.max(Math.round(+n || 0), 0), 7); const d = []; for (let i = 0; i < n; i++) { const x = (1 + Math.round(i * 7 / n)) % 7; if (!d.includes(x)) d.push(x); } return d; };
// zadania dawkowania z planu nawożenia; istniejące (po pid) zostają bez zmian – nigdy nie nadpisujemy dawek użytkownika
function doseTasksFromPlan(plan, prod, tasks, today, uid) {
  const out = [];
  for (const it of plan || []) {
    const p = prod(it.pid); if (!p || !(+it.amt > 0) || !(+it.n > 0)) continue;
    if ((tasks || []).some(k => k.pid === it.pid)) continue;
    const n = +it.n, base = { id: uid(), kind: /micro|fe/.test(p.kind || '') ? 'dose_micro' : 'dose_macro', name: p.name, pid: p.id, amt: +it.amt, unit: p.unit, start: today };
    out.push(n > 7 ? { ...base, mode: 'every', every: 1 } : n < 1 ? { ...base, mode: 'every', every: Math.round(7 / n) } : { ...base, mode: 'days', days: spreadDays(n) });
  }
  return out;
}
// test wody dzień przed każdą podmianą (pomiar „po tygodniu”, zanim podmiana rozcieńczy wodę)
function testBeforeWater(water, today, uid) {
  if (!water || water.kind !== 'water') return null;
  const base = { id: uid(), kind: 'test', name: tl('Test wody przed podmianą'), before: water.id };
  if (water.mode === 'every') { const every = Math.max(1, water.every || 7), st = dnum(water.start || today) - 1; return { ...base, mode: 'every', every, start: dfrom(Math.max(st, dnum(today) - every + 1)) }; }
  const days = (water.days || []).map(d => (d + 6) % 7); return days.length ? { ...base, mode: 'days', days, start: today } : null;
}
// faktycznie podane wg dziennika (dawki mają zapisane mg/l w chwili podania)
function periodTotals(events, fromTs, toTs) {
  const total = {}, byProduct = {};
  for (const e of events) {
    if (e.type !== 'dose' || !(e.ts > fromTs && e.ts <= toTs)) continue;
    const b = (byProduct[e.pid || e.name] ||= { name: e.name, unit: e.unit, amount: 0, count: 0, ppm: {} });
    b.amount += +e.amount || 0; b.count++;
    for (const k in e.ppm || {}) { const v = e.ppm[k] || 0; total[k] = (total[k] || 0) + v; b.ppm[k] = (b.ppm[k] || 0) + v; }
  }
  return { total, byProduct, days: (toTs - fromTs) / DAY };
}
// górna granica narastania przy stałym dodawaniu i podmianach (p – ułamek tygodniowo), bez poboru przez rośliny.
// Rzetelna tylko dla soli zachowawczych (Na, Cl, SO₄, twardość) – NO₃/PO₄/K/Fe rośliny pobierają, więc dla nich to tylko sufit.
const steadyState = (addWeek, p, water = 0) => p > 0 ? Math.max((addWeek + p * water) / p, 0) : null;

// zapas nawozu: st = { left (ml/g w chwili wpisu), at (ts) }; odejmujemy dawki zapisane w dzienniku po tym czasie; perWeek – dawka planu na tydzień
function stockStatus(st, events, pid, perWeek, now) {
  if (!st || !(+st.left >= 0)) return null;
  const used = (events || []).filter(e => e.type === 'dose' && e.pid === pid && e.ts >= (st.at || 0)).reduce((a, e) => a + (+e.amount || 0), 0);
  const left = Math.max(+st.left - used, 0), perDay = perWeek > 0 ? perWeek / 7 : 0, days = perDay > 0 ? Math.floor(left / perDay) : null;
  return { left, used, perDay, days, runout: days != null ? dfrom(Math.floor((now + days * DAY) / DAY)) : null };
}
const plural = (n, a, b, c) => n === 1 ? a : (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20)) ? b : c;
const LOGIC = { plural, DAY, dkey, dnum, dfrom, dow, PARAM, MEASURED, PROFILES, targetsOf, freeNH3, evaluate, SEV_W, series, latestValues, trends, analyze, tapOf, roShare, planTotals, stockStatus, periodTotals, spreadDays, doseTasksFromPlan, testBeforeWater, steadyState, icsFor, TASK_KINDS, taskCompletions, taskStatus, fmtV };
if (typeof module !== 'undefined') module.exports = LOGIC;
