# Fredagslotteriet

Nettside for fredagslotteriet i Bodø – med spillet «Hurtigbåten til Bodø».

- **Påmelding:** faste passasjerer med eget nummer (nr. 7 får lodd 7 og 70). Bekreft betaling – den som ikke har betalt når båten går, blir igjen på kaia.
- **Trekning:** Hurtigbåten til Bodø (hovedspillet) eller Avgangstavla (lyntrekning).
- **Skipsloggen:** historikk, vinnertavle og backup.

## Kjøre lokalt

Ren statisk side uten byggesteg. Åpne `index.html` i nettleseren, eller start en lokal server:

```bash
python -m http.server 5173
```

og gå til <http://localhost:5173>.

Alt lagres i nettleseren (localStorage). Bruk «Last ned backup» i skipsloggen jevnlig.
