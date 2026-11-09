# Fredagslotteriet

Nettside for fredagslotteriet i Bodø – med spillene «Hurtigbåten til Bodø», «Draugen» og «Keiservarden Grand Prix».

- **Påmelding:** den som tar imot betalingen, krysser av folk på en fast liste. Alle har lodd-nummer de har valgt selv (f.eks. 7 og 70), ett per lodd. Den som ikke er bekreftet betalt når båten går, blir igjen på kaia.
- **Trekning:** fire måter å trekke på:
  - Hurtigbåten til Bodø (hovedspillet)
  - Draugen (Lofotfisket i Vestfjorden)
  - Keiservarden Grand Prix (kuleløp med ekte fysikk ned til Bodø havn)
  - Avgangstavla (lyntrekning)

  Vinnerne trekkes alltid kryptografisk og låses i skipsloggen før spillet vises.
- **Løypedesigner** (`designer.html`): bygg egne Keiservarden-løyper av ramper, vegger, hull, Glimt-hjul og Glimt-armer, vipper (med motor eller tyngde), luker, vind og ørn – og Saltstraumen, bagasjebånd, Lofotferga, Andøya-raketten, tunnel med ras, tørrfiskhjell, rein i veien, slaps og Sjefen med strålepistol. Ingen grenser på antall deler. Skrur du et Glimt-hjul eller en Glimt-arm opp over fart 5, slår den kulene til værs, og med «I takt» går flere hjul og armer likt fra en startvinkel du velger. Hold Alt mens du drar en del for å dra ut en kopi. «Demo med alle delene» viser alt på én gang. Testkjør med samme fysikk som spillet, godkjenn løypa (minst 45 % må komme i mål) og velg den i trekningen. Løyper kan deles som lenke.
- **Skipsloggen:** historikk, vinnertavle og backup.

## Kjøre lokalt

Ren statisk side uten byggesteg. Åpne `index.html` i nettleseren, eller start en lokal server:

```bash
python -m http.server 5173
```

og gå til <http://localhost:5173>.

Alt lagres i nettleseren (localStorage). Bruk «Last ned backup» i skipsloggen jevnlig.
