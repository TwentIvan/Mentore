import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, getQueryFn } from "@/lib/queryClient";
import { useOrganization } from "@/contexts/organization-context";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Edit, Trash2, Tag, Briefcase, GraduationCap, Dumbbell, Heart, Home, Music, Palette, Sparkles, Lightbulb } from "lucide-react";
import type { InterestArea } from "@shared/schema";
import { insertInterestAreaSchema } from "@shared/schema";

// Icon mapping
const iconMap = {
  Tag,
  Briefcase,
  GraduationCap,
  Dumbbell,
  Heart,
  Home,
  Music,
  Palette,
  Sparkles,
};

const iconOptions = [
  { value: "Tag", label: "Tag", Icon: Tag },
  { value: "Briefcase", label: "Lavoro", Icon: Briefcase },
  { value: "GraduationCap", label: "Studio", Icon: GraduationCap },
  { value: "Dumbbell", label: "Fitness", Icon: Dumbbell },
  { value: "Heart", label: "Salute", Icon: Heart },
  { value: "Home", label: "Casa", Icon: Home },
  { value: "Music", label: "Musica", Icon: Music },
  { value: "Palette", label: "Arte", Icon: Palette },
  { value: "Sparkles", label: "Hobby", Icon: Sparkles },
];

const colorOptions = [
  { value: "#3B82F6", label: "Blu" },
  { value: "#10B981", label: "Verde" },
  { value: "#F59E0B", label: "Arancione" },
  { value: "#EF4444", label: "Rosso" },
  { value: "#8B5CF6", label: "Viola" },
  { value: "#EC4899", label: "Rosa" },
  { value: "#14B8A6", label: "Teal" },
  { value: "#F97316", label: "Arancione scuro" },
];

