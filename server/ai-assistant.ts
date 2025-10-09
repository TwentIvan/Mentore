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
 * Suggerisce distribuzione tempo rapida senza intervista, basata su best practices
 */
export async function suggestQuickTimeAllocation(
  areas: Array<{ id: string; name: string; description: string }>
): Promise<TimeAllocationSuggestion[]> {
  const systemPrompt = `Sei un assistente AI esperto di gestione del tempo e bilanciamento vita-lavoro.
Il tuo compito è suggerire una distribuzione percentuale del tempo tra diverse aree di interesse, basandoti su best practices e principi di produttività.

IMPORTANTE:
1. La distribuzione deve essere RAGIONATA, non equa
2. Considera l'importanza relativa di ogni area nella vita moderna
3. Usa principi come work-life balance, regola 80/20, ecc.
4. Le percentuali devono sommare esattamente a 100
5. Rispondi SEMPRE in formato JSON con questa struttura:
{
  "allocations": [
    {
      "areaId": "id esatto dell'area",
      "percentage": numero (0-100),
      "reasoning": "Breve spiegazione della percentuale assegnata"
    }
  ]
}

Sii realistico e bilanciato nelle tue allocazioni.`;

  const areasDescription = areas.map(a => `- ID: ${a.id} | Nome: ${a.name} | Descrizione: ${a.description}`).join('\n');

  const response = await openai.chat.completions.create({
    model: "gpt-5",
    messages: [
      { role: "system", content: systemPrompt },
      { 
        role: "user", 
        content: `Suggerisci una distribuzione del tempo ragionata per queste aree:\n${areasDescription}\n\nIMPORTANTE: Usa esattamente questi ID nelle tue allocazioni.` 
      }
    ] as any,
    response_format: { type: "json_object" },
  });

  const result = JSON.parse(response.choices[0].message.content || "{}");
  return result.allocations || [];
}

/**
 * Suggerisce come distribuire il tempo tra le aree di interesse (conversazionale)
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

export interface PlanningWindowSuggestion {
  projectId?: string;
  projectName?: string;
  interestAreaId: string;
  interestAreaName: string;
  name: string; // Nome della finestra di pianificazione
  startDate: string; // ISO date
  endDate: string; // ISO date
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  daysOfWeek: number[]; // 1=Lunedì, 7=Domenica
  recurrenceType: 'none' | 'weekly';
  recurrenceInterval: number;
  recurrenceEnd: string; // ISO date
  reasoning: string;
}

/**
 * Suggerisce planning windows settimanali basate sul template di allocazione tempo
 */
