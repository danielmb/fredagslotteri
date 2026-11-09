# Fredagslotteriet

Nettside for fredagslotteriet i Bodø – med spillet «Hurtigbåten til Bodø».

- **Påmelding:** den som tar imot betalingen, krysser av folk på en fast liste. Alle har lodd-nummer de har valgt selv (f.eks. 7 og 70), ett per lodd. Den som ikke er bekreftet betalt når båten går, blir igjen på kaia.
- **Trekning:** Hurtigbåten til Bodø (hovedspillet) eller Avgangstavla (lyntrekning).
- **Skipsloggen:** historikk, vinnertavle og backup.

## Kjøre lokalt

Ren statisk side uten byggesteg. Åpne `index.html` i nettleseren, eller start en lokal server:

```bash
python -m http.server 5173
```

og gå til <http://localhost:5173>.

Alt lagres i nettleseren (localStorage). Bruk «Last ned backup» i skipsloggen jevnlig.
