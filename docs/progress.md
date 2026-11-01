# Napredak

Trenutno stanje projekta i sledeći koraci. Opis projekta, arhitektura i pravila rada su u `CLAUDE.md`; ovde je samo ono što se menja iz sesije u sesiju.

Poslednje ažuriranje: 2026-11-01.

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

### Faza 2, korak 4: ram, podele i dupla linija (gotovo)

#### Odluke (potvrđene 2026-10-28)

- **Ram:** krajnje linije po orijentaciji; pravougaonik (`BoundingBox`) samo od njihovih položaja, krajevi se ne gledaju (otvoreni uglovi prolaze). Svaka strana pokriva ≥ 50% svoje dimenzije rama (samo deo unutar rama). Bez 2 + 2 linije nema rama (`null`).
- **Podele:** svaki kraj unutrašnje linije udara u granicu (strana rama ili prihvaćena podela suprotne orijentacije koja se pruža preko tog mesta) na ≤ 15% dimenzije rama u pravcu linije; krajevi se lepe za najbližu granicu; "nađi liniju, prihvati" dok ima promena (T-spojevi). Ostalo je odbačeno.

#### Merenja na snimljenim skicama

- Promašaji na uglovima rama: 1–8% dimenzije, osim `13-26-11`: gornji desni ugao otvoren 26% (gornja strana se završava 130 px pre desne). Pristup koji traži zatvoren pravougaonik bi tu pao.
- Najlošija pokrivenost strane: 70% (`13-26-11`, gornja).
- Krajevi podela: ≤ 4% od rama. Sve podele su vertikalne, od vrha do dna, na 47–50% širine; T-spoj i prečka nisu snimljeni.

#### Zadaci

1. ~~Odluke, `CLAUDE.md`~~ (Claude).
2. ~~Config i testovi~~ (Claude): `GRID_THRESHOLDS` u `grid-builder-config.ts`, `find-grid-lines.spec.ts`.
3. ~~`findFrame`~~ (korisnik; proveru pokrivenosti dopisao Claude na zahtev korisnika).
4. ~~`findDividers` i `findGridLines`~~ (Claude, na zahtev korisnika).
5. Nove skice: prozor sa nadsvetlom (prečka + podela ispod nje), podela koja namerno ne dodiruje ram (korisnik).
6. ~~Debug prikaz~~ (Claude): checkbox "Grid"; ram kao ljubičasti pravougaonik, zalepljene podele (dupla linija kao dve crte), odbačene linije crveno; u toolbar-u broj podela i odbačenih ili "no frame".

Rezultat: svih 7 skica daju tačan ram i podele, nijedna linija odbačena. 164 testa u `core/` prolazi.

#### Otkriveno: dupla linija (T-profil)

Korisnik je potvrdio konvenciju (upisano u `CLAUDE.md`): jednostruka linija = štulp, dupla = T-profil; horizontalna podela se uvek crta duplo. Skica `10-29-21-19-15`: dupla vertikalna linija (s5 i s6) na razmaku **15 px** (3.9% najduže linije), a `mergeCollinear` ih spaja u jednu (prag 10%), pa se informacija o duploj liniji gubi. Za poređenje: strana precrtana dva puta (`21-48-18`) ima razmak 0.5 px (0.2%).
Rešenje (potvrđeno): `AxisLine.doubled`; spajanje ostaje (dupla linija je jedna podela, položaj na osi T-profila), a spojena linija je `doubled` ako delovi stoje jedan pored drugog (preklapanje ≥ 50% kraćeg) na razmaku ≥ 2% najduže linije, ili je neki deo već bio `doubled`. Ram se uvek crta jednostrukom linijom.

