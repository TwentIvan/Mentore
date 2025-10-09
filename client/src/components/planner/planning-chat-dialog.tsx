import { useState, useRef, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageSquare, Send, Edit, Check, X } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface PlanningWindowSuggestion {
  projectId?: string;
  projectName?: string;
  interestAreaId: string;
  interestAreaName: string;
  name: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  daysOfWeek: number[];
  recurrenceType: 'none' | 'weekly';
  recurrenceInterval: number;
  recurrenceEnd: string;
  reasoning: string;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface PlanningChatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialSuggestions: PlanningWindowSuggestion[];
  onApply: (suggestions: PlanningWindowSuggestion[]) => void;
}

export function PlanningChatDialog({ open, onOpenChange, initialSuggestions, onApply }: PlanningChatDialogProps) {
  const [suggestions, setSuggestions] = useState<PlanningWindowSuggestion[]>(initialSuggestions);
  const [conversationHistory, setConversationHistory] = useState<ChatMessage[]>([]);
  const [userMessage, setUserMessage] = useState("");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editedSuggestion, setEditedSuggestion] = useState<PlanningWindowSuggestion | null>(null);
  const { toast } = useToast();
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Update suggestions when initialSuggestions change
  useEffect(() => {
    setSuggestions(initialSuggestions);
  }, [initialSuggestions]);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversationHistory]);

  const chatMutation = useMutation({
    mutationFn: async (message: string) => {
      const res = await apiRequest("POST", "/api/ai/chat-planning", {
        currentSuggestions: suggestions,
        conversationHistory,
        userMessage: message
      });
      return res.json();
    },
    onSuccess: (data) => {
      // Add AI response to conversation
      setConversationHistory(prev => [
        ...prev,
        { role: "user", content: userMessage },
        { role: "assistant", content: data.message }
      ]);

      // Update suggestions if AI modified them
      if (data.hasUpdates && data.updatedSuggestions) {
        setSuggestions(data.updatedSuggestions);
        toast({
          title: "Proposte aggiornate",
          description: "L'AI ha modificato le proposte secondo le tue richieste",
        });
      }

      setUserMessage("");
    },
    onError: () => {
      toast({
        title: "Errore",
        description: "Impossibile inviare il messaggio",
        variant: "destructive",
      });
    },
  });

  const handleSendMessage = () => {
    if (!userMessage.trim()) return;
    chatMutation.mutate(userMessage);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleEditSuggestion = (index: number) => {
    setEditingIndex(index);
    setEditedSuggestion({ ...suggestions[index] });
  };

  const handleSaveEdit = () => {
    if (editingIndex !== null && editedSuggestion) {
      const newSuggestions = [...suggestions];
      newSuggestions[editingIndex] = editedSuggestion;
      setSuggestions(newSuggestions);
      setEditingIndex(null);
      setEditedSuggestion(null);
      toast({
        title: "Modifica salvata",
        description: "La planning window è stata modificata",
      });
    }
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
    setEditedSuggestion(null);
  };

  const handleDeleteSuggestion = (index: number) => {
    const newSuggestions = suggestions.filter((_, i) => i !== index);
    setSuggestions(newSuggestions);
    toast({
      title: "Proposta eliminata",
      description: "La planning window è stata rimossa",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[85vh] overflow-hidden flex flex-col" data-testid="dialog-planning-chat">
        <DialogHeader>
          <DialogTitle data-testid="text-planning-chat-title">
            Proposte Pianificazione - Chat & Modifica
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="chat" className="flex-1 flex flex-col overflow-hidden" data-testid="tabs-planning-chat">
          <TabsList className="grid w-full grid-cols-2 max-w-md" data-testid="tabslist-planning">
            <TabsTrigger value="chat" data-testid="tab-chat">
              <MessageSquare className="h-4 w-4 mr-2" />
              Chat AI
            </TabsTrigger>
            <TabsTrigger value="edit" data-testid="tab-edit">
              <Edit className="h-4 w-4 mr-2" />
              Modifica Manuale
            </TabsTrigger>
          </TabsList>

          <TabsContent value="chat" className="flex-1 flex flex-col overflow-hidden" data-testid="tabcontent-chat">
            <div className="flex-1 grid grid-cols-2 gap-4 overflow-hidden">
              {/* Chat Area */}
              <Card className="flex flex-col overflow-hidden" data-testid="card-chat">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base" data-testid="text-chat-title">Conversazione</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col overflow-hidden p-4">
                  <ScrollArea className="flex-1 pr-4" data-testid="scroll-chat">
                    <div className="space-y-4">
                      {conversationHistory.length === 0 && (
                        <p className="text-sm text-muted-foreground" data-testid="text-chat-empty">
                          Inizia a chattare con l'AI per discutere le proposte di pianificazione.
                          Puoi chiedere spiegazioni, richiedere modifiche o aggiungere nuove finestre.
                        </p>
                      )}
                      {conversationHistory.map((msg, idx) => (
                        <div
                          key={idx}
                          className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                          data-testid={`message-${msg.role}-${idx}`}
                        >
                          <div
                            className={`max-w-[80%] rounded-lg px-4 py-2 ${
                              msg.role === 'user'
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted'
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
                      disabled={chatMutation.isPending}
                      data-testid="input-chat-message"
                    />
                    <Button
                      onClick={handleSendMessage}
                      disabled={!userMessage.trim() || chatMutation.isPending}
                      data-testid="button-send-message"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Suggestions Preview */}
              <Card className="flex flex-col overflow-hidden" data-testid="card-suggestions">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base" data-testid="text-suggestions-title">
                    Proposte Correnti ({suggestions.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 overflow-hidden p-4">
                  <ScrollArea className="h-full" data-testid="scroll-suggestions">
                    <div className="space-y-3">
                      {suggestions.map((suggestion, index) => (
                        <Card key={index} data-testid={`card-suggestion-preview-${index}`}>
                          <CardHeader className="p-3">
                            <CardTitle className="text-sm" data-testid={`text-suggestion-preview-name-${index}`}>
                              {suggestion.name}
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="p-3 pt-0 text-xs space-y-1">
                            <p data-testid={`text-suggestion-preview-area-${index}`}>
                              <span className="font-medium">Area:</span> {suggestion.interestAreaName}
                              {suggestion.projectName && ` • ${suggestion.projectName}`}
                            </p>
                            <p data-testid={`text-suggestion-preview-time-${index}`}>
                              <span className="font-medium">Orario:</span> {suggestion.startTime} - {suggestion.endTime}
                            </p>
                            <p data-testid={`text-suggestion-preview-days-${index}`}>
                              <span className="font-medium">Giorni:</span>{' '}
                              {suggestion.daysOfWeek.map((d: number) => 
                                ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'][d - 1]
                              ).join(', ')}
                            </p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="edit" className="flex-1 overflow-hidden" data-testid="tabcontent-edit">
            <ScrollArea className="h-full" data-testid="scroll-edit">
              <div className="space-y-4 pr-4">
                {suggestions.map((suggestion, index) => (
                  <Card key={index} data-testid={`card-edit-${index}`}>
                    {editingIndex === index && editedSuggestion ? (
                      <CardContent className="p-4 space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-sm font-medium">Nome</label>
                            <Input
                              value={editedSuggestion.name}
                              onChange={(e) => setEditedSuggestion({ ...editedSuggestion, name: e.target.value })}
                              data-testid={`input-edit-name-${index}`}
                            />
                          </div>
                          <div>
                            <label className="text-sm font-medium">Area Interesse</label>
                            <Input value={editedSuggestion.interestAreaName} disabled />
                          </div>
                          <div>
                            <label className="text-sm font-medium">Ora Inizio</label>
                            <Input
                              type="time"
                              value={editedSuggestion.startTime}
                              onChange={(e) => setEditedSuggestion({ ...editedSuggestion, startTime: e.target.value })}
                              data-testid={`input-edit-start-time-${index}`}
                            />
                          </div>
                          <div>
                            <label className="text-sm font-medium">Ora Fine</label>
                            <Input
                              type="time"
                              value={editedSuggestion.endTime}
                              onChange={(e) => setEditedSuggestion({ ...editedSuggestion, endTime: e.target.value })}
                              data-testid={`input-edit-end-time-${index}`}
                            />
                          </div>
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={handleCancelEdit} data-testid={`button-cancel-edit-${index}`}>
                            <X className="h-4 w-4 mr-1" />
                            Annulla
                          </Button>
                          <Button size="sm" onClick={handleSaveEdit} data-testid={`button-save-edit-${index}`}>
                            <Check className="h-4 w-4 mr-1" />
                            Salva
                          </Button>
                        </div>
                      </CardContent>
                    ) : (
                      <>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base" data-testid={`text-edit-name-${index}`}>
                            {suggestion.name}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="font-medium">Area:</span> {suggestion.interestAreaName}
                              {suggestion.projectName && ` • ${suggestion.projectName}`}
                            </div>
                            <div>
                              <span className="font-medium">Orario:</span> {suggestion.startTime} - {suggestion.endTime}
                            </div>
                            <div>
                              <span className="font-medium">Giorni:</span>{' '}
                              {suggestion.daysOfWeek.map((d: number) => 
                                ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'][d - 1]
                              ).join(', ')}
                            </div>
                            <div>
                              <span className="font-medium">Periodo:</span>{' '}
                              {new Date(suggestion.startDate).toLocaleDateString()} -{' '}
                              {new Date(suggestion.endDate).toLocaleDateString()}
                            </div>
                          </div>
                          <div className="pt-2 text-sm text-muted-foreground">
                            <span className="font-medium">Motivazione:</span> {suggestion.reasoning}
                          </div>
                          <div className="flex justify-end gap-2 pt-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteSuggestion(index)}
                              data-testid={`button-delete-${index}`}
                            >
                              <X className="h-4 w-4 mr-1" />
                              Elimina
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditSuggestion(index)}
                              data-testid={`button-edit-${index}`}
                            >
                              <Edit className="h-4 w-4 mr-1" />
                              Modifica
                            </Button>
                          </div>
                        </CardContent>
                      </>
                    )}
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-3 pt-4 border-t" data-testid="div-footer-actions">
          <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="button-close">
            Chiudi
          </Button>
          <Button onClick={() => onApply(suggestions)} data-testid="button-apply">
            Applica Pianificazione ({suggestions.length})
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
