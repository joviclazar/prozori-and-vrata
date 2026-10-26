# Napredak

Trenutno stanje projekta i sledeći koraci. Opis projekta, arhitektura i pravila rada su u `CLAUDE.md`; ovde je samo ono što se menja iz sesije u sesiju.

Poslednje ažuriranje: 2026-10-26.

## Gotovo

### Faza 1 (kompletna)

- Angular projekat u korenu repoa, Vitest (`src/test-setup.ts` sa `ResizeObserver` stub-om za jsdom), ESLint sa granicom `core/`, Prettier.
- `app/sketch/sketch-canvas`: crtanje (Pointer Events, coalesced events, DPR skaliranje), Clear / Save / Load skice kao JSON.
- `core/model/stroke.ts`, `core/model/sketch-file.ts`: format fajla (`version: 1`), zaokruživanje, ručna validacija sa putanjom greške (npr. `strokes[0].points[1].x`), provera jedinstvenih id-jeva.
- `test-data/sketches/`: 5 skica (ram jednim, dva i četiri poteza; jedna sadrži slučajni klik).

### Faza 2, korak 1: segmentacija (gotova)

- `core/geometry`: `point` (`distance`), `bounding-box`, `path` (`pathLength`, `straightness`), `segment` (`distanceToSegment`, `Segment`, `toSegments`), `simplify-path` (RDP, generički `<T extends Point>`, vraća originalne objekte).
- `core/recognition/segmentation/segment-strokes.ts`: `segmentStrokes(strokes, tolerance, minLength): SegmentedStroke[]`.
- `segmentation-config.ts`: tolerancija 30 px (eksperimentalno: radi od 15 do 100 px), minimalna dužina poteza 8 px.
- Debug prikaz u canvas komponenti: checkbox "Segments" + slajder tolerancije (1–100 px), crta uprošćenu poliliniju crveno.
- 90 testova prolazi, lint čist.

## U toku: izdvajanje strukturnih linija

### Odluke (potvrđene 2026-10-26)

- Klasifikacija se deli na dva dela: sada samo strukturne linije (kandidati za ram i podele) i anotacije; anotacije se razvrstavaju po položaju tek posle izgradnje mreže (ram pre toga ne postoji, inače bi zavisnost bila kružna).
- Klasifikuje se svaka duž, ne ceo potez (varijanta B).
- Duž je strukturna ako je dužina ≥ 25% najduže duži u skici i odstupanje od 0°/90° ≤ 20°.
- **Veto po oštrom uglu (opcija A):** potez sa temenom < 75° između dve duži, gde je kraća ≥ 25% duže, ide ceo u anotacije.

### Zašto veto (merenje na snimljenim skicama)

Samo dužina i ugao davali su lažno pozitivne rezultate u 4 od 5 skica: `>`/`<` se crtaju pljosnato, a `Λ` usko, pa krakovi odstupaju od ose samo 9–20° i imaju do 59% najduže duži. Nijedan prag se ne može pooštriti: najkrivlja linija rama ima 9.2°, a najravniji krak simbola 9.3°; najkraća linija rama je na 45%, a najduži krak simbola na 59%.

Ugao u temenu razdvaja jasno: ram 86–90°, simboli i cifre 22–66°. Uslov za "značajno" teme je prvo bio "obe duži ≥ 25% najduže u skici", ali krak od 24.5% (`13-26-11`, s7) je promakao. Odnos kraće i duže duži u istom potezu radi na svih 5 skica, a kukić (kratak u odnosu na svoju liniju) i dalje ne obara liniju rama.

Poznato ograničenje: simbol nacrtan kao dva odvojena poteza nema teme; takve kandidate odbacuje tek `buildGrid`.

### Zadaci

1. ~~Odluke~~, ~~`CLAUDE.md`~~ (Claude).
2. ~~Testovi~~ (Claude): `segmentLength`, `segmentOrientation`, `cornerAngle` u `core/geometry/segment.spec.ts`; `extractStructuralLines` u `core/recognition/stroke-classifier/extract-structural-lines.spec.ts`. Pragovi su u `structural-lines-config.ts`.
3. ~~Implementacija~~: `core/geometry/segment.ts` (korisnik), `extract-structural-lines.ts` (Claude, na zahtev korisnika, uz objašnjenje).
4. ~~Debug prikaz~~ (Claude): checkbox "Structure" (`app/sketch/structure-debug.ts`); strukturne linije plavo, anotacije sivo, odbačeno crveno (šum i duži strukturnih poteza koje nisu prošle, npr. kukić).

Rezultat na snimljenim skicama: svih 5 tačno (4 ili 5 linija rama i podela, svi simboli i cifre u anotacijama, slučajni klik odbačen). 121 test u `core/` prolazi.

## Put do prvog demoa

**Demo 1:** nacrtani ram i podele (bilo kojim stilom) postaju čist tehnički crtež sa prikazanim poljima.
**Demo 2:** prepoznat ceo prozor (ram, podele, tip otvaranja svakog krila), dimenzije unete ručno, prikazan `WindowModel`.

| # | Korak | Obim |
|---|---|---|
| **Demo 1** |||
| 1 | Izdvajanje strukturnih linija (gore) | mali |
| 2 | Mreža: ispravljanje na 0°/90°, spajanje kolinearnih duži | srednji |
| 3 | Mreža: pronalaženje spoljnog rama i podela | najveći |
| 4 | Mreža: ram + podele -> polja | srednji |
| 5 | Orkestracija (`sketch-parser.ts`), poziv posle svakog poteza | mali |
| 6 | Beautification prikaz | srednji (UI) |
| **Demo 2** |||
| 7 | Anotacije po položaju | mali |
| 8 | Simboli: geometrijsko pravilo (smer vrha), `<` + `Λ`, konvencija ručka/šarke | srednji |
| 9 | `WindowModel` iz mreže + simbola, stub/štulp | srednji |
| 10 | Ručni unos dimenzija | mali (UI) |
| 11 | Prikaz modela | mali (UI) |

Svesno odloženo posle demoa: Web Worker (prepoznavanje traje par ms; kasnije se menja samo mesto poziva), prepoznavanje cifara (ONNX), $P recognizer (za poređenje u radu).

## Napomene za rad sa Claude-om

- Claude ne piše referentna rešenja za delove koje implementira korisnik (ni u chatu ni u alatima); samo testove, smernice i review.
- Bez komentara u kodu; objašnjenja idu u chat.
