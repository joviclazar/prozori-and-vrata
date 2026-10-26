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

## Sledeći korak: izdvajanje strukturnih linija (čeka potvrdu korisnika)

### Problem u originalnom planu

`CLAUDE.md` (pipeline, korak 2) kaže "kratki potezi unutar rama su simboli, potezi van rama su cifre", ali u trenutku klasifikacije ram još ne postoji: nastaje tek u izgradnji mreže, i to od linija koje klasifikacija izdvoji. Kružna zavisnost.

### Predlog

Klasifikacija se deli na dva dela:

1. **Sada, bez konteksta:** izdvojiti strukturne linije (kandidati za ram i podele); sve ostalo su anotacije.
2. **Posle izgradnje mreže:** anotacije se razvrstavaju po položaju (unutar polja = simbol, van rama = cifra).

```
segment -> extractStructuralLines -> buildGrid -> anotacije po položaju -> simboli / cifre -> ...
```

**Odluka 1 (preporuka B):** klasifikuje se svaka duž, ne ceo potez. Kukić na kraju linije je kratka duž koja se odbacuje; ram jednim potezom daje 4 strukturne duži; potez bez ijedne strukturne duži ide ceo (sa svim tačkama) u anotacije.

**Odluka 2:** duž je strukturna ako važi oba uslova:

- dužina ≥ **25% najduže duži u skici** (relativno; na snimljenim skicama prag ~130–150 px, cifre ≤ 90 px su ispod);
- odstupanje od 0° ili 90° ≤ **20°** (krakovi `>`, `<`, `Λ` su na ~40–55°).

Obe vrednosti idu u konfiguraciju (kao `segmentation-config.ts`).

**Predloženi interfejs:**

```ts
type Orientation = 'horizontal' | 'vertical';

interface StructuralLine {
  readonly segment: Segment;
  readonly orientation: Orientation;
  readonly strokeId: number;
}

interface StructuralExtraction {
  readonly lines: readonly StructuralLine[];
  readonly annotations: readonly Stroke[];
}

function extractStructuralLines(
  segmented: readonly SegmentedStroke[],
  minRelativeLength: number,
  maxAngleDeg: number,
): StructuralExtraction
```

Pomoćne funkcije u `core/geometry`: `segmentLength(segment)` i `segmentOrientation(segment, maxAngleDeg): Orientation | null`.

### Zadaci

1. Korisnik potvrđuje odluke (podela klasifikacije, varijanta B, pragovi 25% i 20°).
2. Ažurirati `CLAUDE.md` (pipeline, konstante): predlog Claude.
3. `segmentLength`, `segmentOrientation`: testove Claude, implementacija korisnik.
4. `extractStructuralLines`: testove Claude, implementacija korisnik.
5. Debug prikaz (strukturne linije plavo, anotacije sivo, odbačene duži crveno): predlog Claude.

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