export async function suggestWeeklyPlanning(
  template: {
    name: string;
    allocations: Array<{ id: string; name: string; percentage: number; color: string }>;
    totalHoursPerWeek: number;
  },
  interestAreas: Array<{
    id: string;
    name: string;
    description?: string;
  }>,
  projects?: Array<{
    id: string;
    name: string;
    interestAreaId: string;
    interestAreaName: string;
    estimatedEffort?: number;
  }>
): Promise<PlanningWindowSuggestion[]> {
  const hasProjects = projects && projects.length > 0;
  
  const systemPrompt = `Sei un assistente AI esperto di pianificazione e time blocking.
Il tuo compito è trasformare un template di allocazione tempo (percentuali/ore per area) in planning windows concrete.

REGOLE DI PIANIFICAZIONE:
1. Crea blocchi di tempo realistici (min 1 ora, max 4 ore consecutive)
2. Considera fasce orarie produttive: 9:00-13:00 e 14:00-18:00
3. Bilancia i giorni della settimana per evitare sovraccarichi
4. Usa ricorrenze settimanali per attività regolari
5. Rispetta il totale ore del template
${hasProjects ? '6. Se disponibili, distribuisci le ore tra i progetti dell\'area considerando lo sforzo stimato' : '6. Crea windows generiche per ogni area di interesse'}

FORMATO GIORNI SETTIMANA:
1 = Lunedì, 2 = Martedì, 3 = Mercoledì, 4 = Giovedì, 5 = Venerdì, 6 = Sabato, 7 = Domenica

IMPORTANTE - Rispondi SEMPRE in formato JSON con questa struttura:
{
  "suggestions": [
    {
      ${hasProjects ? '"projectId": "id del progetto (se disponibile)",' : ''}
      ${hasProjects ? '"projectName": "nome del progetto (se disponibile)",' : ''}
      "interestAreaId": "id dell'area di interesse",
      "interestAreaName": "nome dell'area di interesse",
      "name": "nome descrittivo della finestra (es: 'Lavoro - Mattina' o 'Sviluppo SAP')",
      "startDate": "data inizio ISO (es: '2025-10-13')",
      "endDate": "data fine ISO (4 settimane dopo)",
      "startTime": "ora inizio HH:MM (es: '09:00')",
      "endTime": "ora fine HH:MM (es: '13:00')",
      "daysOfWeek": [array di numeri 1-7],
      "recurrenceType": "weekly",
      "recurrenceInterval": 1,
      "recurrenceEnd": "data fine ricorrenza ISO (4 settimane dopo)",
      "reasoning": "Spiegazione della scelta (ore assegnate, giorni, fasce orarie)"
    }
  ]
}

Sii strategico e crea una pianificazione bilanciata ed efficace.`;

  const allocationsDescription = template.allocations
    .map(a => `- ${a.name}: ${a.percentage}% (${Math.round(template.totalHoursPerWeek * a.percentage / 100)} ore/settimana)`)
    .join('\n');

  const areasDescription = interestAreas
    .map(a => `- ID: ${a.id} | Nome: ${a.name}${a.description ? ` | Descrizione: ${a.description}` : ''}`)
    .join('\n');

  const projectsDescription = hasProjects 
    ? projects!.map(p => `- ID: ${p.id} | Nome: ${p.name} | Area: ${p.interestAreaName} (ID: ${p.interestAreaId})${p.estimatedEffort ? ` | Sforzo stimato: ${p.estimatedEffort}h` : ''}`).join('\n')
    : '';

  const today = new Date().toISOString().split('T')[0];
  const fourWeeksLater = new Date(Date.now() + 28 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const userContent = `Template di allocazione: "${template.name}"
Ore totali settimana: ${template.totalHoursPerWeek}h

ALLOCAZIONI PER AREA:
${allocationsDescription}

AREE DI INTERESSE:
${areasDescription}

${hasProjects ? `PROGETTI DISPONIBILI (opzionali per arricchire i suggerimenti):
${projectsDescription}

IMPORTANTE - Progetti:
- Usa esattamente questi ID progetto quando crei windows per progetti specifici
- Puoi anche creare windows generiche per aree senza progetti specifici
` : 'NOTA: Non ci sono progetti definiti. Crea planning windows generiche per le aree di interesse.'}

IMPORTANTE - Date e Ricorrenze:
- Data inizio: ${today}
- Data fine suggerita: ${fourWeeksLater} (4 settimane)
- Crea planning windows ricorrenti settimanali
- Distribuisci le ore in modo equilibrato durante la settimana
- Usa fasce orarie produttive

Genera planning windows concrete e realistiche basate sulle aree di interesse.`;

  const response = await openai.chat.completions.create({
    model: "gpt-5",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userContent }
    ] as any,
    response_format: { type: "json_object" },
  });

  const result = JSON.parse(response.choices[0].message.content || "{}");
  return result.suggestions || [];
}

export interface PlanningChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface PlanningChatResponse {
  message: string;
  updatedSuggestions?: PlanningWindowSuggestion[];
  hasUpdates: boolean;
}

/**
 * Chatbot per discutere e modificare le proposte di pianificazione
 */
