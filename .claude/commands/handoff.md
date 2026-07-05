---
description: Salva lo stato della sessione per riprendere il lavoro in una sessione nuova
---

Stai per chiudere questa sessione di lavoro. Scrivi (sovrascrivendo) il file `.claude/session-notes.md` con questo formato, in modo conciso — massimo 60 righe totali:

# Session notes — <data odierna>

## Task in corso
Una frase: cosa si stava facendo e perché.

## Stato
- Cosa è COMPLETATO e verificato (npm run check passato? testato a mano?)
- Cosa è INCOMPLETO o rotto in questo momento

## File toccati
Elenco dei file modificati in questa sessione, con una riga di spiegazione ciascuno.

## Decisioni prese
Solo le decisioni non ovvie che la prossima sessione deve rispettare (scelte di design, approcci scartati e perché).

## Prossimi passi
Elenco ordinato e azionabile: la prossima sessione deve poter partire dal punto 1 senza fare domande.

Regole:
- Niente contenuti di file, niente diff, niente log: solo sintesi.
- Se ci sono modifiche non committate, segnalalo esplicitamente in "Stato" e proponi un messaggio di commit.
- Dopo aver scritto il file, conferma con una sola riga: cosa è stato salvato e il primo prossimo passo.
