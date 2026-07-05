# Procedura Claude Code per Mentore — efficienza e consumi

## Installazione (una volta sola)

Dalla root del repo Mentore:

1. Copia `CLAUDE.md` nella root del progetto.
2. Copia la cartella `.claude/` (commands + settings.json) nella root del progetto.
3. Committa tutto: così la procedura è versionata e ti segue ovunque.
4. Consigliato — pulizia del repo (riduce token e rumore):
   - sposta gli screenshot `*.png` e gli script `*.sh` di test VPN in una cartella `archive/` (o eliminali se non servono più);
   - aggiungi a `.gitignore`: `cookie*`, `*.png` in root, `stored_attachments/`;
   - rimuovi i file cookie dal repo (`git rm cookie-jar.txt cookie.jar cookies.txt`): file di cookie non vanno mai versionati, anche se ora sono vuoti.

## Ciclo di lavoro quotidiano

**Inizio sessione**
- Apri Claude Code nella root del progetto.
- Se riprendi un lavoro: digita `/riprendi` (legge le note, verifica git, riparte dal primo passo).
- Se è un task nuovo: descrivilo in modo specifico, citando i file con `@` (es. `@shared/schema.ts`). Un task = una sessione.

**Durante la sessione**
- Modello: Sonnet come default (`/model sonnet`); passa al modello superiore solo per architettura complessa o bug ostici, poi torna indietro.
- Controlla il contesto con `/context` o `/usage`. Verso il 50-60%: `/compact` (il CLAUDE.md contiene già le istruzioni su cosa preservare).
- Se devi fare una domanda estemporanea non legata al task, evita di sporcare il contesto: aprila altrove o usa `/btw` se disponibile nella tua versione.

**Fine sessione (sempre)**
1. `npm run check` deve passare.
2. Commit del lavoro (checkpoint: git è la vera memoria del codice).
3. `/handoff` — scrive `.claude/session-notes.md` con stato e prossimi passi.
4. Chiudi. La prossima sessione parte pulita con `/riprendi`.

**Cambio di task nella stessa giornata**
- `/handoff` → `/clear` → nuovo task. Mai trascinare il contesto di un task nel successivo.

## Regole d'oro sui consumi

1. Il costo cresce con la lunghezza della conversazione: ogni messaggio rimanda tutta la cronologia. Sessioni corte e mirate.
2. `/clear` tra task scollegati, `/compact` tra fasi dello stesso task.
3. Mai far leggere a Claude `routes.ts` o `storage.ts` interi: Grep prima, lettura mirata poi (regola già inclusa nel CLAUDE.md).
4. Prompt specifici: nomina i file, descrivi il risultato atteso, evita "dai un'occhiata al progetto".
5. `session-notes.md` + `CLAUDE.md` + commit git = puoi chiudere qualsiasi sessione in qualsiasi momento senza perdere nulla.

## Manutenzione

- Quando prendi una decisione architetturale che vale per sempre, spostala dalle session-notes al `CLAUDE.md` (che però deve restare sotto ~100 righe: se cresce, sposta i dettagli in file dedicati e linkali).
- Ogni tanto verifica con `/context` cosa occupa spazio a inizio sessione: se il CLAUDE.md è ingrassato, snelliscilo.