export async function chatAboutPlanning(
  currentSuggestions: PlanningWindowSuggestion[],
  conversationHistory: PlanningChatMessage[],
  userMessage: string
): Promise<PlanningChatResponse> {
  const systemPrompt = `Sei un assistente AI esperto di pianificazione e time management.
Il tuo compito è discutere con l'utente le proposte di planning windows e modificarle in base alle sue richieste.

CAPACITÀ:
1. Rispondere a domande sulle proposte (perché certe scelte, orari, ecc.)
2. Modificare proposte esistenti (cambiare orari, giorni, durata)
3. Aggiungere nuove planning windows se richiesto
4. Rimuovere planning windows se richiesto
5. Spiegare il ragionamento dietro le proposte

FORMATO GIORNI SETTIMANA:
1 = Lunedì, 2 = Martedì, 3 = Mercoledì, 4 = Giovedì, 5 = Venerdì, 6 = Sabato, 7 = Domenica

IMPORTANTE - Comportamento:
- Se l'utente chiede solo informazioni/spiegazioni, rispondi senza modificare le proposte
- Se l'utente chiede modifiche, aggiorna le proposte e spiega cosa hai cambiato
- Sii conversazionale e amichevole
- Fornisci consigli quando appropriato

IMPORTANTE - Rispondi SEMPRE in formato JSON con questa struttura:
{
  "message": "La tua risposta all'utente in linguaggio naturale",
  "hasUpdates": true/false (true se hai modificato le proposte),
  "updatedSuggestions": [array di PlanningWindowSuggestion] (solo se hasUpdates è true)
}

Il formato di PlanningWindowSuggestion è:
{
  "projectId": "id del progetto (opzionale)",
  "projectName": "nome del progetto (opzionale)",
  "interestAreaId": "id dell'area di interesse",
  "interestAreaName": "nome dell'area di interesse",
  "name": "nome descrittivo della finestra",
  "startDate": "data inizio ISO (es: '2025-10-13')",
  "endDate": "data fine ISO",
  "startTime": "ora inizio HH:MM (es: '09:00')",
  "endTime": "ora fine HH:MM (es: '13:00')",
  "daysOfWeek": [array di numeri 1-7],
  "recurrenceType": "weekly" o "none",
  "recurrenceInterval": 1,
  "recurrenceEnd": "data fine ricorrenza ISO",
  "reasoning": "Spiegazione della scelta"
}

Sii collaborativo e aiuta l'utente a ottimizzare la sua pianificazione.`;

  const suggestionsDescription = currentSuggestions.map((s, idx) => 
    `${idx + 1}. ${s.name}
   Area: ${s.interestAreaName}${s.projectName ? ` | Progetto: ${s.projectName}` : ''}
   Orario: ${s.startTime}-${s.endTime}
   Giorni: ${s.daysOfWeek.map(d => ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'][d - 1]).join(', ')}
   Periodo: ${s.startDate} → ${s.endDate}
   Ricorrenza: ${s.recurrenceType === 'weekly' ? 'Settimanale' : 'Singola'}
   Motivazione: ${s.reasoning}`
  ).join('\n\n');

  const messages: any[] = [
    { role: "system", content: systemPrompt },
    { 
      role: "user", 
      content: `Ecco le proposte di pianificazione correnti:\n\n${suggestionsDescription}\n\nOra inizia la conversazione.` 
    },
  ];

  // Aggiungi lo storico della conversazione
  conversationHistory.forEach(msg => {
    messages.push({ role: msg.role, content: msg.content });
  });

  // Aggiungi il nuovo messaggio dell'utente
  messages.push({ role: "user", content: userMessage });

  const response = await openai.chat.completions.create({
    model: "gpt-5",
    messages,
    response_format: { type: "json_object" },
  });

  const result = JSON.parse(response.choices[0].message.content || "{}");
  
  return {
    message: result.message || "Mi dispiace, non ho capito. Puoi riformulare?",
    updatedSuggestions: result.updatedSuggestions,
    hasUpdates: result.hasUpdates || false,
  };
}