1. ~~Polje `doubled` na svim mestima, pragovi u `MERGE_THRESHOLDS`, testovi~~ (Claude). `merge` za sada samo prenosi `a.doubled || b.doubled`.
2. ~~Uslov "jedan pored drugog" u `merge`~~ (Claude, na zahtev korisnika). Na svih 7 skica `doubled` je samo T-profil iz `10-29-21-19-15`; precrtana strana i strana iz dva poteza (`21-48-18`) nisu označene. 173 testa prolazi.
3. Još 2–3 skice sa duplom linijom i nadsvetlo (korisnik).

### Faza 2, korak 5: stablo polja (gotovo)

#### Nove skice (2026-10-29)

- `21-45-58`: dupla vertikalna, razmak 12 px (2.6%) — najtešnja do sada, 3 px iznad praga od 2%.
- `21-46-46`: dupla horizontalna (nadsvetlo), razmak 14 px (4.8%); nema podele ispod prečke, pa T-spoj na stvarnoj skici još nije proveren.
- `21-47-17`: ram jednim potezom, bez podele.
- Sve tri tačne. Razmak duple linije je u pikselima skoro konstantan (12–15 px), a relativno varira (2.6–4.8%). Odluka: prag ostaje 2%, spušta se na 1% ako dupla linija počne da promiče.

#### Odluke (potvrđene 2026-11-01)

- **Algoritam:** rekurzivna "giljotina". Region (na početku ram) seku podele čiji je položaj strogo unutar regiona i čiji raspon pokriva celu dimenziju regiona; nema ih → `cell`, ima ih → `split` sa decom sortiranim po položaju. Bez tolerancija, jer su podele zalepljene.
- **Krst:** prvo horizontalna podela, kao kod nadsvetla.
- **Model:** `split` čuva niz podela (`children.length − 1`), jer susedna deca mogu imati različite podele (T-profil i štulp). `direction` je orijentacija linija podele. `CLAUDE.md` (model podataka) ažuriran.

#### Zadaci

1. ~~`CLAUDE.md`, `progress.md`~~ (Claude).
2. ~~Testovi~~ (Claude): `core/recognition/grid-builder/build-grid-tree.spec.ts`.
3. ~~`buildGridTree` i tip `GridNode`~~ (korisnik; sitnice `const`/`push`/`!==` sredio Claude na zahtev).
4. Skica: nadsvetlo + podela ispod (T-spoj na stvarnim podacima) (korisnik, posle).
5. ~~Debug prikaz~~ (Claude): checkbox "Cells", svako polje obojeno, sa rednim brojem (redosled listova stabla).

Rezultat: stablo tačno na svih 10 skica (štulp i T-profil: 2 polja levo-desno, nadsvetlo: 2 polja gore-dole, bez podele: 1 polje). 184 testa prolazi.

### Faza 2, korak 6: orkestracija i golden testovi (gotovo)

- `core/recognition/sketch-parser.ts`: `parseSketch(strokes, config?)` vraća sve međurezultate i stablo; `SketchParserConfig` + `DEFAULT_SKETCH_PARSER_CONFIG` objedinjuju sve pragove.
- `sketch-parser.spec.ts`: jedinični testovi (prazan ulaz, ram + podela, šum i simboli, nezavisnost od redosleda crtanja, nema rama, prosleđivanje config-a).
- `sketch-parser.golden.spec.ts`: svih 10 snimljenih skica; očekivano stablo i broj anotacija po skici. `resolveJsonModule` uključen u `tsconfig.spec.json`.
- `app/sketch/structure-debug.ts` više ne ponavlja pipeline, nego poziva `parseSketch` (tolerancija sa slajdera ide kroz config) i dodaje samo debug podatke (odbačeno, polja).
- Node je ažuriran na v22.23.4, pa `npm test` i `ng build` rade: 203 testa prolazi.

### Faza 2, korak 7: beautification prikaz (gotovo, Demo 1 dostignut)

