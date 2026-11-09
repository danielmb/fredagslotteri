/* Fredagslotteriet – farer underveis, ruten og selve trekningen */
(function () {
  'use strict';
  const FL = window.FL;
  const u = FL.u;

  /* Ruta følger Hurtigrutas nordgående vei: Sandnessjøen → Nesna → (Polarsirkelen) → Ørnes → Bodø */
  const ROUTE = [
    { id: 'ssj', name: 'Sandnessjøen', type: 'start', at: 0 },
    { id: 'nesna', name: 'Nesna', type: 'port', at: 0.25 },
    { id: 'polar', name: 'Polarsirkelen', type: 'marker', at: 0.47 },
    { id: 'ornes', name: 'Ørnes', type: 'port', at: 0.69 },
    { id: 'bodo', name: 'Bodø', type: 'end', at: 1 },
  ];
  const AT = Object.fromEntries(ROUTE.map((r) => [r.id, r.at]));
  const PORT_NAME = { nesna: 'Nesna', ornes: 'Ørnes' };
  const PLACE_LABEL = { sea: 'Til sjøs', nesna: 'Kaia i Nesna', ornes: 'Kaia i Ørnes', polar: 'Polarsirkelen', final: 'Innseilingen til Bodø', vest: 'Vestfjorden', boss: 'Stormens øye', kei: 'Keiservarden' };

  /* t = standardtekster, p = tekster ved kai ({p} = stedsnavn), g = flere ofre samtidig */
  const EVENTS = {
    orna: {
      title: 'Ørna!', name: 'Ørna tar personen', icon: '🦅', folk: true, anim: 'eagle', color: 'rgba(201,140,70,.28)', ec: '#f1d9b6',
      desc: 'Havørna i Saltstraumen er sulten og har null respekt for lotterier.',
      t: ['{n} sto på soldekket med en vaffel. Ørna ville ha vaffelen. Ørna tok alt.',
        'En havørn fra Saltstraumen så sitt snitt. {n} ble sist sett på vei mot Landegode.',
        '{n} vinket til en havørn. Havørna tolket det som en invitasjon.'],
    },
    tut: {
      title: 'Hurtigruta tutet', name: 'Hurtigruta tutet', icon: '📯', folk: true, anim: 'horn', color: 'rgba(238,74,47,.25)', ec: '#f6c9bd',
      desc: 'Hurtigruta hilser alltid. Ikke alle hjerter tåler det.',
      t: ['Hurtigruta tutet idet den passerte. {n} skvatt så mye at hjertet tok helg.',
        'TUUUUUT! {n} hoppet to meter rett opp og landet i det hinsidige.',
        '{n} sto rett ved rekka da Hurtigruta hilste. Kardiologen kaller det «helt forventet».'],
    },
    noro: {
      title: 'Norovirus!', name: 'Norovirus', icon: '🦠', folk: true, anim: 'virus', group: 4, color: 'rgba(111,191,115,.28)', ec: '#d6efc4',
      desc: 'Rekesmørbrødet i kiosken hadde en fortid.',
      t: ['{n} spiste rekesmørbrødet fra kiosken. Tilbringer resten av turen på do.',
        '{n} fikk norovirus av gelenderet. Er nå i karantene på akterdekk.'],
      g: ['Norovirus-utbrudd i salongen! {n} kom seg aldri ut av toalettet.',
        'Rekesmørbrødet i kiosken var fra 2019. {n} er satt i karantene.'],
    },
    kokken: {
      title: 'Kjærlighet i byssa', name: 'Hemmelig forhold med kokken', icon: '👨‍🍳', folk: true, anim: 'chef', color: 'rgba(223,79,134,.25)', ec: '#f5cddd',
      desc: 'Det som skjer i byssa, blir i byssa. Inkludert passasjeren.',
      t: ['{n} innledet et hemmelig forhold med kokken og rakk ikke å gå i land. Lever nå lykkelig i byssa.',
        '{n} og kokken fant tonen over en fiskesuppe. Ingen har sett dem siden.',
        '{n} ble så forelsket i kokken at hen glemte både lodd, båt og fredag.'],
    },
    trappa: {
      title: 'Datt ned trappa', name: 'Datt ned trappa', icon: '🪜', folk: true, anim: 'stairs', color: 'rgba(185,128,42,.25)', ec: '#ecd9b5',
      desc: 'Det står «Hold i rekkverket» på tre språk.',
      t: ['{n} tok trappa ned til salongen i én bevegelse. Ikke med vilje.',
        '{n} snublet i trappa, rullet gjennom kiosken og ut akterdøra.',
        'Det står «Hold i rekkverket» på tre språk. {n} leste ingen av dem.'],
    },
    overbord: {
      title: 'Mann over bord!', name: 'Datt ut av båten', icon: '💦', folk: true, anim: 'overboard', color: 'rgba(79,125,255,.25)', ec: '#cdd9f7',
      desc: 'Rekka er der av en grunn.',
      t: ['{n} lente seg ut for å ta bilde av nordlyset. Bildet ble bra. {n} ble borte.',
        '{n} skulle «bare sjekke noe» på akterdekk. PLASK.',
        'En bølge, en glatt dørk og {n}. I den rekkefølgen.'],
    },
    drukning: {
      title: 'Blubb blubb', name: 'Drukning', icon: '🌊', folk: true, anim: 'drown', color: 'rgba(21,151,189,.28)', ec: '#c4e6ef',
      desc: 'Havet ved Polarsirkelen holder seks grader. Hele året.',
      t: ['{n} ville sjekke hvor kaldt vannet var. Svar: 6 grader. Blubb.',
        '{n} prøvde å svømme det siste stykket for å spare tid. Det sparte ikke tid.',
        '{n} trodde redningsvesten var pynt. Blubb blubb.'],
    },
    full: {
      title: 'Full', name: 'Full', icon: '🥴', folk: true, anim: 'drunk', group: 3, color: 'rgba(148,102,255,.25)', ec: '#ddd2f7',
      desc: 'Vinen er urelatert. Det er ikke rusen.',
      t: ['{n} feiret seieren litt for tidlig og danset over rekka.',
        '{n} spurte etter vin i kiosken, fikk vite at vinen er urelatert, og drakk alt annet. Gikk over bord i protest.'],
      p: ['{n} sang Halvdan Sivertsen så høyt på soldekket at mannskapet satte hen i land i {p}.',
        '{n} spurte etter vin i kiosken, fikk vite at vinen er urelatert, og drakk alt annet. Satt i land i {p}.',
        '{n} skulle ta «en liten en» mot sjøsyken. Så en til. Ble båret i land i {p}.'],
      g: ['{n} startet nachspiel i salongen klokka ti på formiddagen. Alle ble satt i land i {p}.'],
    },
    ornes: {
      title: 'Feil stopp', name: 'Gikk av på feil plass (Ørnes)', icon: '📍', folk: true, anim: 'ashore', group: 3, color: 'rgba(246,189,71,.25)', ec: '#f5e2b0',
      desc: 'Ørnes er et fint sted. Men det er ikke Bodø.',
      t: ['{n} hørte «neste stopp: …nes» og gikk av. Det var Ørnes. Ørnes er fint. Ørnes er ikke Bodø.',
        '{n} gikk i land i Ørnes for å strekke på beina. Båten ventet ikke.',
        '{n} så skiltet «Ørnes» og tenkte «nesten Bodø». Det var det ikke.'],
      g: ['{n} gikk av i Ørnes sammen. De har startet et nytt liv der.'],
    },
    svolvaer: {
      title: 'Våknet i Svolvær', name: 'Sov på Hurtigruta', icon: '😴', folk: true, anim: 'sleep', color: 'rgba(108,124,242,.25)', ec: '#d4d8f7',
      desc: 'Hurtigruta stopper ikke i Bodø for alltid. Neste stopp: Svolvær.',
      t: ['{n} gikk om bord på Hurtigruta for å låne doen, sovnet i en lugar og våknet i Svolvær.',
        '{n} tok seg en blund på feil båt. Våknet i Svolvær med en tørrfisk i fanget.',
        '{n} byttet til Hurtigruta for å få bedre kaffe. Sovnet. Er nå i Lofoten.'],
    },
    feilrute: {
      title: 'Feil rute', name: 'Tok feil rute', icon: '🔀', folk: true, anim: 'wrongboat', group: 3, color: 'rgba(32,169,142,.25)', ec: '#c6eadf',
      desc: 'Det går mange båter i Nordland. Bare én av dem til Bodø.',
      t: ['En annen hurtigbåt kom forbi, og {n} hoppet over for å «ta en snarvei». Neste stopp: Træna.',
        '{n} fulgte Google Maps. Google Maps sa Moskenes.'],
      p: ['{n} gikk på feil båt i {p} og er nå på vei til Træna. Det blir en lang helg.',
        '{n} fulgte Google Maps fra {p}. Google Maps sa Moskenes.',
        '{n} tok bussen fra {p} i stedet. Den står fortsatt i kø ved Saltstraumen bru.'],
      g: ['{n} fulgte etter hverandre om bord på feil båt i {p}. Neste stopp: Træna.'],
    },
    sjosyk: {
      title: 'Sjøsyk', name: 'Sjøsyk', icon: '🤢', folk: true, anim: 'seasick', color: 'rgba(79,174,62,.25)', ec: '#d3ecc2',
      desc: 'Bølgehøyde: 1,2 meter. Moral: 0.',
      t: ['{n} ble grønn i ansiktet ved første bølge og har ikke sett opp siden.',
        'Bølgehøyde: 1,2 meter. {n}: «Aldri. Mer. Båt.»'],
      p: ['{n} ble så sjøsyk at hen gikk i land i {p} og nektet å gå om bord igjen.',
        '{n} kysset kaia i {p}. Bokstavelig talt. Blir der.'],
    },
    maake: {
      title: 'Måka!', name: 'Måka stjal loddet', icon: '🐦', folk: false, anim: 'gull', color: 'rgba(200,215,230,.18)', ec: '#e3e9ef',
      desc: 'Uten lodd, ingen premie. Det står i reglene (nå).',
      t: ['En måke nappet loddet ut av hånda til {n}. Uten lodd, ingen premie.',
        '{n} delte reka si med en måke. Måka ville ha resten også. Og loddet.'],
    },
    nordlys: {
      title: 'Nordlyset', name: 'Nordlyset', icon: '🌌', folk: false, anim: 'aurora', color: 'rgba(94,242,181,.22)', ec: '#c8f5e2',
      desc: 'Det danser. Du danser. Rekka danser ikke.',
      t: ['{n} ble så trollbundet av nordlyset at hen svevde rett av gårde.',
        '{n} prøvde å ta bilde av nordlyset med blits. Nordlyset tok igjen.'],
    },
    vind: {
      title: 'Bodø-vind', name: 'Bodø-vind', icon: '🌬️', folk: false, anim: 'wind', group: 3, color: 'rgba(160,190,220,.2)', ec: '#dbe5ee',
      desc: '28 m/s fra nordvest. Helt vanlig fredag.',
      t: ['Vindkast på 28 m/s. {n} ble blåst av dekk. Helt vanlig fredag i Bodø.',
        '{n} åpnet døra til soldekket. Det var en feil.'],
      g: ['{n} åpnet døra til soldekket samtidig. Det var en feil.',
        'Vindkast på 28 m/s. {n} ble blåst av dekk. Helt vanlig fredag i Bodø.'],
    },
    spekkhogger: {
      title: 'Spekkhoggere!', name: 'Spekkhoggere', icon: '🐋', folk: false, anim: 'orca', group: 3, color: 'rgba(80,110,140,.25)', ec: '#d0dae4',
      desc: 'Alle løper til samme side. Båten krenger. Noen faller.',
      t: ['Spekkhoggere på styrbord! Alle løp til samme side, og {n} løp litt for langt.'],
      g: ['Spekkhoggere! Båten krenget, og {n} gled rett ut i havet.'],
    },
    polar: {
      title: 'Polarsirkeldåp', name: 'Polarsirkeldåp', icon: '🧊', folk: false, anim: 'polar', color: 'rgba(159,214,255,.22)', ec: '#d3ecfb',
      desc: 'Isvann nedover ryggen. Tradisjon er tradisjon.',
      t: ['Polarsirkeldåp! {n} fikk en øse isvann nedover ryggen og frøs fast til et isflak.',
        '{n} krysset polarsirkelen, fikk dåpen og kuldesjokk. Driver nå sørover på et isflak.'],
    },
    glimt: {
      title: 'Kampdag!', name: 'Glimt-kamp', icon: '💛', folk: false, anim: 'glimt', color: 'rgba(255,212,0,.22)', ec: '#fbeaa0',
      desc: 'Ingenting slår avspark på Aspmyra.',
      t: ['{n} hørte at Glimt spilte på Aspmyra og svømte i land for å rekke avspark.',
        '{n} hoppet over bord i gult skjerf. Rakk neppe avspark, men ånden var der.'],
    },
  };
  /* ---------- Draugen: farene i Vestfjorden ---------- */
  Object.assign(EVENTS, {
    kraken: {
      game: 'draugen', title: 'KRAKEN!', name: 'Kraken', icon: '🐙', color: 'rgba(160,60,110,.3)', ec: '#ecc5d8',
      desc: 'Åtte armer, null tålmodighet.',
      t: ['En tentakkel tykk som en lyktestolpe løftet {n} til værs, kikket nøye – og tok hen med ned.',
        'Kraken var sulten. {n} var nærmest.',
        'Noe stort rørte seg under båten til {n}. Så var det bare bobler.'],
      g: ['Krakens armer skjøt opp av dypet og tok {n} på én gang.'],
    },
    draugen: {
      game: 'draugen', title: 'Draugens skrik', name: 'Draugen', icon: '👻', color: 'rgba(150,230,190,.18)', ec: '#d3efe2',
      desc: 'Hører du skriket hans, kommer du ikke hjem. Sier de i Nordland.',
      t: ['Draugen gled forbi i halvbåten sin og skrek. {n} hørte det. Det var det.',
        'Lyset i tåka var ikke et fyr. Det var Draugen, og skriket var for {n}.',
        'Den hodeløse fiskeren pekte på {n}. Havet gjorde resten.'],
    },
    malstrom: {
      game: 'draugen', title: 'Malstrømmen!', name: 'Moskstraumen', icon: '🌀', color: 'rgba(60,140,200,.25)', ec: '#c9def0',
      desc: 'Verdens mest berømte malstrøm. Edgar Allan Poe skrev om den. Han tok ikke med Frode.',
      t: ['Moskstraumen åpnet seg rett under {n}. Edgar Allan Poe skrev om denne malstrømmen. Han glemte å nevne {n}.'],
      g: ['Moskstraumen åpnet seg midt i flåten og svelget {n}. Poe skrev om denne. Han tok ikke med dem.'],
    },
    blekk: {
      game: 'draugen', title: 'Blekksvart', name: 'Krakens blekk', icon: '🖤', color: 'rgba(40,40,60,.4)', ec: '#d9d9e3',
      desc: 'Når det blir lyst igjen, mangler det alltid noen.',
      t: ['Kraken sprutet blekk. Da det ble lyst igjen, var {n} borte. Ingen vet hva som skjedde.'],
      g: ['Kraken sprutet blekk over hele flåten. Da det ble lyst igjen, var {n} borte. Ingen vet hva som skjedde.'],
    },
    huldra: {
      game: 'draugen', title: 'Huldra', name: 'Huldra på stranda', icon: '🧝‍♀️', color: 'rgba(223,79,134,.22)', ec: '#f5cddd',
      desc: 'Vakker på avstand. Kuhale på nært hold.',
      t: ['{n} så Huldra på stranda og rodde rett i land. Lever nå lykkelig i en hule på Værøy.',
        '{n} fikk øye på Huldra. Oppdaget kuhalen litt for sent.'],
    },
    krabbe: {
      game: 'draugen', title: 'Kongekrabben', name: 'Kongekrabben', icon: '🦀', color: 'rgba(220,70,50,.25)', ec: '#f4c9bf',
      desc: 'Innført art, utført passasjer.',
      t: ['En kongekrabbe på størrelse med en Volvo knep hull i båten til {n}. Innført art, utført passasjer.',
        '{n} prøvde å fange kongekrabbe med bare hendene. Kongekrabben fanget {n}.'],
    },
    lyn: {
      game: 'draugen', title: 'BRAK!', name: 'Lynet', icon: '⚡', color: 'rgba(246,215,90,.25)', ec: '#f8e7a8',
      desc: 'Den høyeste masta tar alltid støyten.',
      t: ['Lynet slo ned i masta til {n}. Tor hadde visst noe uoppgjort med {n}.',
        'BRAK! {n} ble truffet av lynet og lyser fortsatt litt i mørket.'],
    },
    troll: {
      game: 'draugen', title: 'Trollet kastet!', name: 'Trollet på Vågakallen', icon: '🪨', color: 'rgba(130,140,110,.25)', ec: '#dfe3d2',
      desc: 'Vågakallen er et fjell. Og et troll. Og han kaster godt.',
      t: ['Trollet på Vågakallen kastet en kampestein. Bølgen veltet {n}.'],
      g: ['Trollet på Vågakallen kastet en kampestein midt i flåten. Bølgen tok {n}.'],
    },
    vaffellukt: {
      game: 'draugen', title: 'Vaffellukt!', name: 'Vaffellukt fra Henningsvær', icon: '🧇', color: 'rgba(230,170,70,.25)', ec: '#f5ddb0',
      desc: 'Ingen kan motstå nystekte vafler. Heller ikke kompasset.',
      t: ['{n} kjente lukta av nystekte vafler og rodde rett dit. Feil vei, men god stemning.',
        'Vaffellukt! {n} snudde båten og forsvant. Ble sist sett med syltetøy i skjegget.'],
    },
    volleyball: {
      game: 'draugen', title: 'Spekkhogger-volleyball', name: 'Spekkhogger-volleyball', icon: '🐋', color: 'rgba(80,110,140,.28)', ec: '#d0dae4',
      desc: 'Spekkhoggerne i Vestfjorden trenger noe å leke med om natta.',
      t: ['To spekkhoggere spilte volleyball med båten til {n}. Siste serve gikk i havet.',
        '{n} ble ballen i spekkhoggernes nattlige volleyballturnering. Tapte 0–1.'],
    },
    hurtigrutebolge: {
      game: 'draugen', title: 'Hurtigruta suste forbi', name: 'Hurtigrutebølgen', icon: '🌊', color: 'rgba(21,151,189,.25)', ec: '#c4e6ef',
      desc: 'Hurtigruta krysser Vestfjorden. Hekkbølgen gjør det også.',
      t: ['Hurtigruta suste forbi uten å se seg for. Hekkbølgen veltet {n}.'],
      g: ['Hurtigruta suste forbi. Hekkbølgen veltet {n} på én gang.'],
    },
    amulett: {
      game: 'draugen', title: 'Draugens tann!', name: 'Draugens tann', icon: '🦷', color: 'rgba(246,189,71,.25)', ec: '#f5e2b0',
      desc: 'Går til den som var nærmest å vinne sist. Redder deg én gang.',
      t: ['Kraken grep båten til {n} – men Draugens tann lyste opp, og Kraken slapp i skrekk. Reddet! Denne gangen.'],
    },
  });
  /* ---------- Keiservarden Grand Prix: farer i løypa ---------- */
  Object.assign(EVENTS, {
    k_vind: { game: 'keiser', title: 'Blåste ned i Juvet', name: 'Bodø-vind og Juvet', icon: '🌬️', color: 'rgba(160,190,220,.22)', ec: '#dbe5ee', desc: 'Et kraftig vindkast midt i hoppet. Juvet tar resten.', t: ['{n} fikk motvind midt i hoppet og blåste ned i Juvet.'] },
    k_ornes: { game: 'keiser', title: 'Feil avkjøring', name: 'Ørnes-luka', icon: '📍', color: 'rgba(246,189,71,.22)', ec: '#f5e2b0', desc: 'Snarveien har en luke. Luka går til Ørnes.', t: ['{n} tok snarveien, falt gjennom Ørnes-luka og havnet i Ørnes.'] },
    k_orna: { game: 'keiser', title: 'Ørna tok kula', name: 'Ørna jakter', icon: '🦅', color: 'rgba(201,140,70,.28)', ec: '#f1d9b6', desc: 'Havørna er glad i blanke ting. Kuler er blanke.', t: ['Ørna stupte ned og tok {n}. Den ser vi aldri igjen.'] },
    k_glimt: { game: 'keiser', title: 'Slått ut av Glimt-hjulet', name: 'Glimt-hjulet', icon: '💛', color: 'rgba(255,212,0,.2)', ec: '#fbeaa0', desc: 'Gult, svart og spinner som en kontring.', t: ['Glimt-hjulet slo {n} rett ut av løypa.'] },
    k_kant: { game: 'keiser', title: 'Utfor kanten', name: 'Kanten', icon: '⛰️', color: 'rgba(130,140,160,.22)', ec: '#dde2ea', desc: 'Keiservarden er 366 meter høy. Kanten er bratt.', t: ['{n} spratt utfor kanten. Det er langt ned.'] },
    k_fast: { game: 'keiser', title: 'Satt fast', name: 'Snøfonna', icon: '❄️', color: 'rgba(200,230,255,.2)', ec: '#e3f1fb', desc: 'Noen kommer seg aldri videre fra en snøfonn.', t: ['{n} satt fast i ei snøfonn og kom aldri ned.'] },
    k_hull: { game: 'keiser', title: 'Ned i hullet', name: 'Hull i egne løyper', icon: '🕳️', color: 'rgba(110,93,76,.3)', ec: '#e8dccb', desc: 'Løypedesignerens hull. Hvert hull har et navn, og navnet havner i loggen.', t: ['{n} falt ned i et hull i løypa.'], p: ['{n} falt ned i {p}.'] },
    k_salt: { game: 'keiser', title: 'Tatt av Saltstraumen', name: 'Saltstraumen', icon: '🌀', color: 'rgba(40,150,190,.22)', ec: '#cdeaf5', desc: 'Verdens sterkeste malstrøm ligger en halvtimes kjøring fra Bodø. Den spinner deg rundt og spytter deg ut – hvis du er heldig.', t: ['{n} ble tatt av Saltstraumen.'] },
    k_ferje: { game: 'keiser', title: 'Rakk ikke ferga', name: 'Ferga til Lofoten', icon: '⛴️', color: 'rgba(60,110,160,.22)', ec: '#d6e6f5', desc: 'Bommen går ned, ferga går. Den som ikke rakk den, havner i havet.', t: ['{n} rakk ikke ferga og havnet i havet.'] },
    k_rakett: { game: 'keiser', title: 'Skutt ut i verdensrommet', name: 'Andøya-raketten', icon: '🚀', color: 'rgba(255,154,122,.22)', ec: '#fbd9cc', desc: 'Andøya skyter opp raketter på ordentlig. Denne er litt for sterk.', t: ['{n} ble skutt rett ut i verdensrommet fra Andøya.'] },
    k_fisk: { game: 'keiser', title: 'Slått ut av tørrfisken', name: 'Tørrfiskhjellet', icon: '🐟', color: 'rgba(201,180,143,.25)', ec: '#efe3cc', desc: 'Lofot-torsk som har hengt i vinden hele vinteren. Hard som en planke.', t: ['{n} fikk en tørrfisk i trynet og forsvant ut av løypa.'] },
  });
  const ORDER_KEISER = ['k_vind', 'k_ornes', 'k_orna', 'k_glimt', 'k_kant', 'k_fast', 'k_hull', 'k_salt', 'k_ferje', 'k_rakett', 'k_fisk'];
  const ORDER_DRAUGEN = ['kraken', 'draugen', 'malstrom', 'blekk', 'huldra', 'krabbe', 'lyn', 'troll', 'vaffellukt', 'volleyball', 'hurtigrutebolge', 'amulett'];
  const D_SINGLE = ['kraken', 'draugen', 'huldra', 'krabbe', 'lyn', 'vaffellukt', 'volleyball'];
  const D_GROUP = { malstrom: 5, blekk: 4, troll: 3, hurtigrutebolge: 4, kraken: 3 };
  const D_BOSS = ['kraken', 'lyn', 'volleyball', 'krabbe'];

  Object.keys(EVENTS).forEach((k) => { EVENTS[k].id = k; });
  const ORDER = ['orna', 'tut', 'noro', 'kokken', 'trappa', 'overbord', 'drukning', 'full', 'ornes', 'svolvaer', 'feilrute', 'sjosyk', 'maake', 'nordlys', 'vind', 'spekkhogger', 'polar', 'glimt'];

  const CORE_SEA = ['orna', 'tut', 'noro', 'kokken', 'trappa', 'overbord', 'drukning', 'full', 'svolvaer', 'sjosyk', 'feilrute'];
  const BONUS_SEA = ['maake', 'nordlys', 'vind', 'spekkhogger'];
  const GROUP_SEA = ['noro', 'vind', 'spekkhogger'];
  const SHIP_EVENTS = ['tut', 'svolvaer'];

  /* ---------- Trekning ---------- */
  function createDraw(people, settings, opts = {}) {
    const tickets = [];
    // lodd-nummer: det hver passasjer har valgt selv, ett per lodd (f.eks. 7 og 70)
    people.forEach((p) => { const nums = p.nums || []; for (let i = 0; i < p.tickets; i++) tickets.push({ no: tickets.length + 1, name: u.cleanName(p.name), k: u.normName(p.name), label: nums[i] > 0 ? String(nums[i]) : '' }); });
    tickets.forEach((t) => { if (!t.label) t.label = u.pad(t.no); });
    const order = u.shuffle(tickets.map((t) => t.no)); // kryptografisk stokking – dette ER trekningen
    const uniq = settings.uniqueWinners !== false;
    const owners = new Set(tickets.map((t) => t.k)).size;
    const W = Math.min(settings.winners, uniq ? owners : tickets.length);
    const winners = [];
    const won = new Set();
    for (const no of order) {
      if (winners.length >= W) break;
      const t = tickets[no - 1];
      if (uniq && won.has(t.k)) continue;
      winners.push(no);
      won.add(t.k);
    }
    const rest = order.filter((no) => !winners.includes(no));
    const contenders = rest.filter((no) => !won.has(tickets[no - 1].k));
    const extra = rest.filter((no) => won.has(tickets[no - 1].k));
    const elim = contenders.slice().reverse(); // sist i stokken ryker først
    // vinneres ekstra lodd ryker et tilfeldig sted, men aldri i den dramatiske slutten
    extra.forEach((no) => { const max = Math.max(0, elim.length - 3); elim.splice(u.randInt(max + 1), 0, no); });
    const seed = u.randInt(0x7fffffff);
    // Draugens tann: den som var nærmest å vinne sist får et amulett (ren teater – vinnerne er allerede trukket)
    let amulet = null;
    if (opts.game === 'draugen' && opts.amuletName) {
      const t = tickets.find((x) => x.k === u.normName(opts.amuletName));
      if (t) amulet = { name: t.name, no: t.no };
    }
    // Keiservarden fyller inn hendelsene fra fysikk-simuleringen etterpå
    const beats = opts.game === 'draugen' ? buildDraugenBeats(elim, u.mulberry32(seed), amulet && amulet.no) : opts.game === 'keiser' ? [] : buildBeats(elim, u.mulberry32(seed));
    return {
      id: u.uid('d'), date: new Date().toISOString(), game: opts.game || 'hurtigbat', demo: !!opts.demo,
      price: settings.price, winnersCount: winners.length, pot: tickets.length * settings.price,
      people: people.map((p) => ({ name: u.cleanName(p.name), nums: (p.nums || []).slice(0, p.tickets), tickets: p.tickets })),
      tickets: tickets.map((t) => ({ no: t.no, name: t.name, label: t.label })),
      leftBehind: (opts.leftBehind || []).map((p) => ({ name: u.cleanName(p.name), nums: (p.nums || []).filter(Boolean) })),
      amulet, winners, elim, seed, beats,
    };
  }

  /* Manus for Draugen: hendelser fordelt over Vestfjorden, sjefsfase til slutt, siste offer tas av Draugen */
  function buildDraugenBeats(elim, rnd, amuletNo) {
    const E = elim.length;
    const ri = (n) => Math.floor(rnd() * n);
    const beats = [];
    if (E) {
      let B = E <= 14 ? E : Math.round(14 + (E - 14) * 0.4);
      B = Math.min(B, 28);
      if (E >= 8 && B === E) B = E - 1;
      const a0 = 0.07, a1 = 0.9, span = (a1 - a0) / B;
      const slots = Array.from({ length: B }, (_, i) => ({ at: a0 + span * (i + 0.5) + (rnd() - 0.5) * span * 0.5, size: 1 }));
      const boss = Math.min(4, B);
      slots.forEach((s, i) => { s.boss = i >= B - boss; s.last = i === B - 1; });
      const groupable = slots.filter((s) => !s.boss);
      let extra = E - B, guard = 0;
      while (extra > 0 && groupable.length && guard++ < 5000) { const s = groupable[ri(groupable.length)]; if (s.size < (guard > 2000 ? 8 : 5)) { s.size++; extra--; } }
      if (extra > 0) slots[0].size += extra;
      let bag = [], prev = null, vi = 0, draugens = 0;
      const refill = () => { bag = u.shuffle(D_SINGLE, ri); };
      refill();
      const fromBag = (ok) => { for (let k = 0; k < 2; k++) { const i = bag.findIndex(ok); if (i >= 0) return bag.splice(i, 1)[0]; refill(); } return 'kraken'; };
      const bossOrder = u.shuffle(D_BOSS, ri);
      slots.forEach((s, i) => {
        let ev;
        if (s.last) ev = 'draugen';
        else if (s.boss) ev = bossOrder[(i - (B - boss)) % bossOrder.length];
        else if (s.size > 1) { const c = Object.keys(D_GROUP).filter((e) => D_GROUP[e] >= s.size && e !== prev); ev = c.length ? c[ri(c.length)] : 'malstrom'; }
        else ev = fromBag((e) => e !== prev && !(e === 'draugen' && draugens >= 2));
        if (ev === 'draugen') draugens++;
        prev = ev;
        const v = elim.slice(vi, vi + s.size);
        vi += s.size;
        beats.push({ at: +s.at.toFixed(4), place: s.boss ? 'boss' : 'vest', ev, v, t: ri(6) });
      });
    }
    if (amuletNo) {
      const j = beats.findIndex((b) => b.v.includes(amuletNo));
      const limit = j >= 0 ? j : Math.max(1, Math.floor(beats.length * 0.7));
      const k = limit > 0 ? ri(limit + 1) : 0;
      const before = beats[k - 1] ? beats[k - 1].at : 0.03;
      const after = beats[k] ? beats[k].at : 0.92;
      beats.splice(k, 0, { at: +((before + after) / 2).toFixed(4), place: 'vest', ev: 'amulett', v: [amuletNo], t: 0, save: true });
    }
    return beats.filter((b) => b.v.length);
  }

  function buildBeats(elim, rnd) {
    const E = elim.length;
    if (!E) return [];
    const ri = (n) => Math.floor(rnd() * n);
    let B = E <= 14 ? E : Math.round(14 + (E - 14) * 0.4);
    B = Math.min(B, 28);
    if (E >= 8 && B === E) B = E - 1;

    // spesielle steder
    const special = [];
    if (B >= 2) special.push({ place: 'ornes', at: AT.ornes, ord: 0 });
    if (B >= 4) special.push({ place: 'nesna', at: AT.nesna, ord: 0 });
    if (B >= 6) special.push({ place: 'polar', at: AT.polar + 0.012, ord: 0 });
    if (B >= 14) special.push({ place: 'ornes', at: AT.ornes, ord: 1 });
    if (B >= 19) special.push({ place: 'nesna', at: AT.nesna, ord: 1 });
    const nSea = B - special.length;

    // fordel sjø-hendelser på etappene (største rest)
    const anchors = [0, AT.nesna, AT.polar, AT.ornes, 1];
    const m = 0.045;
    const segs = [];
    for (let i = 0; i < anchors.length - 1; i++) segs.push({ a: anchors[i] + (i === 0 ? 0.06 : m), b: anchors[i + 1] - (i === anchors.length - 2 ? 0.11 : m) });
    const total = segs.reduce((s, g) => s + (g.b - g.a), 0);
    const quota = segs.map((g) => (nSea * (g.b - g.a)) / total);
    const alloc = quota.map(Math.floor);
    let left = nSea - alloc.reduce((s, x) => s + x, 0);
    quota.map((q, i) => ({ i, r: q - Math.floor(q) })).sort((x, y) => y.r - x.r).forEach((x) => { if (left > 0) { alloc[x.i]++; left--; } });
    const slots = special.slice();
    segs.forEach((g, i) => {
      const k = alloc[i];
      for (let j = 0; j < k; j++) {
        const span = (g.b - g.a) / k;
        const at = g.a + span * (j + 0.5) + (rnd() - 0.5) * span * 0.45;
        slots.push({ place: 'sea', at, ord: 0 });
      }
    });
    slots.sort((x, y) => x.at - y.at || x.ord - y.ord);
    slots.forEach((s, i) => { s.size = 1; s.last = i >= slots.length - 3; });
    slots.forEach((s) => { if (s.place === 'sea' && s.at > 0.84) s.place = 'final'; });

    // gruppehendelser når det er flere ofre enn hendelser
    let extra = E - B;
    const groupable = slots.filter((s) => !s.last && s.place !== 'polar');
    let guard = 0;
    while (extra > 0 && groupable.length && guard++ < 5000) {
      const s = groupable[ri(groupable.length)];
      const cap = guard > 2000 ? 8 : 4;
      if (s.size < cap) { s.size++; extra--; }
    }
    if (extra > 0) slots[0].size += extra; // nødløsning, bør aldri skje

    // velg hendelse for hver plass
    let bag = [];
    // folkets egne hendelser først, deretter bonus – ingen gjentakelser før posen er tom
    const refill = () => { bag = u.shuffle(CORE_SEA, ri).concat(u.shuffle(BONUS_SEA, ri)); };
    refill();
    const fromBag = (ok) => {
      for (let tries = 0; tries < 2; tries++) {
        const idx = bag.findIndex(ok);
        if (idx >= 0) return bag.splice(idx, 1)[0];
        refill();
      }
      return 'overbord';
    };
    let prev = null;
    let victimIdx = 0;
    const beats = slots.map((s, i) => {
      let ev;
      const notPrev = (e) => e !== prev && !(SHIP_EVENTS.includes(e) && SHIP_EVENTS.includes(prev));
      if (s.place === 'polar') ev = 'polar';
      else if (s.place === 'ornes' && s.ord === 0) ev = 'ornes';
      else if (s.place === 'ornes') ev = s.size > 1 ? ['full', 'feilrute'][ri(2)] : ['svolvaer', 'full', 'feilrute'][ri(3)];
      else if (s.place === 'nesna') ev = s.size > 1 ? ['full', 'feilrute'][ri(2)] : ['feilrute', 'full', 'sjosyk'][ri(3)];
      else if (s.size > 1) { const c = GROUP_SEA.filter(notPrev); ev = c[ri(c.length)] || 'noro'; }
      else if (i === slots.length - 1) { const c = ['orna', 'orna', 'glimt', 'tut', 'overbord', 'kokken'].filter(notPrev); ev = c[ri(c.length)]; }
      else ev = fromBag((e) => notPrev(e) && (s.place === 'final' || e !== 'glimt'));
      if (s.place === 'final' && s.size === 1 && i !== slots.length - 1 && rnd() < 0.18 && notPrev('glimt')) ev = 'glimt';
      prev = ev;
      const v = elim.slice(victimIdx, victimIdx + s.size);
      victimIdx += s.size;
      return { at: +s.at.toFixed(4), place: s.place, ev, v, t: ri(6) };
    });
    return beats.filter((b) => b.v.length);
  }

  /* ---------- Tekst ---------- */
  function eventText(beat, tickets, asHtml = true) {
    const ev = EVENTS[beat.ev] || EVENTS.overbord;
    const count = {};
    tickets.forEach((t) => { const k = u.normName(t.name); count[k] = (count[k] || 0) + 1; });
    const names = beat.v.map((no) => {
      const t = tickets[no - 1];
      if (!t) return '#' + no;
      return count[u.normName(t.name)] > 1 ? `${t.name} (lodd ${t.label || u.pad(no)})` : t.name; // to lodd? vis hvilket som røk
    });
    const port = beat.pn || PORT_NAME[beat.place]; // pn: navnet på et hull i en egen Keiservarden-løype
    let list = ev.t;
    if (names.length > 1 && ev.g) list = ev.g;
    else if (port && ev.p) list = ev.p;
    const tpl = list[beat.t % list.length];
    const who = asHtml ? u.joinNames(names.map((n) => `<b>${u.esc(n)}</b>`)) : u.joinNames(names);
    const place = port || 'nærmeste kai';
    const body = asHtml ? u.esc(tpl) : tpl;
    return body.split('{n}').join(who).split('{p}').join(asHtml ? u.esc(place) : place);
  }

  const ROUTE_DRAUGEN = [
    { id: 'bodo', name: 'Bodø', type: 'start', at: 0 },
    { id: 'landegode', name: 'Landegode', type: 'marker', at: 0.18 },
    { id: 'vest', name: 'Vestfjorden', type: 'marker', at: 0.5 },
    { id: 'skrova', name: 'Skrova', type: 'marker', at: 0.8 },
    { id: 'henn', name: 'Henningsvær', type: 'end', at: 1 },
  ];
  FL.Events = { EVENTS, ORDER, ORDER_DRAUGEN, ORDER_KEISER, ROUTE, ROUTE_DRAUGEN, AT, PORT_NAME, PLACE_LABEL, createDraw, eventText };
})();
