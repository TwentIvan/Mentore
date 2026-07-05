# Session notes — 2026-07-05

## Task in corso
Fase 2 del modulo budget: integrazione di un agente AI che propone una struttura di budget (categorie + voci pianificate) analizzando lo storico transazioni + una nota facoltativa dell'utente.

## Stato
- COMPLETATO e committato/pushato su `claude/budget-structure-agent-ewyaom` (commit `5f740aa`, nessuna modifica pendente in working tree).
- `npm run check`: stessi errori pre-esistenti di prima (baseline 77 → dopo le modifiche 76, nessun errore nuovo introdotto dal codice aggiunto; verificato con `git stash` diff).
- INCOMPLETO: `npm run db:push` **non eseguito** — questo ambiente non ha `DATABASE_URL`/`OPENAI_API_KEY` configurati, quindi la tabella `budget_proposals` esiste solo nello schema Drizzle, non nel DB reale. Va applicata in un ambiente con DB prima di testare a mano.
- Non testato a mano in browser (nessun DB/OpenAI key disponibili in questo ambiente).

## File toccati
- `shared/schema.ts` — nuova tabella `budget_proposals` (status, userNote, proposalData jsonb, ecc.) + relations + insert schema + tipi.
- `server/ai-budget-agent.ts` — nuovo, `analyzeBudgetStructure()`: prompt OpenAI (gpt-5) che riceve categorie/plan items esistenti + transazioni storiche + nota utente, ritorna `{ categories, planItems, reasoning }`.
- `server/storage.ts` — CRUD `getBudgetProposals/getBudgetProposal/createBudgetProposal/updateBudgetProposal/deleteBudgetProposal` (stesso pattern di `proposals`).
- `server/routes.ts` — endpoint `/api/budget-proposals` (GET lista/singola), `POST /generate` (avvia analisi in background, come per l'agente messaggi), `POST /:id/apply` (crea categorie nuove/abbina esistenti, poi crea plan items risolvendo `categoryName` → id via mappa nome→id), `POST /:id/reject`, `DELETE /:id`.
- `client/src/components/budget/budget-proposals-tab.tsx` — nuovo, UI proposte (lista + dettaglio + dialog generazione con nota + apply/reject), ricalcata su `proposals-page.tsx`.
- `client/src/pages/budget-page.tsx` — aggiunto tab "Proposte AI" (6° tab).

## Decisioni prese
- Tabella dedicata `budget_proposals` invece di riusare `proposals` generica: quella esistente ha `messageId` NOT NULL (legata al flusso email), incompatibile con proposte non originate da un messaggio.
- Le voci di piano proposte referenziano la categoria per **nome** (`categoryName`), non per id, perché le categorie nuove non hanno ancora un id quando l'AI genera la proposta; l'apply risolve nome→id (case-insensitive) dopo aver creato/abbinato le categorie.
- Niente nuova voce in sidebar: la feature è un tab dentro la pagina Budget esistente, non una nuova area di primo livello.

## Prossimi passi
1. In un ambiente con `DATABASE_URL` configurato: eseguire `npm run db:push` per creare la tabella `budget_proposals`.
2. Con `OPENAI_API_KEY` configurata: testare a mano il flusso — generare proposta (con e senza nota, con e senza storico transazioni), verificare apply (creazione categorie/plan items) e reject.
3. Valutare se aggiungere audit trail (`AuditHistory`) anche sulle `budget_proposals` stesse, o se basta quello già presente su categorie/plan items create dall'apply.
