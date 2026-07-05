// AI Budget Agent - Analyzes historical transactions (and an optional user note) to propose a budget structure
// Using OpenAI integration from blueprint:javascript_openai

import OpenAI from "openai";
import type { BudgetCategory, BudgetPlanItem, BudgetTransaction } from "@shared/schema";

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface BudgetStructureProposal {
  categories: Array<{
    isNew: boolean;
    existingId?: string;
    name: string;
    type: "income" | "expense";
  }>;
  planItems: Array<{
    name: string;
    type: "income" | "expense";
    categoryName: string; // Deve corrispondere al "name" di una delle categorie proposte sopra
    amount: number;
    startYear: number;
    startMonth: number; // 1-12
    intervalMonths?: number | null; // null = una tantum, N = ricorre ogni N mesi
    notes?: string;
  }>;
  reasoning: string;
}

export async function analyzeBudgetStructure(
  existingCategories: BudgetCategory[],
  existingPlanItems: BudgetPlanItem[],
  recentTransactions: BudgetTransaction[],
  userNote?: string
): Promise<BudgetStructureProposal> {
  const systemPrompt = `Sei un assistente esperto di finanza personale che aiuta a costruire la struttura di un budget mensile (categorie + voci pianificate).

## ⚠️ REGOLA OBBLIGATORIA SULLA LINGUA ⚠️
**SCRIVI TUTTO IN ITALIANO, SENZA ECCEZIONI.** Nomi di categorie, voci di piano e ragionamento devono essere in italiano.

## CONTESTO
L'utente gestisce un budget personale con:
- **Categorie** (budget_categories): entrata o spesa, riutilizzabili tra più voci
- **Voci pianificate** (budget_plan_items): importo previsto, categoria, mese/anno di inizio, eventuale ricorrenza mensile (intervalMonths) o una tantum (null)
- **Transazioni** (budget_transactions): movimenti reali già registrati, usati qui solo come storico da analizzare

## IL TUO COMPITO
Analizza le transazioni storiche fornite (e la nota facoltativa dell'utente) per proporre una struttura di budget:
1. **Categorie**: individua le categorie di entrata/spesa ricorrenti nello storico. Preferisci abbinare categorie ESISTENTI (usa existingId, isNew=false) piuttosto che crearne di nuove; crea nuove categorie SOLO se non esiste nulla di simile.
2. **Voci pianificate**: per ogni pattern ricorrente individuato nello storico (es. stipendio mensile, affitto, abbonamenti), proponi una voce di piano con importo medio/tipico, categoria corrispondente e cadenza (intervalMonths=1 per mensile, altri valori per cadenze diverse, null per una tantum).
3. Se la nota dell'utente indica obiettivi (es. "voglio risparmiare di più", "vorrei limitare le spese per svago a 150€"), tienine conto nell'importo proposto e menzionalo nel reasoning.
4. Se lo storico è scarso o assente, basati principalmente sulla nota dell'utente; se manca anche quella, proponi una struttura base ragionevole (entrate: stipendio; spese: casa, utenze, alimentari, trasporti, svago, risparmio) segnalandolo nel reasoning.

## LINEE GUIDA
- Non proporre più di 12 voci di piano: raggruppa spese simili in un'unica categoria/voce quando ha senso.
- Gli importi sono sempre positivi (il segno/tipo è determinato dal campo "type").
- "categoryName" in ogni voce di piano DEVE corrispondere esattamente al "name" di una delle categorie proposte nell'array "categories".
- Usa mese/anno correnti come startYear/startMonth per le voci ricorrenti, salvo diversa indicazione nello storico o nella nota.

## FORMATO OUTPUT
Rispondi SOLO con JSON valido con questa struttura esatta:
{
  "categories": [
    {
      "isNew": boolean,
      "existingId": "uuid-se-abbini-una-categoria-esistente",
      "name": "Nome categoria",
      "type": "income|expense"
    }
  ],
  "planItems": [
    {
      "name": "Nome breve della voce (es. 'Stipendio', 'Affitto')",
      "type": "income|expense",
      "categoryName": "Deve combaciare con un nome in categories",
      "amount": numero,
      "startYear": anno_numero,
      "startMonth": mese_numero_1_12,
      "intervalMonths": 1_o_altro_numero_o_null,
      "notes": "Nota facoltativa in italiano"
    }
  ],
  "reasoning": "Spiegazione in italiano di come hai analizzato lo storico e/o la nota, cosa hai abbinato e perché"
}`;

  const now = new Date();

  const userPrompt = `Analizza lo storico e proponi una struttura di budget.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📝 NOTA DELL'UTENTE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${userNote?.trim() || '(nessuna nota fornita)'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🗂️ CATEGORIE ESISTENTI (${existingCategories.length} totali)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${existingCategories.length > 0
  ? existingCategories.map(c => `  • [${c.id}] "${c.name}" - Tipo: ${c.type}`).join('\n')
  : '  (nessuna categoria esistente)'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 VOCI DI PIANO GIÀ ESISTENTI (${existingPlanItems.length} totali)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${existingPlanItems.length > 0
  ? existingPlanItems.slice(0, 30).map(p => `  • "${p.name}" - ${p.type}, importo: ${p.amount}, categoria: ${p.categoryId}, cadenza: ${p.intervalMonths ? `ogni ${p.intervalMonths} mesi` : 'una tantum'}`).join('\n')
  : '  (nessuna voce di piano esistente)'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💳 TRANSAZIONI STORICHE (${recentTransactions.length} totali, più recenti prima)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${recentTransactions.length > 0
  ? recentTransactions.slice(0, 150).map(t =>
      `  • ${new Date(t.transactionDate).toISOString().slice(0, 10)} | ${t.type} | ${t.amount} | ${t.description || '(senza descrizione)'}`
    ).join('\n')
  : '  (nessuna transazione registrata)'}
${recentTransactions.length > 150 ? `  ... e altre ${recentTransactions.length - 150}` : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 RIFERIMENTO TEMPORALE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Anno corrente: ${now.getFullYear()}, mese corrente: ${now.getMonth() + 1}

Rispondi con SOLO JSON valido (nessun markdown, nessuna spiegazione fuori dal JSON).`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      response_format: { type: "json_object" },
    });

    const proposal = JSON.parse(response.choices[0].message.content || "{}");

    console.log('[AI-BUDGET-AGENT] Generated proposal:', JSON.stringify(proposal, null, 2));

    return proposal as BudgetStructureProposal;
  } catch (error) {
    console.error('[AI-BUDGET-AGENT] Error analyzing budget structure:', error);
    throw new Error(`Failed to analyze budget structure: ${error instanceof Error ? error.message : String(error)}`);
  }
}
