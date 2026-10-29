# Napredak

Trenutno stanje projekta i sledeći koraci. Opis projekta, arhitektura i pravila rada su u `CLAUDE.md`; ovde je samo ono što se menja iz sesije u sesiju.

Poslednje ažuriranje: 2026-10-29.

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

### Faza 2, korak 3: ispravljanje i spajanje linija (gotovo)

- `core/recognition/grid-builder/axis-lines.ts`: `toAxisLine` (položaj = prosek krajeva, raspon `start < end`), `mergeCollinear` (ista orijentacija, razlika položaja i razmak ≤ 10% najduže linije; unija raspona, položaj ponderisan dužinom; "nađi par, spoji" dok ima promena).
- Debug prikaz: checkbox "Axis lines" (zeleno; spojene linije imaju oznaku poteza, npr. `1+2`).
- Skica `21-48-18` (strana iz dva poteza, strana precrtana dva puta): oba spajanja tačna, razlika ≤ 3.5 px pri pragu od 26 px; najbliži par koji ne sme da se spoji je 128 px udaljen.

## U toku: ram i podele (korak 3 ka Demo 1)

### Odluke (potvrđene 2026-10-28)

- **Ram:** krajnje linije po orijentaciji; pravougaonik (`BoundingBox`) samo od njihovih položaja, krajevi se ne gledaju (otvoreni uglovi prolaze). Svaka strana pokriva ≥ 50% svoje dimenzije rama (samo deo unutar rama). Bez 2 + 2 linije nema rama (`null`).
- **Podele:** svaki kraj unutrašnje linije udara u granicu (strana rama ili prihvaćena podela suprotne orijentacije koja se pruža preko tog mesta) na ≤ 15% dimenzije rama u pravcu linije; krajevi se lepe za najbližu granicu; "nađi liniju, prihvati" dok ima promena (T-spojevi). Ostalo je odbačeno.

### Merenja na snimljenim skicama

- Promašaji na uglovima rama: 1–8% dimenzije, osim `13-26-11`: gornji desni ugao otvoren 26% (gornja strana se završava 130 px pre desne). Pristup koji traži zatvoren pravougaonik bi tu pao.
- Najlošija pokrivenost strane: 70% (`13-26-11`, gornja).
- Krajevi podela: ≤ 4% od rama. Sve podele su vertikalne, od vrha do dna, na 47–50% širine; T-spoj i prečka nisu snimljeni.

### Zadaci

1. ~~Odluke, `CLAUDE.md`~~ (Claude).
2. ~~Config i testovi~~ (Claude): `GRID_THRESHOLDS` u `grid-builder-config.ts`, `find-grid-lines.spec.ts`.
3. ~~`findFrame`~~ (korisnik; proveru pokrivenosti dopisao Claude na zahtev korisnika).
4. ~~`findDividers` i `findGridLines`~~ (Claude, na zahtev korisnika).
5. Nove skice: prozor sa nadsvetlom (prečka + podela ispod nje), podela koja namerno ne dodiruje ram (korisnik).
6. ~~Debug prikaz~~ (Claude): checkbox "Grid"; ram kao ljubičasti pravougaonik, zalepljene podele (dupla linija kao dve crte), odbačene linije crveno; u toolbar-u broj podela i odbačenih ili "no frame".

Rezultat: svih 7 skica daju tačan ram i podele, nijedna linija odbačena. 164 testa u `core/` prolazi.

### Otkriveno: dupla linija (T-profil)

Korisnik je potvrdio konvenciju (upisano u `CLAUDE.md`): jednostruka linija = štulp, dupla = T-profil; horizontalna podela se uvek crta duplo. Skica `10-29-21-19-15`: dupla vertikalna linija (s5 i s6) na razmaku **15 px** (3.9% najduže linije), a `mergeCollinear` ih spaja u jednu (prag 10%), pa se informacija o duploj liniji gubi. Za poređenje: strana precrtana dva puta (`21-48-18`) ima razmak 0.5 px (0.2%). 
Rešenje (potvrđeno): `AxisLine.doubled`; spajanje ostaje (dupla linija je jedna podela, položaj na osi T-profila), a spojena linija je `doubled` ako delovi stoje jedan pored drugog (preklapanje ≥ 50% kraćeg) na razmaku ≥ 2% najduže linije, ili je neki deo već bio `doubled`. Ram se uvek crta jednostrukom linijom.

1. ~~Polje `doubled` na svim mestima, pragovi u `MERGE_THRESHOLDS`, testovi~~ (Claude). `merge` za sada samo prenosi `a.doubled || b.doubled`.
2. ~~Uslov "jedan pored drugog" u `merge`~~ (Claude, na zahtev korisnika). Na svih 7 skica `doubled` je samo T-profil iz `10-29-21-19-15`; precrtana strana i strana iz dva poteza (`21-48-18`) nisu označene. 173 testa prolazi.
3. Još 2–3 skice sa duplom linijom i nadsvetlo (korisnik).

## Put do prvog demoa

**Demo 1:** nacrtani ram i podele (bilo kojim stilom) postaju čist tehnički crtež sa prikazanim poljima.
**Demo 2:** prepoznat ceo prozor (ram, podele, tip otvaranja svakog krila), dimenzije unete ručno, prikazan `WindowModel`.

| # | Korak | Obim |
|---|---|---|
| **Demo 1** |||
| 1 | ~~Izdvajanje strukturnih linija~~ | mali |
| 2 | ~~Mreža: ispravljanje na 0°/90°, spajanje kolinearnih duži~~ | srednji |
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
