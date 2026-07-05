import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Check, X, Clock, AlertCircle, Sparkles, Loader2, RefreshCw, Wand2 } from "lucide-react";
import { apiRequest, getQueryFn, queryClient } from "@/lib/queryClient";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import type { BudgetProposal } from "@shared/schema";
import { useOrganization } from "@/contexts/organization-context";

export default function BudgetProposalsTab() {
  const [selectedProposal, setSelectedProposal] = useState<BudgetProposal | null>(null);
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [showApplyDialog, setShowApplyDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [note, setNote] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "accepted" | "rejected">("all");
  const { toast } = useToast();
  const { currentOrganizationId } = useOrganization();

  const { data: proposals = [], isLoading, refetch } = useQuery<BudgetProposal[]>({
    queryKey: ["/api/budget-proposals"],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!currentOrganizationId,
    refetchInterval: 5000,
    refetchIntervalInBackground: true,
  });

  useEffect(() => {
    if (selectedProposal && proposals.length > 0) {
      const updated = proposals.find(p => p.id === selectedProposal.id);
      if (updated && JSON.stringify(updated.proposalData) !== JSON.stringify(selectedProposal.proposalData)) {
        setSelectedProposal(updated);
      }
    }
  }, [proposals, selectedProposal]);

  const generateMutation = useMutation({
    mutationFn: (userNote: string) =>
      apiRequest("POST", "/api/budget-proposals/generate", { note: userNote }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/budget-proposals"] });
      toast({
        title: "Analisi avviata",
        description: "L'AI sta elaborando una proposta di struttura budget",
      });
      setShowGenerateDialog(false);
      setNote("");
    },
    onError: (error: any) => {
      toast({
        title: "Errore",
        description: error.message || "Impossibile avviare l'analisi",
        variant: "destructive",
      });
    },
  });

  const applyProposalMutation = useMutation({
    mutationFn: (proposalId: string) =>
      apiRequest("POST", `/api/budget-proposals/${proposalId}/apply`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/budget-proposals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/budget-categories"] });
      queryClient.invalidateQueries({ queryKey: ["/api/budget-plan-items"] });
      toast({
        title: "Proposta applicata",
        description: "Categorie e voci di piano sono state create con successo",
      });
      setShowApplyDialog(false);
      setSelectedProposal(null);
    },
    onError: (error: any) => {
      toast({
        title: "Errore",
        description: error.message || "Impossibile applicare la proposta",
        variant: "destructive",
      });
    },
  });

  const rejectProposalMutation = useMutation({
    mutationFn: (proposalId: string) =>
      apiRequest("POST", `/api/budget-proposals/${proposalId}/reject`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/budget-proposals"] });
      toast({ title: "Proposta rigettata", description: "La proposta è stata rigettata" });
      setShowRejectDialog(false);
      setSelectedProposal(null);
    },
    onError: (error: any) => {
      toast({
        title: "Errore",
        description: error.message || "Impossibile rigettare la proposta",
        variant: "destructive",
      });
    },
  });

  const deleteProposalMutation = useMutation({
    mutationFn: (proposalId: string) =>
      apiRequest("DELETE", `/api/budget-proposals/${proposalId}`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/budget-proposals"] });
      toast({ title: "Proposta eliminata", description: "La proposta è stata eliminata" });
      setSelectedProposal(null);
    },
    onError: (error: any) => {
      toast({
        title: "Errore",
        description: error.message || "Impossibile eliminare la proposta",
        variant: "destructive",
      });
    },
  });

  const filteredProposals = proposals.filter((p) => {
    if (statusFilter === "all") return true;
    return p.status === statusFilter;
  });

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: "In sospeso", icon: Clock, className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200" },
      accepted: { label: "Accettata", icon: Check, className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
      rejected: { label: "Rigettata", icon: X, className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" },
      partially_accepted: { label: "Parzialmente accettata", icon: AlertCircle, className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" },
    };
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const Icon = config.icon;
    return (
      <Badge className={config.className}>
        <Icon className="w-3 h-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  const renderProposalData = (proposalData: any) => {
    if (!proposalData || proposalData.processing) {
      return (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Analisi in corso...</span>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {proposalData.reasoning && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                Ragionamento AI
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{proposalData.reasoning}</p>
            </CardContent>
          </Card>
        )}

        {proposalData.categories && proposalData.categories.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Categorie ({proposalData.categories.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {proposalData.categories.map((category: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between border-l-2 border-primary pl-3 py-1">
                    <div>
                      <span className="font-medium">{category.name}</span>
                      <Badge variant="outline" className="ml-2">{category.type === "income" ? "Entrata" : "Spesa"}</Badge>
                    </div>
                    {category.isNew ? (
                      <Badge variant="secondary">Nuova</Badge>
                    ) : (
                      <Badge variant="secondary">Esistente</Badge>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {proposalData.planItems && proposalData.planItems.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Voci pianificate ({proposalData.planItems.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {proposalData.planItems.map((item: any, idx: number) => (
                  <div key={idx} className="border-l-2 border-primary pl-3 py-1">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="font-medium">{item.name}</div>
                        <div className="text-sm text-muted-foreground">{item.categoryName}</div>
                        {item.notes && <div className="text-sm text-muted-foreground italic">{item.notes}</div>}
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <Badge variant="outline">{item.type === "income" ? "Entrata" : "Spesa"}</Badge>
                        <span className="text-sm font-medium">{Number(item.amount).toFixed(2)} €</span>
                        <span className="text-xs text-muted-foreground">
                          {item.intervalMonths ? `ogni ${item.intervalMonths} mesi` : "una tantum"}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2" data-testid="text-budget-proposals-title">
            <Sparkles className="w-5 h-5" />
            Proposte AI struttura budget
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            Genera una proposta di categorie e voci pianificate basata sullo storico dei movimenti
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            data-testid="button-refresh-budget-proposals"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Ricarica
          </Button>
          <Button
            size="sm"
            onClick={() => setShowGenerateDialog(true)}
            data-testid="button-generate-budget-proposal"
          >
            <Wand2 className="w-4 h-4 mr-2" />
            Genera proposta
          </Button>
        </div>
      </div>

      <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
        <TabsList>
          <TabsTrigger value="all" data-testid="tab-all-budget-proposals">Tutte ({proposals.length})</TabsTrigger>
          <TabsTrigger value="pending" data-testid="tab-pending-budget-proposals">
            In sospeso ({proposals.filter(p => p.status === 'pending').length})
          </TabsTrigger>
          <TabsTrigger value="accepted" data-testid="tab-accepted-budget-proposals">
            Accettate ({proposals.filter(p => p.status === 'accepted').length})
          </TabsTrigger>
          <TabsTrigger value="rejected" data-testid="tab-rejected-budget-proposals">
            Rigettate ({proposals.filter(p => p.status === 'rejected').length})
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-sm">Proposte</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : filteredProposals.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">Nessuna proposta trovata</div>
            ) : (
              <ScrollArea className="h-[500px]">
                <div className="space-y-2">
                  {filteredProposals.map((proposal) => (
                    <Card
                      key={proposal.id}
                      className={`cursor-pointer transition-colors ${
                        selectedProposal?.id === proposal.id ? "border-primary" : "hover:bg-accent"
                      }`}
                      onClick={() => setSelectedProposal(proposal)}
                      data-testid={`card-budget-proposal-${proposal.id}`}
                    >
                      <CardContent className="p-4">
                        <div className="space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            {getStatusBadge(proposal.status)}
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(proposal.createdAt), "dd MMM yyyy HH:mm", { locale: it })}
                            </span>
                          </div>
                          {proposal.userNote && (
                            <div className="text-xs text-muted-foreground line-clamp-2">{proposal.userNote}</div>
                          )}
                          {proposal.errorMessage && (
                            <div className="text-xs text-destructive flex items-start gap-1">
                              <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                              <span>{proposal.errorMessage}</span>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm">Dettaglio Proposta</CardTitle>
          </CardHeader>
          <CardContent>
            {!selectedProposal ? (
              <div className="text-center py-12 text-muted-foreground">
                Seleziona una proposta per visualizzarne i dettagli
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      {getStatusBadge(selectedProposal.status)}
                      <span className="text-sm text-muted-foreground">
                        Creata il {format(new Date(selectedProposal.createdAt), "dd MMMM yyyy 'alle' HH:mm", { locale: it })}
                      </span>
                    </div>
                    {selectedProposal.appliedAt && (
                      <div className="text-sm text-muted-foreground">
                        Applicata il {format(new Date(selectedProposal.appliedAt), "dd MMMM yyyy 'alle' HH:mm", { locale: it })}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {selectedProposal.status === "pending" && !(selectedProposal.proposalData as any)?.processing && (
                      <>
                        <Button size="sm" variant="default" onClick={() => setShowApplyDialog(true)} data-testid="button-apply-budget-proposal">
                          <Check className="w-4 h-4 mr-1" />
                          Applica
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => setShowRejectDialog(true)} data-testid="button-reject-budget-proposal">
                          <X className="w-4 h-4 mr-1" />
                          Rigetta
                        </Button>
                      </>
                    )}
                    {selectedProposal.status !== "pending" && (
                      <Button size="sm" variant="destructive" onClick={() => deleteProposalMutation.mutate(selectedProposal.id)} data-testid="button-delete-budget-proposal">
                        Elimina
                      </Button>
                    )}
                  </div>
                </div>

                <ScrollArea className="h-[420px]">
                  {renderProposalData(selectedProposal.proposalData)}
                </ScrollArea>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={showGenerateDialog} onOpenChange={setShowGenerateDialog}>
        <DialogContent data-testid="dialog-generate-budget-proposal">
          <DialogHeader>
            <DialogTitle>Genera proposta struttura budget</DialogTitle>
            <DialogDescription>
              L'AI analizzerà lo storico dei movimenti registrati per proporre categorie e voci di piano.
              Puoi aggiungere una nota facoltativa su obiettivi o contesto (es. "vorrei risparmiare 200€ in più al mese").
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Nota facoltativa..."
            rows={4}
            data-testid="input-budget-proposal-note"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGenerateDialog(false)} data-testid="button-cancel-generate-budget-proposal">
              Annulla
            </Button>
            <Button
              onClick={() => generateMutation.mutate(note)}
              disabled={generateMutation.isPending}
              data-testid="button-confirm-generate-budget-proposal"
            >
              {generateMutation.isPending ? "Avvio..." : "Genera"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showApplyDialog} onOpenChange={setShowApplyDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Applicare la proposta?</AlertDialogTitle>
            <AlertDialogDescription>
              Questa azione creerà le categorie e le voci di piano proposte dall'AI. Questa operazione non può essere annullata.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-apply-budget-proposal">Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedProposal && applyProposalMutation.mutate(selectedProposal.id)}
              disabled={applyProposalMutation.isPending}
              data-testid="button-confirm-apply-budget-proposal"
            >
              {applyProposalMutation.isPending ? "Applicazione..." : "Applica"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rigettare la proposta?</AlertDialogTitle>
            <AlertDialogDescription>
              La proposta verrà marcata come rigettata e non verrà più mostrata tra quelle in sospeso.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-reject-budget-proposal">Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedProposal && rejectProposalMutation.mutate(selectedProposal.id)}
              disabled={rejectProposalMutation.isPending}
              data-testid="button-confirm-reject-budget-proposal"
            >
              {rejectProposalMutation.isPending ? "Rifiuto..." : "Rigetta"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
