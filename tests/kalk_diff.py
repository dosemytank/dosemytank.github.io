# Porównanie dwóch zapisów kalkulatora (kalk_capture.py): które przypadki zmieniły liczby, tekst wyniku albo stan formularza.
# Użycie: python3 tests/kalk_diff.py tests/fixtures/kalk-6.11.json nowy.json [--tekst]
# Porównywał zapisy wersji 6.11.x; od 7.0 (nowy interfejs) służy do odczytu historii zmian.
import sys, json, difflib
def strip(v):  # pole `code` w ostrzeżeniach (dodane w 7.0) nie jest zmianą wyniku
    if isinstance(v, dict): return {k: strip(x) for k, x in v.items() if k != 'code'}
    if isinstance(v, list): return [strip(x) for x in v]
    return v
a = {c['name']: c for c in json.load(open(sys.argv[1]))['cases']}; b = {c['name']: c for c in json.load(open(sys.argv[2]))['cases']}
show = '--tekst' in sys.argv; changed = 0
for name, x in a.items():
    y = b.get(name)
    if y is None: print('BRAK:', name); changed += 1; continue
    parts = [k for k in ('log', 'st', 'text') if strip(x[k]) != strip(y[k])]
    if not parts: continue
    changed += 1; print(f'ZMIANA [{", ".join(parts)}]: {name}')
    if show and 'text' in parts:
        for l in difflib.unified_diff(x['text'].split('\n'), y['text'].split('\n'), lineterm='', n=0):
            if not l.startswith(('---', '+++', '@@')): print('   ', l)
print(f'{changed} z {len(a)} przypadków ze zmianą')
