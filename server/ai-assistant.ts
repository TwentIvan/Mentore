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
 * Suggerisce aree di interesse basandosi sul contesto dell'utente
 */
export async function suggestInterestAreas(
  userContext: string,
  conversationHistory: ConversationMessage[] = []
): Promise<{
  suggestions: InterestAreaSuggestion[];
  question?: string;
  needsMoreInfo: boolean;
}> {
  const systemPrompt = `Sei un assistente AI esperto di gestione del tempo e pianificazione personale. 
Il tuo compito è aiutare l'utente a identificare le sue aree di interesse principali per una migliore organizzazione del tempo.

Aree di interesse sono categorie ampie della vita come:
- Lavoro/Carriera
- Salute e Fitness
- Famiglia
- Sviluppo Personale
- Hobby e Passioni
- Relazioni Sociali
- Finanze
- Spiritualità/Mindfulness

IMPORTANTE:
1. Se non hai abbastanza informazioni, fai UNA domanda specifica per capire meglio le priorità dell'utente
2. Quando hai informazioni sufficienti, suggerisci 4-8 aree di interesse personalizzate
3. Rispondi SEMPRE in formato JSON con questa struttura:
{
  "needsMoreInfo": boolean,
  "question": "domanda da fare all'utente (solo se needsMoreInfo è true)",
  "suggestions": [
    {
      "name": "Nome Area",
      "description": "Descrizione dettagliata",
      "color": "codice colore esadecimale",
      "reasoning": "Perché questa area è importante per l'utente"
    }
  ]
}

Scegli colori distintivi e piacevoli per ogni area.`;

  const messages: ConversationMessage[] = [
    { role: "system", content: systemPrompt },
    ...conversationHistory,
    { role: "user", content: userContext }
  ];

  const response = await openai.chat.completions.create({
    model: "gpt-5",
    messages: messages as any,
    response_format: { type: "json_object" },
  });

  const result = JSON.parse(response.choices[0].message.content || "{}");

  return {
    suggestions: result.suggestions || [],
    question: result.question,
    needsMoreInfo: result.needsMoreInfo || false,
  };
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
