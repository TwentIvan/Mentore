import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Sparkles, User, Bot, Check } from "lucide-react";
import type { TimeAllocation } from "@/components/planner/interactive-time-allocation-pie-chart";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface TimeAllocationSuggestion {
  areaId: string;
  percentage: number;
  reasoning: string;
}

interface Area {
  id: string;
  name: string;
  description?: string;
}

interface TimeAllocationAIAssistantProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  areas: Area[];
  onAcceptAllocations: (allocations: TimeAllocation[]) => void;
}

export function TimeAllocationAIAssistant({ 
  open, 
  onOpenChange, 
  areas,
  onAcceptAllocations 
}: TimeAllocationAIAssistantProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [suggestions, setSuggestions] = useState<TimeAllocationSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const suggestMutation = useMutation({
    mutationFn: async (userMessage: string) => {
      const conversationHistory = messages.map(msg => ({
        role: msg.role === "assistant" ? "assistant" : "user",
        content: msg.content
      }));

      const res = await apiRequest("POST", "/api/ai/suggest-time-allocation", {
        areas: areas.map(a => ({ 
          id: a.id, 
          name: a.name, 
          description: a.description || "" 
        })),
        userContext: userMessage,
        conversationHistory
      });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.needsMoreInfo && data.question) {
        setMessages(prev => [...prev, { role: "assistant", content: data.question }]);
      } else if (data.allocations && data.allocations.length > 0) {
        setSuggestions(data.allocations);
        setShowSuggestions(true);
        setMessages(prev => [...prev, { 
          role: "assistant", 
          content: "Ecco come ti consiglio di distribuire il tuo tempo. Puoi accettare questa distribuzione o continuare a parlare con me per modificarla." 
        }]);
      }
    },
  });

  const handleSend = () => {
    if (!input.trim() || suggestMutation.isPending) return;

    const userMessage = input.trim();
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setInput("");
    setShowSuggestions(false);

    suggestMutation.mutate(userMessage);
  };

  const handleAccept = () => {
    // Map AI suggestions to TimeAllocation format
    const allocations: TimeAllocation[] = suggestions
      .filter(suggestion => {
        // Verify that the areaId exists in our areas
        const area = areas.find(a => a.id === suggestion.areaId);
        if (!area) {
          console.warn(`AI suggested unknown area ID: ${suggestion.areaId}`);
          return false;
        }
        return true;
      })
      .map(suggestion => {
        const area = areas.find(a => a.id === suggestion.areaId)!;
        return {
          id: suggestion.areaId,
          name: area.name,
          percentage: suggestion.percentage,
          color: `hsl(${Math.random() * 360}, 70%, 50%)`, // Generate random color
        };
      });

    if (allocations.length === 0) {
      console.error("No valid allocations found");
      return;
    }

    onAcceptAllocations(allocations);
    onOpenChange(false);
    setMessages([]);
    setSuggestions([]);
    setShowSuggestions(false);
  };

  const handleReset = () => {
    setMessages([]);
    setSuggestions([]);
    setShowSuggestions(false);
    setInput("");
  };

  const getAreaName = (areaId: string) => {
    return areas.find(a => a.id === areaId)?.name || areaId;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl h-[80vh] flex flex-col" data-testid="dialog-time-ai-assistant">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-500" />
            Assistente AI - Distribuzione Tempo
          </DialogTitle>
          <DialogDescription>
            Parla con l'assistente AI per distribuire il tuo tempo tra le aree di interesse
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 flex flex-col gap-4 overflow-hidden">
          {/* Chat Area */}
          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-4">
              {messages.length === 0 && (
                <Card className="bg-purple-50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-3">
                      <Bot className="h-5 w-5 text-purple-500 mt-1" />
                      <div>
                        <p className="text-sm">
                          Ciao! Sono qui per aiutarti a distribuire il tuo tempo tra queste aree:
                        </p>
                        <ul className="text-sm mt-2 space-y-1 ml-4 list-disc">
                          {areas.map(area => (
                            <li key={area.id}>{area.name}</li>
                          ))}
                        </ul>
                        <p className="text-sm mt-2 text-muted-foreground">
                          Dimmi quali sono le tue priorità, quanto tempo hai disponibile, e cosa vorresti realizzare.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex items-start gap-3 ${
                    message.role === "user" ? "flex-row-reverse" : ""
                  }`}
                  data-testid={`message-${message.role}-${index}`}
                >
                  <div className={`p-2 rounded-md ${
                    message.role === "user" 
                      ? "bg-primary text-primary-foreground" 
                      : "bg-muted"
                  }`}>
                    {message.role === "user" ? (
                      <User className="h-4 w-4" />
                    ) : (
                      <Bot className="h-4 w-4" />
                    )}
                  </div>
                  <div className={`flex-1 ${message.role === "user" ? "text-right" : ""}`}>
                    <div className={`inline-block p-3 rounded-lg ${
                      message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    }`}>
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    </div>
                  </div>
                </div>
              ))}

              {suggestMutation.isPending && (
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-md bg-muted">
                    <Bot className="h-4 w-4" />
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    L'assistente sta pensando...
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Suggestions */}
          {showSuggestions && suggestions.length > 0 && (
            <Card className="border-2 border-purple-200 dark:border-purple-800">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-purple-500" />
                  Distribuzione Suggerita
                </CardTitle>
                <CardDescription>
                  Ecco come l'AI consiglia di distribuire il tuo tempo
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 mb-4">
                  {suggestions.map((suggestion, index) => (
                    <div
                      key={index}
                      className="p-3 rounded-md border-2 border-muted hover:border-purple-300 dark:hover:border-purple-700 transition-colors"
                      data-testid={`suggestion-${index}`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-semibold text-sm">{getAreaName(suggestion.areaId)}</h4>
                        <span className="text-lg font-bold text-purple-600 dark:text-purple-400">
                          {suggestion.percentage}%
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground italic">
                        {suggestion.reasoning}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button
                    data-testid="button-accept-allocation"
                    onClick={handleAccept}
                    className="flex-1"
                  >
                    <Check className="h-4 w-4 mr-2" />
                    Accetta Distribuzione
                  </Button>
                  <Button
                    data-testid="button-continue-chat-allocation"
                    variant="outline"
                    onClick={() => setShowSuggestions(false)}
                  >
                    Continua a chattare
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Input Area */}
          <div className="flex gap-2">
            <Input
              data-testid="input-time-ai-message"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
              placeholder="Scrivi qui la tua risposta..."
              disabled={suggestMutation.isPending}
            />
            <Button
              data-testid="button-send-time-message"
              onClick={handleSend}
              disabled={!input.trim() || suggestMutation.isPending}
            >
              {suggestMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Invia"
              )}
            </Button>
            {messages.length > 0 && (
              <Button
                data-testid="button-reset-time-chat"
                variant="outline"
                onClick={handleReset}
              >
                Reset
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
