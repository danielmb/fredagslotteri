# Fredagslotteriet

Nettside for fredagslotteriet i Bodø – med spillene «Hurtigbåten til Bodø», «Draugen» og «Keiservarden Grand Prix».

- **Påmelding:** den som tar imot betalingen, krysser av folk på en fast liste. Alle har lodd-nummer de har valgt selv (f.eks. 7 og 70), ett per lodd. Den som ikke er bekreftet betalt når båten går, blir igjen på kaia.
- **Trekning:** fire måter å trekke på:
  - Hurtigbåten til Bodø (hovedspillet)
  - Draugen (Lofotfisket i Vestfjorden)
  - Keiservarden Grand Prix (kuleløp med ekte fysikk ned til Bodø havn)
  - Avgangstavla (lyntrekning)

  Vinnerne trekkes alltid kryptografisk og låses i skipsloggen før spillet vises.
- **Løypedesigner** (`designer.html`): bygg egne Keiservarden-løyper av ramper, vegger, hull, Glimt-hjul, vipper, luker, vind og ørn. Testkjør med samme fysikk som spillet, godkjenn løypa (minst 45 % må komme i mål) og velg den i trekningen. Løyper kan deles som lenke.
- **Skipsloggen:** historikk, vinnertavle og backup.

## Kjøre lokalt

Ren statisk side uten byggesteg. Åpne `index.html` i nettleseren, eller start en lokal server:

```bash
python -m http.server 5173
```

og gå til <http://localhost:5173>.

Alt lagres i nettleseren (localStorage). Bruk «Last ned backup» i skipsloggen jevnlig.
