import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Save, Plus, FileText, Sparkles } from "lucide-react";
import { InteractiveTimeAllocationPieChart, type TimeAllocation } from "@/components/planner/interactive-time-allocation-pie-chart";
import { apiRequest, getQueryFn } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useOrganization } from "@/contexts/organization-context";
import type { InterestArea, TimeAllocationTemplate, Project } from "@shared/schema";

export default function TimePlannerPage() {
  const [showSaveTemplateDialog, setShowSaveTemplateDialog] = useState(false);
  const [showPlanningDialog, setShowPlanningDialog] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [templateDescription, setTemplateDescription] = useState("");
  const [currentAllocations, setCurrentAllocations] = useState<TimeAllocation[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [planningSuggestions, setPlanningSuggestions] = useState<any[]>([]);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { currentOrganizationId } = useOrganization();

  // Fetch interest areas
  const { data: interestAreas = [], isLoading: isLoadingAreas } = useQuery<InterestArea[]>({
    queryKey: ["/api/interest-areas", currentOrganizationId],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!currentOrganizationId,
  });

  // Fetch templates
  const { data: templates = [], isLoading: isLoadingTemplates } = useQuery<TimeAllocationTemplate[]>({
    queryKey: ["/api/time-allocation-templates", currentOrganizationId],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!currentOrganizationId,
  });

  // Fetch projects
  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["/api/projects", currentOrganizationId],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!currentOrganizationId,
  });

  // Save template mutation
  const saveTemplateMutation = useMutation({
    mutationFn: async (data: { name: string; description: string; allocations: TimeAllocation[] }) => {
      const res = await apiRequest("POST", "/api/time-allocation-templates", {
        name: data.name,
        description: data.description,
        allocations: data.allocations,
        isDefault: false,
        userId: "current", // Will be set by backend
        organizationId: currentOrganizationId,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/time-allocation-templates", currentOrganizationId] });
      setShowSaveTemplateDialog(false);
      setTemplateName("");
      setTemplateDescription("");
      toast({
        title: "Template salvato",
        description: "Il template di allocazione tempo è stato salvato con successo",
      });
    },
    onError: (error) => {
      toast({
        title: "Errore",
        description: "Impossibile salvare il template",
        variant: "destructive",
      });
    },
  });

  const handleSaveTemplate = () => {
    if (!templateName.trim()) {
      toast({
        title: "Nome richiesto",
        description: "Inserisci un nome per il template",
        variant: "destructive",
      });
      return;
    }

    const total = currentAllocations.reduce((sum, item) => sum + item.percentage, 0);
    if (Math.abs(total - 100) >= 0.01) {
      toast({
        title: "Allocazione non valida",
        description: "La somma delle percentuali deve essere 100%",
        variant: "destructive",
      });
      return;
    }

    saveTemplateMutation.mutate({
      name: templateName,
      description: templateDescription,
      allocations: currentAllocations,
    });
  };

  const loadTemplate = (template: TimeAllocationTemplate) => {
    setSelectedTemplateId(template.id);
    const allocations = (template.allocations as TimeAllocation[]) || [];
    setCurrentAllocations(allocations);
  };

  // AI Quick Allocation (no interview)
  const quickAISuggestMutation = useMutation({
    mutationFn: async () => {
      if (interestAreas.length === 0) {
        throw new Error("Nessuna area di interesse");
      }

      const res = await apiRequest("POST", "/api/ai/suggest-quick-time-allocation", {
        areas: interestAreas.map(a => ({
          id: a.id,
          name: a.name,
          description: a.description || ""
        }))
      });
      return res.json();
    },
    onSuccess: (data) => {
      const suggestions = data.allocations || [];
      
      const allocations: TimeAllocation[] = suggestions
        .filter((s: any) => interestAreas.find(a => a.id === s.areaId))
        .map((s: any) => {
          const area = interestAreas.find(a => a.id === s.areaId)!;
          return {
            id: s.areaId,
            name: area.name,
            percentage: s.percentage,
            color: area.color || `hsl(${Math.random() * 360}, 70%, 60%)`,
          };
        });

      if (allocations.length > 0) {
        setCurrentAllocations(allocations);
        setSelectedTemplateId(null);
        toast({
          title: "Distribuzione suggerita",
          description: "L'AI ha generato una distribuzione ragionata del tempo",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Errore",
        description: error.message || "Impossibile generare suggerimenti",
        variant: "destructive",
      });
    },
  });

  // AI Weekly Planning Suggestions
  const generatePlanningMutation = useMutation({
    mutationFn: async () => {
      if (currentAllocations.length === 0) {
        throw new Error("Nessuna allocazione tempo definita");
      }

      // Prepara i progetti con le aree di interesse associate (opzionali)
      const projectsWithAreas = projects
        .filter(p => p.interestAreaId)
        .map(p => {
          const area = interestAreas.find(a => a.id === p.interestAreaId);
          return {
            id: p.id,
            name: p.name,
            interestAreaId: p.interestAreaId!,
            interestAreaName: area?.name || 'Unknown',
            estimatedEffort: p.estimatedEffort || undefined
          };
        });

      const template = {
        name: templateName || "Allocazione Corrente",
        allocations: currentAllocations,
        totalHoursPerWeek: 80 // default
      };

      const res = await apiRequest("POST", "/api/ai/suggest-weekly-planning", {
        template,
        projects: projectsWithAreas.length > 0 ? projectsWithAreas : undefined,
        interestAreas: interestAreas.map(a => ({
          id: a.id,
          name: a.name,
          description: a.description || undefined
        }))
      });
      return res.json();
    },
    onSuccess: (data) => {
      setPlanningSuggestions(data.suggestions || []);
      setShowPlanningDialog(true);
      toast({
        title: "Pianificazione generata",
        description: `L'AI ha proposto ${data.suggestions?.length || 0} planning windows`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Errore",
        description: error.message || "Impossibile generare pianificazione",
        variant: "destructive",
      });
    },
  });

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <Header
          title="Time Planner"
          subtitle="Pianifica e visualizza l'allocazione del tuo tempo"
          onNewClick={() => setShowSaveTemplateDialog(true)}
        />

        <div className="p-6 space-y-6">
          <Tabs defaultValue="planner" className="w-full" data-testid="tabs-time-planner">
            <TabsList className="grid w-full grid-cols-2 max-w-md" data-testid="tabslist-planner">
              <TabsTrigger value="planner" data-testid="tab-planner">Planner</TabsTrigger>
              <TabsTrigger value="templates" data-testid="tab-templates">Templates</TabsTrigger>
            </TabsList>

            <TabsContent value="planner" className="space-y-6" data-testid="tabcontent-planner">
              {/* Quick Actions */}
              <Card data-testid="card-quick-actions">
                <CardHeader>
                  <CardTitle data-testid="text-quick-actions-title">Quick Actions</CardTitle>
                  <CardDescription data-testid="text-quick-actions-description">
                    Inizia rapidamente con template o aree di interesse
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex gap-3 flex-wrap">
                  <Button
                    variant="outline"
                    onClick={() => quickAISuggestMutation.mutate()}
                    disabled={isLoadingAreas || interestAreas.length === 0 || quickAISuggestMutation.isPending}
                    data-testid="button-quick-ai-suggest"
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    {quickAISuggestMutation.isPending ? "Generazione..." : "Suggerisci con AI"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setCurrentAllocations([])}
                    data-testid="button-start-blank"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Inizia da Zero
                  </Button>
                </CardContent>
              </Card>

              {/* Interactive Pie Chart */}
              <InteractiveTimeAllocationPieChart
                initialAllocations={currentAllocations}
                onAllocationsChange={setCurrentAllocations}
                editable={true}
                availableAreas={interestAreas.map(area => ({
                  id: area.id,
                  name: area.name,
                  description: area.description || undefined
                }))}
              />

              {/* Save Actions */}
              <Card data-testid="card-save-actions">
                <CardContent className="pt-6">
                  <div className="flex gap-3 justify-end">
                    <Button
                      variant="outline"
                      onClick={() => generatePlanningMutation.mutate()}
                      disabled={currentAllocations.length === 0 || generatePlanningMutation.isPending}
                      data-testid="button-generate-planning"
                    >
                      <Sparkles className="h-4 w-4 mr-2" />
                      {generatePlanningMutation.isPending ? "Generazione..." : "Genera Pianificazione AI"}
                    </Button>
                    <Button
                      onClick={() => setShowSaveTemplateDialog(true)}
                      disabled={currentAllocations.length === 0}
                      data-testid="button-save-template"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      Salva come Template
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="templates" className="space-y-4" data-testid="tabcontent-templates">
              {isLoadingTemplates ? (
                <Card data-testid="card-loading">
                  <CardContent className="py-12 text-center">
                    <p className="text-muted-foreground" data-testid="text-loading">Caricamento templates...</p>
                  </CardContent>
                </Card>
              ) : templates.length === 0 ? (
                <Card data-testid="card-no-templates">
                  <CardContent className="py-12 text-center">
                    <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2" data-testid="text-no-templates-title">Nessun template</h3>
                    <p className="text-muted-foreground mb-4" data-testid="text-no-templates-description">
                      Crea il tuo primo template di allocazione tempo
                    </p>
                    <Button onClick={() => setShowSaveTemplateDialog(true)} data-testid="button-create-first-template">
                      <Plus className="h-4 w-4 mr-2" />
                      Crea Template
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3" data-testid="grid-templates">
                  {templates.map((template) => (
                    <Card
                      key={template.id}
                      className={`cursor-pointer hover:border-primary transition-colors ${
                        selectedTemplateId === template.id ? "border-primary" : ""
                      }`}
                      onClick={() => loadTemplate(template)}
                      data-testid={`card-template-${template.id}`}
                    >
                      <CardHeader>
                        <CardTitle className="text-base" data-testid={`text-template-name-${template.id}`}>
                          {template.name}
                        </CardTitle>
                        {template.description && (
                          <CardDescription data-testid={`text-template-description-${template.id}`}>
                            {template.description}
                          </CardDescription>
                        )}
                      </CardHeader>
                      <CardContent>
                        <InteractiveTimeAllocationPieChart
                          initialAllocations={(template.allocations as TimeAllocation[]) || []}
                          editable={false}
                        />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>

      {/* Save Template Dialog */}
      <Dialog open={showSaveTemplateDialog} onOpenChange={setShowSaveTemplateDialog}>
        <DialogContent data-testid="dialog-save-template">
          <DialogHeader>
            <DialogTitle data-testid="text-dialog-title">Salva Template</DialogTitle>
            <DialogDescription data-testid="text-dialog-description">
              Salva questa allocazione come template riutilizzabile
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="template-name" data-testid="label-template-name">Nome Template</Label>
              <Input
                id="template-name"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="Es: Work-Life Balance"
                data-testid="input-template-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="template-description" data-testid="label-template-description">Descrizione (opzionale)</Label>
              <Textarea
                id="template-description"
                value={templateDescription}
                onChange={(e) => setTemplateDescription(e.target.value)}
                placeholder="Descrivi questo template..."
                rows={3}
                data-testid="textarea-template-description"
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setShowSaveTemplateDialog(false)}
                data-testid="button-cancel-save"
              >
                Annulla
              </Button>
              <Button
                onClick={handleSaveTemplate}
                disabled={saveTemplateMutation.isPending}
                data-testid="button-confirm-save"
              >
                {saveTemplateMutation.isPending ? "Salvataggio..." : "Salva"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Planning Suggestions Dialog */}
      <Dialog open={showPlanningDialog} onOpenChange={setShowPlanningDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto" data-testid="dialog-planning-suggestions">
          <DialogHeader>
            <DialogTitle data-testid="text-planning-title">Proposte Pianificazione Settimanale</DialogTitle>
            <DialogDescription data-testid="text-planning-description">
              L'AI ha generato {planningSuggestions.length} planning windows basate sul tuo template
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {planningSuggestions.map((suggestion, index) => (
              <Card key={index} data-testid={`card-suggestion-${index}`}>
                <CardHeader>
                  <CardTitle className="text-base" data-testid={`text-suggestion-name-${index}`}>
                    {suggestion.name}
                  </CardTitle>
                  <CardDescription data-testid={`text-suggestion-project-${index}`}>
                    Area: {suggestion.interestAreaName}
                    {suggestion.projectName && ` • Progetto: ${suggestion.projectName}`}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Orario:</span> {suggestion.startTime} - {suggestion.endTime}
                    </div>
                    <div>
                      <span className="font-medium">Giorni:</span> {suggestion.daysOfWeek.map((d: number) => 
                        ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'][d - 1]
                      ).join(', ')}
                    </div>
                    <div>
                      <span className="font-medium">Periodo:</span> {new Date(suggestion.startDate).toLocaleDateString()} - {new Date(suggestion.endDate).toLocaleDateString()}
                    </div>
                    <div>
                      <span className="font-medium">Ricorrenza:</span> {suggestion.recurrenceType === 'weekly' ? 'Settimanale' : 'Singola'}
                    </div>
                  </div>
                  <div className="pt-2 text-sm text-muted-foreground" data-testid={`text-suggestion-reasoning-${index}`}>
                    <span className="font-medium">Motivazione:</span> {suggestion.reasoning}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => setShowPlanningDialog(false)}
              data-testid="button-close-planning"
            >
              Chiudi
            </Button>
            <Button
              onClick={() => {
                toast({
                  title: "Funzionalità in arrivo",
                  description: "La creazione automatica di planning windows sarà disponibile a breve",
                });
                setShowPlanningDialog(false);
              }}
              data-testid="button-apply-planning"
            >
              Applica Pianificazione
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
