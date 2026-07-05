# Mentore — CRM per freelancer SAP ABAP

CRM full-stack: progetti, task, deal, partner, calendario, timesheet, messaggi/email, agente AI per analisi messaggi e proposte automatiche. Multi-organizzazione.

## Stack
- **Frontend**: React 18 + TypeScript, Vite, shadcn/ui (Radix), TailwindCSS, TanStack Query, Wouter, React Hook Form + Zod
- **Backend**: Express + TypeScript, Passport (local, scrypt), sessioni in PostgreSQL
- **DB**: PostgreSQL + Drizzle ORM (schema in `shared/schema.ts`)
- **AI**: OpenAI per l'agente proposte (analisi asincrona in background → tabella `proposals`)

## Comandi
- `npm run dev` — avvia in sviluppo (tsx server/index.ts)
- `npm run check` — type-check TypeScript (esegui SEMPRE prima di dichiarare finito un task)
- `npm run db:push` — applica modifiche schema con drizzle-kit
- `npm run build` — build produzione

## Struttura
- `client/src/pages/` — una pagina per area (progetti, deal, partner, timesheet, ...)
- `client/src/components/ui/` — shadcn/ui + componenti custom (universal-table, layout-manager, advanced-filters)
- `server/` — un service per dominio (`*-service.ts`), routing centralizzato in `routes.ts`, data layer in `storage.ts`
- `shared/schema.ts` — schema Drizzle + tipi condivisi client/server

## ⚠️ Regole di lettura (risparmio contesto)
- `server/routes.ts` (~5200 righe) e `server/storage.ts` (~3500 righe): NON leggerli interi. Usa Grep per trovare la sezione dell'entità interessata, poi leggi solo quel range di righe.
- Ignora completamente: `*.png` in root, `stored_attachments/`, `attached_assets/`, `cookie*`, gli script `*.sh` di test VPN in root.
- Per capire un'entità parti da `shared/schema.ts` (Grep sul nome tabella), non dal codice server.

## Pattern obbligatori (API e frontend)
- `apiRequest("METHOD", "/url", data)` — metodo SEMPRE primo argomento
- Query: `getQueryFn({ on401: "throw" })`, mai fetch custom
- Ogni query con contesto organizzazione: `enabled: !!currentOrganizationId`
- Filtro multi-org lato server: header `X-Organization-Id` / `X-Organization-Scope`, query con `inArray(table.organizationId, organizationIds)`
- Conferme: sempre `AlertDialog`, mai `confirm()` di sistema
- Delete: prevedere sia singola sia massiva, con conferma
- Ogni pagina: layout Sidebar + Header, `LayoutManager` per configurazione tabella
- Audit: integrare `AuditHistory` (con Tabs) nei dialog di modifica; modifiche tracciate via `AuditService`
- `data-testid` su tutti gli elementi interattivi

## Template "nuova area tabellare"
Quando si crea una nuova area CRUD, checklist completa: tabella in schema + API + pagina frontend, voce nel menu sidebar (sempre visibile, con icona), LayoutManager con salvataggio/selezione layout, selezione righe (`enableSelection` + `onSelectionChange`) con cancellazione multipla, Audit Trail completo.

## Workflow di sessione
- Un task per sessione. A fine task esegui `/handoff`, poi la sessione può essere chiusa.
- A inizio sessione, se esiste `.claude/session-notes.md`, leggilo prima di qualunque esplorazione.
- Preferisci Grep/Glob mirati all'esplorazione libera di directory.

## Istruzioni per /compact
Quando compatti, preserva: decisioni architetturali prese, elenco file modificati, task rimanenti, pattern del progetto citati. Scarta: contenuti verbatim dei file letti, output di build/test già risolti.