- `app/sketch/beautify.ts`: čista funkcija `beautify(strokes, parsed)` odlučuje šta se prikazuje. Kad je ram prepoznat: čist ram i podele (T-profil kao dve crte), rukom nacrtani ostaju samo simboli i cifre i linije koje nisu ušle u mrežu (odbačene), a šum se sakriva. Bez rama: sve kako je nacrtano. Testovi u `beautify.spec.ts`.
- Komponenta: `computed` nad potezima poziva `parseSketch` + `beautify`, pa se prikaz menja samo na `pointerup`, nikad dok se crta ili stoji. Checkbox "Beautify" (podrazumevano uključen); debug checkbox-ovi su u grupi "Debug:". Snimljeni fajl i dalje sadrži originalne poteze.
- 207 testova prolazi, `ng build` čist.

#### Proba (korisnik, 2026-11-01)

Korisnik je unapred sumnjao da će stalna zamena crteža biti frustrirajuća; posle probe: "brutalno je dobro". Rezervne opcije, ako se problem ipak pojavi: bledi original ispod čistog crteža, beautification na zahtev, ili posle pauze.

## U toku: Demo 2 (koraci 7 i 8 gotovi; sledeći je 9, `WindowModel`)

### Merenja na snimljenim skicama (2026-11-01)

- Centar poteza: svi simboli u tačnom polju, sve cifre van rama (ispod ili desno).
- Smer vrha: `>` −14…−1°, `<` 164…176°, `Λ` 81…97°; granice na 45°, rezerva ≥ 29°.
- Ugao temena simbola 17–85°: `>` u `21-19-15` ima 85°, pa prag veta (75°) ne može da se koristi; za simbole 110°. Odnos krakova 0.78–0.99.
- `<` + `Λ` uvek dva poteza. `>` u `21-48-18` nacrtan kao dva kraka (razmak krajeva 0 px, pauza 900 ms).

### Odluke (potvrđene 2026-11-01)

- Pravila iz `CLAUDE.md` (pipeline, korak 3 "Anotacije po poljima" i korak 4) i očekivana otvaranja po skicama:

| Skica      | Polje 1                         | Polje 2                    |
| ---------- | ------------------------------- | -------------------------- |
| `10-25-16` | okretno, šarke levo             | okretno-kipno, šarke desno |
| `13-25-22` | okretno, levo                   | okretno-kipno, desno       |
| `13-25-42` | okretno-kipno, levo             |                            |
| `13-26-11` | okretno, levo                   | okretno-kipno, desno       |
| `13-26-37` | okretno-kipno, levo             |                            |
| `21-48-18` | okretno, levo (`>` iz 2 poteza) | okretno-kipno, desno       |
| `21-19-15` | okretno-kipno, levo             | okretno, desno             |
| `21-45-58` | okretno-kipno, levo             | okretno-kipno, desno       |
| `21-46-46` | fiksno (nadsvetlo)              | okretno-kipno, desno       |
| `21-47-17` | okretno-kipno, levo             |                            |

### Zadaci

1. ~~Potvrda~~ (korisnik).
2. ~~`CLAUDE.md`, `progress.md`~~ (Claude).
3. ~~Tipovi i testovi~~ (Claude): `core/model/window-model.ts` (`Opening`, `HingeSide`), `GridCell` i `gridCells` u `build-grid-tree.ts` (preseljeno iz debug prikaza), `symbol-config.ts`, `opening-convention.ts`; testovi `place-annotations.spec.ts`, `find-chevrons.spec.ts`, `recognize-opening.spec.ts`.
4. ~~`placeAnnotations`~~ (Claude, na zahtev korisnika).
5. ~~`apexDirection`, `recognizeOpening`~~ (Claude, na zahtev korisnika).
6. ~~`findChevrons`~~ (Claude, na zahtev korisnika).
7. ~~Povezivanje~~ (Claude): `parseSketch` vraća i `cells` (polje, potezi, ševroni, otvaranje) i `outside` (potezi van rama sa stranom); `SketchParserConfig.symbols`. Debug "Cells" ispisuje otvaranje u svakom polju. Golden testovi proveravaju otvaranja iz tabele.

