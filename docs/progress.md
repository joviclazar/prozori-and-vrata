# Napredak

Trenutno stanje projekta i sledeći koraci. Opis projekta, arhitektura i pravila rada su u `CLAUDE.md`; ovde je samo ono što se menja iz sesije u sesiju.

Poslednje ažuriranje: 2026-10-28.

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

### Faza 2, korak 2: izdvajanje strukturnih linija (gotovo)

- `core/geometry/segment.ts`: `segmentLength`, `segmentOrientation`, `cornerAngle`, tip `Orientation`.
- `core/recognition/stroke-classifier/extract-structural-lines.ts`: duž je strukturna ako je ≥ 25% najduže i ≤ 20° od ose; **veto**: potez sa temenom < 75° između dve duži uporedive dužine (kraća ≥ 25% duže) ide ceo u anotacije.
- Zašto veto: bez njega krakovi simbola (`>`/`<` pljosnati, `Λ` uzak) prolaze kao linije u 4 od 5 skica, a pragovi dužine i ugla se preklapaju sa ramom. Ugao u temenu razdvaja jasno: ram 86–90°, simboli i cifre 22–66°. Detalji su u `CLAUDE.md` (pipeline, korak 2).
- Debug prikaz: checkbox "Structure" (`app/sketch/structure-debug.ts`); linije plavo, anotacije sivo, odbačeno crveno.
- Rezultat: svih 5 skica tačno; 121 test u `core/` prolazi.

## U toku: ispravljanje i spajanje linija (korak 2 ka Demo 1)

### Odluke (potvrđene 2026-10-27)

- **Ispravljanje:** `StructuralLine` -> `AxisLine { orientation, position, start, end, strokeIds }`. Položaj je prosek koordinata krajeva, raspon je projekcija krajeva (`start < end`). Fitovanje najmanjim kvadratima je odloženo (razlika je par piksela).
- **Spajanje:** ista orijentacija, razlika položaja ≤ 10% i razmak raspona ≤ 10% najduže ulazne linije. Rezultat: unija raspona, položaj ponderisan dužinom, spojeni `strokeIds`.
- **Algoritam:** ponavljati "nađi par, spoji" dok ima promena (O(n³), n ≈ 4–10).

### Merenja na snimljenim skicama

- Kraj linije odstupa od početka 0–56 px, pa je ispravljanje potrebno.
- Prvih 5 skica nema stranu iz više delova; to pokriva nova skica iz zadatka 5.
- Najbliže paralelne linije (podela i strana) su ≥ ~240 px udaljene, a prag spajanja je 35–60 px.
- Krajevi linija se ne dodiruju (razmaci i prebačaji 15–50 px), što je posao koraka 3.

### Zadaci

1. ~~Odluke, `CLAUDE.md`~~ (Claude).
2. ~~Config i testovi~~ (Claude): `core/recognition/grid-builder/grid-builder-config.ts`, `axis-lines.spec.ts`.
3. ~~`toAxisLine`~~ (korisnik).
4. ~~`mergeCollinear`~~: `canMerge` i `merge` korisnik, glavna funkcija i `findMergeablePair` Claude (na zahtev korisnika).
5. ~~Nova skica~~ (korisnik): `sketch-2026-10-28-21-48-18.json`, leva strana iz dva poteza (s1+s2) i gornja precrtana dva puta (s5+s6). Obe su spojene: razlika položaja ≤ 3.5 px i razmak ≤ 1.7 px pri pragu od 26 px; najbliži par koji ne sme da se spoji (podela i strana) je 128 px udaljen. Skica je manja od prethodnih (ram ~260×170 px), pa potvrđuje i relativne pragove.
6. ~~Debug prikaz~~ (Claude): checkbox "Axis lines", ispravljene linije zeleno; spojene linije imaju oznaku poteza (npr. `1+2`).

Rezultat na snimljenim skicama: broj osnih linija jednak broju strukturnih (4 ili 5), nijedno lažno spajanje. 137 testova u `core/` prolazi.

## Put do prvog demoa

**Demo 1:** nacrtani ram i podele (bilo kojim stilom) postaju čist tehnički crtež sa prikazanim poljima.
**Demo 2:** prepoznat ceo prozor (ram, podele, tip otvaranja svakog krila), dimenzije unete ručno, prikazan `WindowModel`.

| # | Korak | Obim |
|---|---|---|
| **Demo 1** |||
| 1 | ~~Izdvajanje strukturnih linija~~ | mali |
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
