import { useState, useRef, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Sparkles, CheckCircle2, FolderKanban, ListChecks } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { InterestArea } from "@shared/schema";

interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
}

interface RoadmapTask {
  title: string;
  description: string;
  estimatedEffort: number;
  priority: "low" | "medium" | "high";
}

interface RoadmapProject {
  name: string;
  description: string;
  estimatedEffort: number;
  tasks: RoadmapTask[];
}

interface InterestAreaRoadmapDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  interestArea: InterestArea | null;
  onRoadmapAccepted?: (roadmap: RoadmapProject[]) => void;
}

export function InterestAreaRoadmapDialog({
  open,
  onOpenChange,
  interestArea,
  onRoadmapAccepted,
}: InterestAreaRoadmapDialogProps) {
  const [conversationHistory, setConversationHistory] = useState<ConversationMessage[]>([]);
  const [userMessage, setUserMessage] = useState("");
  const [currentRoadmap, setCurrentRoadmap] = useState<RoadmapProject[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Reset state when dialog opens/closes or interest area changes
  useEffect(() => {
    if (open && interestArea) {
      setConversationHistory([]);
      setUserMessage("");
      setCurrentRoadmap([]);
    }
  }, [open, interestArea?.id]);

  // Auto scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversationHistory]);

  const chatMutation = useMutation({
    mutationFn: async (message: string) => {
      if (!interestArea) throw new Error("No interest area selected");

      const response = await apiRequest("POST", "/api/ai/interest-area-roadmap-chat", {
        interestAreaId: interestArea.id,
        userMessage: message,
        conversationHistory,
      });

      return response.json();
    },
    onSuccess: (data: { message: string; hasRoadmap: boolean; roadmap?: RoadmapProject[] }) => {
      // Add user message
      setConversationHistory(prev => [
        ...prev,
        { role: "user", content: userMessage },
        { role: "assistant", content: data.message },
      ]);

      // Update roadmap if provided
      if (data.hasRoadmap && data.roadmap) {
        setCurrentRoadmap(data.roadmap);
      }

      setUserMessage("");
    },
    onError: (error: any) => {
      toast({
        title: "Errore",
        description: error.message || "Impossibile processare il messaggio",
        variant: "destructive",
      });
    },
  });

  const handleSendMessage = () => {
    if (!userMessage.trim()) return;
    chatMutation.mutate(userMessage);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleAcceptRoadmap = () => {
    if (currentRoadmap.length === 0) {
      toast({
        title: "Nessuna Roadmap",
        description: "Non c'è ancora una roadmap da accettare. Chiedi all'AI di generarne una!",
        variant: "destructive",
      });
      return;
    }

    onRoadmapAccepted?.(currentRoadmap);
    toast({
      title: "Roadmap Accettata!",
      description: `${currentRoadmap.length} progetti pronti per essere inseriti.`,
    });
    onOpenChange(false);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "text-red-600 dark:text-red-400";
      case "medium": return "text-yellow-600 dark:text-yellow-400";
      case "low": return "text-green-600 dark:text-green-400";
      default: return "";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[85vh] overflow-hidden flex flex-col" data-testid="dialog-roadmap-chat">
        <DialogHeader>
          <DialogTitle data-testid="text-roadmap-title" className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-500" />
            {interestArea?.name ? `Roadmap AI - ${interestArea.name}` : "Roadmap AI"}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 grid grid-cols-2 gap-4 overflow-hidden">
          {/* Chat Area */}
          <Card className="flex flex-col overflow-hidden" data-testid="card-chat">
            <CardHeader className="pb-3">
              <CardTitle className="text-base" data-testid="text-chat-title">
                Conversazione
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col overflow-hidden p-4">
              <ScrollArea className="flex-1 pr-4" data-testid="scroll-chat">
                <div className="space-y-4">
                  {conversationHistory.length === 0 && (
                    <div className="text-sm text-muted-foreground space-y-2" data-testid="text-chat-empty">
                      <p className="font-semibold">💡 Suggerimenti per iniziare:</p>
                      <ul className="list-disc list-inside space-y-1 text-xs">
                        <li>"Voglio imparare React da zero"</li>
                        <li>"Ho 10 ore a settimana, cosa posso fare?"</li>
                        <li>"Crea un percorso per diventare esperto in Python"</li>
                      </ul>
                    </div>
                  )}
                  {conversationHistory.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                      data-testid={`message-${msg.role}-${idx}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg px-4 py-2 ${
                          msg.role === "user"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                      </div>
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </div>
              </ScrollArea>
              <div className="flex gap-2 mt-4" data-testid="div-chat-input">
                <Input
                  placeholder="Scrivi un messaggio..."
                  value={userMessage}
                  onChange={(e) => setUserMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  disabled={chatMutation.isPending || !interestArea}
                  data-testid="input-chat-message"
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!userMessage.trim() || chatMutation.isPending || !interestArea}
                  data-testid="button-send-message"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Roadmap Preview */}
          <Card className="flex flex-col overflow-hidden" data-testid="card-roadmap">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center justify-between" data-testid="text-roadmap-preview-title">
                <span>Roadmap Proposta</span>
                {currentRoadmap.length > 0 && (
                  <Button
                    size="sm"
                    onClick={handleAcceptRoadmap}
                    className="gap-2"
                    data-testid="button-accept-roadmap"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Accetta & Inserisci
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden p-4">
              <ScrollArea className="h-full" data-testid="scroll-roadmap">
                {currentRoadmap.length === 0 ? (
                  <div className="text-sm text-muted-foreground text-center py-8" data-testid="text-no-roadmap">
                    <Sparkles className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p>Nessuna roadmap ancora.</p>
                    <p className="text-xs mt-1">Chatta con l'AI per generare un percorso!</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {currentRoadmap.map((project, pIdx) => (
                      <div
                        key={pIdx}
                        className="border rounded-lg p-3 space-y-2"
                        data-testid={`roadmap-project-${pIdx}`}
                      >
                        <div className="flex items-start gap-2">
                          <FolderKanban className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-sm">{project.name}</h4>
                            <p className="text-xs text-muted-foreground mt-1">
                              {project.description}
                            </p>
                            <div className="flex items-center gap-2 mt-2 text-xs">
                              <span className="text-muted-foreground">
                                ⏱️ {project.estimatedEffort}h totali
                              </span>
                              <span className="text-muted-foreground">
                                • {project.tasks.length} task
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Tasks */}
                        <div className="ml-7 space-y-2 mt-3">
                          {project.tasks.map((task, tIdx) => (
                            <div
                              key={tIdx}
                              className="flex items-start gap-2 text-xs bg-muted/50 rounded p-2"
                              data-testid={`roadmap-task-${pIdx}-${tIdx}`}
                            >
                              <ListChecks className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="font-medium">{task.title}</p>
                                <p className="text-muted-foreground mt-0.5">
                                  {task.description}
                                </p>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-muted-foreground">
                                    {task.estimatedEffort}h
                                  </span>
                                  <span className={`font-medium ${getPriorityColor(task.priority)}`}>
                                    {task.priority}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
