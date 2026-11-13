# Fredagslotteriet

Nettside for fredagslotteriet i Bodø – med spillene «Hurtigbåten til Bodø», «Draugen» og «Keiservarden Grand Prix».

- **Påmelding:** den som tar imot betalingen, krysser av folk på en fast liste. Alle har lodd-nummer de har valgt selv (f.eks. 7 og 70), ett per lodd. Den som ikke er bekreftet betalt når båten går, blir igjen på kaia.
- **Trekning:** fire måter å trekke på:
  - Hurtigbåten til Bodø (hovedspillet)
  - Draugen (Lofotfisket i Vestfjorden)
  - Keiservarden Grand Prix (kuleløp med ekte fysikk ned til Bodø havn)
  - Avgangstavla (lyntrekning)

  Vinnerne trekkes alltid kryptografisk og låses i skipsloggen før spillet vises.

  Under Keiservarden GP følger du løpet som på TV: klokke, minikart med alle kulene, navnelapper på de tre fremste, luke bak lederen i tabellen, mellomtider og sakte film idet den første kula går i mål. Klikk på et navn i lista eller på en kule, så følger kameraet den.
- **Løypedesigner** (`designer.html`): bygg egne Keiservarden-løyper av ramper, vegger, hull, Glimt-hjul og Glimt-armer, vipper (med motor eller tyngde), luker, vind og ørn – og Saltstraumen, bagasjebånd, Lofotferga, Andøya-raketten, tunnel med ras, tørrfiskhjell, rein i veien, slaps og Sjefen med strålepistol. Ingen grenser på antall deler. Skrur du et Glimt-hjul eller en Glimt-arm opp over fart 5, slår den kulene til værs, og med «I takt» går flere hjul og armer likt fra en startvinkel du velger. Hold Alt mens du drar en del for å dra ut en kopi, og Shift for å få det rett: ramper og vegger legger seg vannrett, loddrett eller 45°, og deler flyttes rett bortover eller rett ned. Ctrl+klikk (eller Shift+dra i bakgrunnen) velger flere deler, og Ctrl+G grupperer dem. Ramper, vegger, TUT-bumpere og skilt kan kjøre på skinne – alene eller som gruppe – etter et program du lager selv: kjør til et sted på skinnen (myk, jevn eller «kast», som slenger kulene til værs), hopp dit med en gang (teleport), vent, og gjenta. Hvert steg kan få tilfeldig tid som trekkes på nytt hver runde. Løypa kan pyntes: egne farger på ramper, vegger, bumpere, skilt og spikerbrett, pynt (emoji som trær, hus, båter og skyer – også på skinne), fargede bakgrunnsfelt, og under «Utseende» himmel (natt, skumring, dag, midnattssol, storm), snø eller regn, nordlys, fjell, byen ved målet med eget navn og egen løypefarge. Pynt merkes ikke av kulene, så en godkjent løype forblir godkjent. Det gir heiser, stempler og utskytere. «Demo med alle delene» viser alt på én gang, og «Demo: heis og utskyter» viser skinnene. Testkjør med samme fysikk som spillet, godkjenn løypa (minst 45 % må komme i mål) og velg den i trekningen. Løyper kan deles som lenke.

  Nyere deler: trampoline, kaffe-boost (full fart i pilretningen), kontorvifta (blåser dit du peker den, også rett opp), svingdør (snurrer fritt når kulene dytter den), kantina (vaffel gjør kula stor og tung, salat liten og lett, vann vanlig igjen) og mellomtid (en målestrek som melder hvem som er først – kulene merker den ikke).

  Skinnene kan mer enn å gå rett fram: legg til punkt så banen går i knekk, velg myke svinger eller rundbane, og sett flere vogner etter hverandre på samme bane («＋ Vogn til» fordeler dem jevnt). Programmet har fire slags steg: kjør, vri (delene vrir seg rundt en bolt du kan flytte – hold Shift for å feste den i en ende), vent, og vent på kule (vogna står til noen går om bord). Slå på 🧲 Magnet, så blir kulene med plata når den kjører. Styrken velger du selv: 100 % holder til plata heller rundt 35°, og fra rundt 220 % holder den kulene selv opp ned. Du velger også hvordan den slipper – når plata heller for mye, i steg du velger (trykk på 🧲 i et steg for å slå den av der), eller etter et visst antall sekunder for hver kule. Trampoliner, kaffe, bagasjebånd og spikerbrett kan også kjøre på skinne. Under «På skinne» i delelista ligger ferdigbygde ting: heis, tippvogn, flipper, pendel, vindebru, pariserhjul, snuplata (snur seg opp ned med kulene og slipper dem) og slynga (snurrer og slenger kulene av gårde). «Demo: Fredagsparken» viser det nye i én løype.

  Eldre løyper og repriser kjører nøyaktig som før – alt det nye er valgfritt og finnes bare i løyper som bruker det.
- **Skipsloggen:** historikk, vinnertavle og backup.

## Kjøre lokalt

Ren statisk side uten byggesteg. Åpne `index.html` i nettleseren, eller start en lokal server:

```bash
python -m http.server 5173
```

og gå til <http://localhost:5173>.

Alt lagres i nettleseren (localStorage). Bruk «Last ned backup» i skipsloggen jevnlig.