const formSchema = z.object({
  name: z.string().min(1, "Nome richiesto"),
  description: z.string().optional(),
  color: z.string().min(1, "Colore richiesto"),
  icon: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export default function InterestAreasPage() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedArea, setSelectedArea] = useState<InterestArea | null>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { currentOrganizationId } = useOrganization();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      color: "#3B82F6",
      icon: "Tag",
    },
  });

  // Fetch interest areas
  const { data: areas = [], isLoading } = useQuery<InterestArea[]>({
    queryKey: ["/api/interest-areas", currentOrganizationId],
    enabled: !!currentOrganizationId,
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: FormValues) => {
      const res = await apiRequest("POST", "/api/interest-areas", {
        ...data,
        userId: "current",
        organizationId: currentOrganizationId,
        isActive: true,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/interest-areas", currentOrganizationId] });
      setShowCreateDialog(false);
      form.reset();
      toast({
        title: "Area creata",
        description: "L'area di interesse è stata creata con successo",
      });
    },
    onError: () => {
      toast({
        title: "Errore",
        description: "Impossibile creare l'area di interesse",
        variant: "destructive",
      });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data: FormValues & { id: string }) => {
      const { id, ...updateData } = data;
      const res = await apiRequest("PATCH", `/api/interest-areas/${id}`, updateData);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/interest-areas", currentOrganizationId] });
      setShowEditDialog(false);
      setSelectedArea(null);
      form.reset();
      toast({
        title: "Area aggiornata",
        description: "L'area di interesse è stata aggiornata con successo",
      });
    },
    onError: () => {
      toast({
        title: "Errore",
        description: "Impossibile aggiornare l'area di interesse",
        variant: "destructive",
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/interest-areas/${id}`);
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/interest-areas", currentOrganizationId] });
      setShowDeleteDialog(false);
      setSelectedArea(null);
      toast({
        title: "Area eliminata",
        description: "L'area di interesse è stata eliminata con successo",
      });
    },
    onError: () => {
      toast({
        title: "Errore",
        description: "Impossibile eliminare l'area di interesse",
        variant: "destructive",
      });
    },
  });

  const handleCreate = () => {
    form.reset({
      name: "",
      description: "",
      color: "#3B82F6",
      icon: "Tag",
    });
    setShowCreateDialog(true);
  };

  const handleEdit = (area: InterestArea) => {
    setSelectedArea(area);
    form.reset({
      name: area.name,
      description: area.description || "",
      color: area.color,
      icon: area.icon || "Tag",
    });
    setShowEditDialog(true);
  };

  const handleDelete = (area: InterestArea) => {
    setSelectedArea(area);
    setShowDeleteDialog(true);
  };

  const onSubmit = (data: FormValues) => {
    if (selectedArea) {
      updateMutation.mutate({ ...data, id: selectedArea.id });
    } else {
      createMutation.mutate(data);
    }
  };

  const getIcon = (iconName?: string | null) => {
    if (!iconName || !(iconName in iconMap)) return Tag;
    return iconMap[iconName as keyof typeof iconMap];
  };

  // Suggerimenti generici basati su trend
  const suggestGenericMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/ai/suggest-generic-interest-areas", {});
      return res.json();
    },
    onSuccess: async (data) => {
      const suggestions = data.suggestions || [];
      
      if (suggestions.length === 0) {
        toast({
          title: "Nessun nuovo suggerimento",
          description: "Le aree di interesse attuali sono già complete secondo le best practices",
        });
        return;
      }

      try {
        const promises = suggestions.map((suggestion: any) => 
          apiRequest("POST", "/api/interest-areas", {
            name: suggestion.name,
            description: suggestion.description,
            color: suggestion.color,
            icon: "Sparkles",
            userId: "current",
            organizationId: currentOrganizationId,
            isActive: true,
          }).then(res => res.json())
        );

        await Promise.all(promises);
        
        queryClient.invalidateQueries({ queryKey: ["/api/interest-areas", currentOrganizationId] });
        
        toast({
          title: "Aree aggiunte",
          description: `${suggestions.length} nuove aree di interesse aggiunte basate su trend e best practices`,
        });
      } catch (error) {
        toast({
          title: "Errore",
          description: "Impossibile aggiungere le aree suggerite",
          variant: "destructive",
        });
      }
    },
    onError: () => {
      toast({
        title: "Errore",
        description: "Impossibile ottenere suggerimenti",
        variant: "destructive",
      });
    },
  });

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title="Aree di Interesse" subtitle="Gestisci le categorie per organizzare i tuoi progetti" />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Aree di Interesse</h1>
                <p className="text-muted-foreground mt-1">
                  Gestisci le categorie per organizzare i tuoi progetti e attività
                </p>
              </div>
              <div className="flex gap-2">
                <Button 
                  data-testid="button-suggest-areas" 
                  variant="outline"
                  onClick={() => suggestGenericMutation.mutate()}
                  disabled={suggestGenericMutation.isPending}
                >
                  <Lightbulb className="h-4 w-4 mr-2" />
                  {suggestGenericMutation.isPending ? "Caricamento..." : "Suggerisci aree"}
                </Button>
                <Button data-testid="button-create-area" onClick={handleCreate}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nuova Area
                </Button>
              </div>
            </div>

            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => (
                  <Card key={i}>
                    <CardHeader>
                      <Skeleton className="h-8 w-8 rounded-full mb-2" />
                      <Skeleton className="h-6 w-32" />
                    </CardHeader>
                    <CardContent>
                      <Skeleton className="h-4 w-full" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : areas.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Tag className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Nessuna area di interesse</h3>
                  <p className="text-muted-foreground text-center mb-4">
                    Crea la tua prima area di interesse o usa i suggerimenti basati su trend e best practices
                  </p>
                  <div className="flex gap-2">
                    <Button 
                      data-testid="button-suggest-first" 
                      variant="outline"
                      onClick={() => suggestGenericMutation.mutate()}
                      disabled={suggestGenericMutation.isPending}
                    >
                      <Lightbulb className="h-4 w-4 mr-2" />
                      {suggestGenericMutation.isPending ? "Caricamento..." : "Suggerisci aree"}
                    </Button>
                    <Button data-testid="button-create-first-area" onClick={handleCreate}>
                      <Plus className="h-4 w-4 mr-2" />
                      Crea Manualmente
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {areas.map((area) => {
                  const IconComponent = getIcon(area.icon);
                  return (
                    <Card 
                      key={area.id} 
                      data-testid={`card-area-${area.id}`}
                      className="group relative hover:shadow-lg transition-shadow"
                    >
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div 
                            className="p-3 rounded-full mb-2"
                            style={{ backgroundColor: `${area.color}20` }}
                          >
                            <IconComponent 
                              className="h-6 w-6" 
                              style={{ color: area.color }}
                            />
                          </div>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              data-testid={`button-edit-area-${area.id}`}
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(area)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              data-testid={`button-delete-area-${area.id}`}
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(area)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <CardTitle data-testid={`text-area-name-${area.id}`}>{area.name}</CardTitle>
                        {area.description && (
                          <CardDescription data-testid={`text-area-description-${area.id}`}>
                            {area.description}
                          </CardDescription>
                        )}
                      </CardHeader>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={showCreateDialog || showEditDialog} onOpenChange={(open) => {
        if (!open) {
          setShowCreateDialog(false);
          setShowEditDialog(false);
          setSelectedArea(null);
          form.reset();
        }
      }}>
        <DialogContent data-testid="dialog-area-form">
          <DialogHeader>
            <DialogTitle>
              {selectedArea ? "Modifica Area" : "Nuova Area di Interesse"}
            </DialogTitle>
            <DialogDescription>
              {selectedArea 
                ? "Modifica i dettagli dell'area di interesse"
                : "Crea una nuova area di interesse per organizzare i tuoi progetti"}
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome</FormLabel>
                    <FormControl>
                      <Input 
                        data-testid="input-area-name"
                        placeholder="es. Lavoro, Studio, Fitness" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrizione</FormLabel>
                    <FormControl>
                      <Textarea
                        data-testid="input-area-description"
                        placeholder="Descrizione opzionale"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="icon"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Icona</FormLabel>
                    <FormControl>
                      <div className="grid grid-cols-5 gap-2">
                        {iconOptions.map((option) => (
                          <button
                            key={option.value}
                            type="button"
                            data-testid={`button-icon-${option.value}`}
                            onClick={() => field.onChange(option.value)}
                            className={`p-3 rounded-lg border-2 transition-colors ${
                              field.value === option.value
                                ? "border-primary bg-primary/10"
                                : "border-transparent hover:border-muted"
                            }`}
                          >
                            <option.Icon className="h-5 w-5 mx-auto" />
                          </button>
                        ))}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="color"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Colore</FormLabel>
                    <FormControl>
                      <div className="grid grid-cols-4 gap-2">
                        {colorOptions.map((option) => (
                          <button
                            key={option.value}
                            type="button"
                            data-testid={`button-color-${option.value}`}
                            onClick={() => field.onChange(option.value)}
                            className={`p-3 rounded-lg border-2 transition-colors ${
                              field.value === option.value
                                ? "border-primary ring-2 ring-primary ring-offset-2"
                                : "border-transparent"
                            }`}
                            style={{ backgroundColor: option.value }}
                          >
                            <span className="sr-only">{option.label}</span>
                          </button>
                        ))}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  data-testid="button-cancel-area"
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowCreateDialog(false);
                    setShowEditDialog(false);
                    setSelectedArea(null);
                    form.reset();
                  }}
                >
                  Annulla
                </Button>
                <Button
                  data-testid="button-save-area"
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {createMutation.isPending || updateMutation.isPending ? "Salvataggio..." : "Salva"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent data-testid="dialog-delete-area">
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminare l'area?</AlertDialogTitle>
            <AlertDialogDescription>
              Sei sicuro di voler eliminare "{selectedArea?.name}"? Questa azione non può essere annullata.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Annulla</AlertDialogCancel>
            <AlertDialogAction
              data-testid="button-confirm-delete"
              onClick={() => selectedArea && deleteMutation.mutate(selectedArea.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Elimina
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
