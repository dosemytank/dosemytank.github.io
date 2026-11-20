"""Wszystkie testy przeglądarkowe (Playwright, Chromium) po kolei – lokalnie i w GitHub Actions.
Uruchom: python3 tests/e2e_all.py [katalog_na_zrzuty]   (domyślnie shots/e2e). Kod wyjścia ≠ 0, gdy któryś test nie przejdzie."""
import os, sys, subprocess, time
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SHOTS = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'shots', 'e2e'))
TESTS = ['e2e_ux.py', 'e2e_mobile.py', 'e2e_kalkulator.py', 'e2e_kalk_wizualne.py', 'e2e_zakupy.py', 'e2e_spojnosc.py', 'e2e_i18n.py', 'e2e_strona.py', 'e2e_offline.py']
fail = []
for t in TESTS:
    d = os.path.join(SHOTS, t[:-3]); os.makedirs(d, exist_ok=True); t0 = time.time()
    r = subprocess.run([sys.executable, os.path.join(ROOT, 'tests', t), d], cwd=ROOT, capture_output=True, text=True, timeout=900)
    ok = r.returncode == 0; print(f"{'OK ' if ok else 'BŁĄD'} {t} ({time.time() - t0:.0f} s)")
    if not ok: fail.append(t); print(r.stdout[-3000:], r.stderr[-6000:], sep='\n')
print(f'{len(TESTS) - len(fail)}/{len(TESTS)} testów przeglądarkowych przeszło' + (f' – błędy: {", ".join(fail)}' if fail else ''))
sys.exit(1 if fail else 0)
