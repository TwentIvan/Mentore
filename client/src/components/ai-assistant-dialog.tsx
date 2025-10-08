import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Sparkles, User, Bot, Check } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface InterestAreaSuggestion {
  name: string;
  description: string;
  color: string;
  reasoning: string;
}

interface AIAssistantDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAcceptSuggestions: (suggestions: InterestAreaSuggestion[]) => void;
}

export function AIAssistantDialog({ open, onOpenChange, onAcceptSuggestions }: AIAssistantDialogProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [suggestions, setSuggestions] = useState<InterestAreaSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const suggestMutation = useMutation({
    mutationFn: async (userMessage: string) => {
      const conversationHistory = messages.map(msg => ({
        role: msg.role === "assistant" ? "assistant" : "user",
        content: msg.content
      }));

      const res = await apiRequest("POST", "/api/ai/suggest-interest-areas", {
        userContext: userMessage,
        conversationHistory
      });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.needsMoreInfo && data.question) {
        setMessages(prev => [...prev, { role: "assistant", content: data.question }]);
      } else if (data.suggestions && data.suggestions.length > 0) {
        setSuggestions(data.suggestions);
        setShowSuggestions(true);
        setMessages(prev => [...prev, { 
          role: "assistant", 
          content: "Ecco le aree di interesse che ho creato per te basandomi sulle tue risposte. Puoi accettarle o continuare a parlare con me per modificarle." 
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
    onAcceptSuggestions(suggestions);
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl h-[80vh] flex flex-col" data-testid="dialog-ai-assistant">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-500" />
            Assistente AI - Aree di Interesse
          </DialogTitle>
          <DialogDescription>
            Parla con l'assistente AI per creare le tue aree di interesse personalizzate
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
                          Ciao! Sono qui per aiutarti a creare le tue aree di interesse. 
                          Parlami di come trascorri il tuo tempo, quali sono le tue priorità nella vita, 
                          e ti aiuterò a organizzarle in categorie significative.
                        </p>
                        <p className="text-sm mt-2 text-muted-foreground">
                          Inizia raccontandomi quali sono le principali attività o ambiti della tua vita.
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
                  Aree Suggerite
                </CardTitle>
                <CardDescription>
                  Ecco le aree di interesse create per te
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                  {suggestions.map((suggestion, index) => (
                    <div
                      key={index}
                      className="p-3 rounded-md border-2 border-muted hover:border-purple-300 dark:hover:border-purple-700 transition-colors"
                      data-testid={`suggestion-${index}`}
                    >
                      <div className="flex items-start gap-2">
                        <div
                          className="w-3 h-3 rounded-full mt-1"
                          style={{ backgroundColor: suggestion.color }}
                        />
                        <div className="flex-1">
                          <h4 className="font-semibold text-sm">{suggestion.name}</h4>
                          <p className="text-xs text-muted-foreground mt-1">
                            {suggestion.description}
                          </p>
                          <p className="text-xs text-purple-600 dark:text-purple-400 mt-1 italic">
                            {suggestion.reasoning}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button
                    data-testid="button-accept-suggestions"
                    onClick={handleAccept}
                    className="flex-1"
                  >
                    <Check className="h-4 w-4 mr-2" />
                    Accetta e Crea Aree
                  </Button>
                  <Button
                    data-testid="button-continue-chat"
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
              data-testid="input-ai-message"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
              placeholder="Scrivi qui la tua risposta..."
              disabled={suggestMutation.isPending}
            />
            <Button
              data-testid="button-send-message"
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
                data-testid="button-reset-chat"
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
