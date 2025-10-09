import OpenAI from "openai";

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface InterestAreaSuggestion {
  name: string;
  description: string;
  color: string;
  reasoning: string;
}

export interface TimeAllocationSuggestion {
  areaId: string;
  percentage: number;
  reasoning: string;
}

export interface ConversationMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/**
 * Suggerisce aree di interesse generiche basate su best practices e trend attuali
 */
export async function suggestGenericInterestAreas(): Promise<InterestAreaSuggestion[]> {
  const systemPrompt = `Sei un assistente AI esperto di gestione del tempo e pianificazione personale. 
Il tuo compito è suggerire aree di interesse GENERICHE basate su best practices e trend attuali del 2025.

Le aree di interesse devono essere:
- GENERICHE e applicabili alla maggior parte delle persone
- Categorie ampie della vita (es: Lavoro, Studio, Fitness, Famiglia, ecc.)
- Con descrizioni GENERICHE non personalizzate
- Basate su trend e best practices attuali

Esempi di aree GENERICHE:
- Lavoro/Carriera
- Salute e Fitness
- Famiglia e Relazioni
- Sviluppo Personale
- Hobby e Tempo Libero
- Finanze Personali
- Spiritualità/Mindfulness
- Formazione Continua

IMPORTANTE:
Suggerisci 6-8 aree di interesse generiche.
Le descrizioni devono essere generiche, NON personalizzate.
Rispondi SEMPRE in formato JSON con questa struttura:
{
  "suggestions": [
    {
      "name": "Nome Area Generico",
      "description": "Descrizione generica dell'area",
      "color": "codice colore esadecimale",
      "reasoning": "Perché questa area è rilevante nel 2025 (trend/best practices)"
    }
  ]
}

Scegli colori distintivi e piacevoli per ogni area.`;

  const response = await openai.chat.completions.create({
    model: "gpt-5",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: "Suggerisci aree di interesse generiche basate su trend e best practices del 2025" }
    ] as any,
    response_format: { type: "json_object" },
  });

  const result = JSON.parse(response.choices[0].message.content || "{}");
  return result.suggestions || [];
}

/**
 * Suggerisce come distribuire il tempo tra le aree di interesse
 */
export async function suggestTimeAllocation(
  areas: Array<{ id: string; name: string; description: string }>,
  userContext: string,
  conversationHistory: ConversationMessage[] = []
): Promise<{
  allocations: TimeAllocationSuggestion[];
  question?: string;
  needsMoreInfo: boolean;
}> {
  const systemPrompt = `Sei un assistente AI esperto di gestione del tempo e bilanciamento vita-lavoro.
Il tuo compito è aiutare l'utente a distribuire il proprio tempo settimanale tra le diverse aree di interesse.

IMPORTANTE:
1. Se non hai abbastanza informazioni sulle priorità dell'utente, fai UNA domanda specifica
2. Quando hai informazioni sufficienti, suggerisci una distribuzione percentuale che sommi al 100%
3. Considera una settimana di 168 ore, ma ricorda che circa 56 ore sono per il sonno (8h/giorno)
4. Rispondi SEMPRE in formato JSON con questa struttura:
{
  "needsMoreInfo": boolean,
  "question": "domanda da fare all'utente (solo se needsMoreInfo è true)",
  "allocations": [
    {
      "areaId": "id dell'area",
      "percentage": numero (0-100),
      "reasoning": "Spiegazione del perché questa percentuale"
    }
  ]
}

Le percentuali devono sommare esattamente a 100.
Sii realistico e bilanciato nelle tue allocazioni.`;

  const areasDescription = areas.map(a => `- ID: ${a.id} | Nome: ${a.name} | Descrizione: ${a.description}`).join('\n');

  const messages: ConversationMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: `Ecco le mie aree di interesse:\n${areasDescription}\n\nIMPORTANTE: Devi usare esattamente questi ID nelle tue allocazioni. Non inventare ID, usa solo quelli che ti ho fornito.\n\nContesto: ${userContext}` },
    ...conversationHistory,
  ];

  const response = await openai.chat.completions.create({
    model: "gpt-5",
    messages: messages as any,
    response_format: { type: "json_object" },
  });

  const result = JSON.parse(response.choices[0].message.content || "{}");

  return {
    allocations: result.allocations || [],
    question: result.question,
    needsMoreInfo: result.needsMoreInfo || false,
  };
}