Rezultat: otvaranja tačna na svih 10 skica, uključujući `>` iz dva poteza (`21-48-18`) i `>` od 85° (`21-19-15`). 249 testova prolazi.

### Usput (2026-11-01)

- **Undo** poslednjeg poteza: dugme i Ctrl+Z (ne reaguje dok se kuca u polje za unos).
- **Beautification simbola** (deo koraka 11, varijanta A po izboru korisnika): prepoznato otvaranje se crta preko celog polja kao na tehničkim crtežima, linije od uglova na strani šarki do sredine strane ručke (tanko, uvučeno od ivica). Fiksno staklo bez simbola; nepoznat simbol ostaje rukom nacrtan. Sakrivaju se samo potezi koji su dali ševron (`Chevron.strokeIds`), ostali potezi u polju ostaju. 255 testova prolazi.

## Put do demoa

**Demo 1 (dostignut 2026-11-01):** nacrtani ram i podele (bilo kojim stilom) postaju čist tehnički crtež sa prikazanim poljima.

**Demo 2:** prepoznat ceo prozor (ram, podele, T-profil/štulp, tip otvaranja i strana šarki svakog krila), širina i visina unete ručno, prikazan `WindowModel` sa upozorenjima. Cifre nacrtane van rama se za sada ignorišu (odluka korisnika 2026-11-01: dimenzije ručno, prepoznavanje cifara posle Demo 2).

| #          | Korak                                                                                                                                      | Obim         |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ------------ |
| **Demo 1** |                                                                                                                                            |              |
| 1          | ~~Izdvajanje strukturnih linija~~                                                                                                          | mali         |
| 2          | ~~Mreža: ispravljanje na 0°/90°, spajanje kolinearnih duži~~                                                                               | srednji      |
| 3          | ~~Mreža: pronalaženje spoljnog rama i podela~~                                                                                             | najveći      |
| 4          | ~~Mreža: ram + podele -> polja~~                                                                                                           | srednji      |
| 5          | ~~Orkestracija (`sketch-parser.ts`), poziv posle svakog poteza~~                                                                           | mali         |
| 6          | ~~Beautification prikaz~~                                                                                                                  | srednji (UI) |
| **Demo 2** |                                                                                                                                            |              |
| 7          | Anotacije po poljima: centar poteza → polje ili "van rama"                                                                                 | mali         |
| 8          | Otvaranje polja: ševroni (oštra temena), smer vrha (`>` `<` `Λ`), spajanje u otvaranje + šarke; konvencija na jednom mestu                 | srednji      |
| 9          | `WindowModel`: stablo + otvaranja + dimenzije; T-profil/štulp; glavno krilo kod štulpa (ono sa kipom); `null` dimenzije dok nisu unete     | srednji      |
| 10         | Validacija: upozorenja (štulp uz fiksno, jednostruka horizontalna, ručke na spoljnim stranama kod štulpa, nepoznat simbol, nema dimenzija) | mali         |
| 11         | UI: unos širine i visine (cm), panel sa modelom i upozorenjima, beautification simbola                                                     | srednji (UI) |
| 12         | Golden testovi za `WindowModel` na snimljenim skicama                                                                                      | mali         |
| opciono    | Klik na polje menja otvaranje                                                                                                              | mali (UI)    |

Otvorena pitanja za model (odlučuje se u koraku 9): dimenzije `null` dok nisu unete; `kind: 'pane'` umesto `'sash'` (fiksno staklo nije krilo).

Svesno odloženo posle Demo 2: prepoznavanje cifara ($P sa šablonima kao baseline, zatim CNN/ONNX za poređenje u radu), Web Worker (prepoznavanje traje par ms; kasnije se menja samo mesto poziva), $P za simbole (poređenje sa geometrijskim pravilom).

## Napomene za rad sa Claude-om

- Claude ne piše referentna rešenja za delove koje implementira korisnik (ni u chatu ni u alatima); samo testove, smernice i review.
- Bez komentara u kodu; objašnjenja idu u chat.
