import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, getQueryFn } from "@/lib/queryClient";
import { useOrganization } from "@/contexts/organization-context";
import { useTableLayout } from "@/lib/user-preferences";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { UniversalTable, createStandardColumns } from "@/components/ui/universal-table";
import { LayoutManager } from "@/components/ui/layout-manager";
import { TableConfiguration } from "@/components/ui/table-configuration";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Edit, Trash2, History, Tag } from "lucide-react";
import type { BudgetCategory } from "@shared/schema";
import BudgetCategoryForm from "@/components/forms/budget-category-form";
import AuditHistory from "@/components/ui/audit-history";

const typeColors = { income: "bg-green-100 text-green-800", expense: "bg-red-100 text-red-800" };
const typeLabels: Record<string, string> = { income: "Entrata", expense: "Uscita" };

const availableColumns = [
  { id: "name", label: "Nome" },
  { id: "type", label: "Tipo" },
];

export default function BudgetCategoriesTab() {
  const [selected, setSelected] = useState<BudgetCategory[]>([]);
  const [editing, setEditing] = useState<BudgetCategory | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [editingLayout, setEditingLayout] = useState<any>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { currentOrganizationId } = useOrganization();
  const { currentLayoutName, savedLayouts, updateLayout, loadLayout, renameLayout, deleteLayout } = useTableLayout("budget-categories");

  const { data: categories = [], isLoading } = useQuery<BudgetCategory[]>({
    queryKey: ["/api/budget-categories"],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!currentOrganizationId,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { await apiRequest("DELETE", `/api/budget-categories/${id}`); },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/budget-categories"] });
      setShowDeleteDialog(false);
      setEditing(null);
      toast({ title: "Categoria eliminata" });
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (items: BudgetCategory[]) => {
      for (const item of items) await apiRequest("DELETE", `/api/budget-categories/${item.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/budget-categories"] });
      setSelected([]);
      setShowBulkDeleteDialog(false);
      toast({ title: "Categorie eliminate" });
    },
  });

  const columns = [
    createStandardColumns.text("name", "Nome"),
    createStandardColumns.badge("type", "Tipo", typeColors),
    createStandardColumns.actions([
      { label: "Modifica", icon: Edit, onClick: (cat: BudgetCategory) => { setEditing(cat); setShowForm(true); } },
      { label: "Elimina", icon: Trash2, onClick: (cat: BudgetCategory) => { setEditing(cat); setShowDeleteDialog(true); } },
    ]),
  ];

  const displayCategories = categories.map(c => ({ ...c, typeLabel: typeLabels[c.type] }));

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <LayoutManager
            currentLayoutName={currentLayoutName}
            savedLayouts={savedLayouts}
            onLoadLayout={loadLayout}
            onRenameLayout={renameLayout}
            onDeleteLayout={deleteLayout}
            onConfigureTable={() => setShowConfigDialog(true)}
          />
        </div>
        <Button onClick={() => { setEditing(null); setShowForm(true); }} data-testid="button-add-category">
          <Plus className="h-4 w-4 mr-2" />
          Nuova Categoria
        </Button>
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Caricamento...</div>
      ) : categories.length === 0 ? (
        <div className="text-center py-12">
          <Tag className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">Nessuna categoria</h3>
          <p className="text-muted-foreground mb-4">Crea la tua prima categoria di entrata o uscita</p>
          <Button onClick={() => { setEditing(null); setShowForm(true); }} data-testid="button-create-first-category">
            Crea Categoria
          </Button>
        </div>
      ) : (
        <UniversalTable
          data={categories}
          columns={columns}
          enableSelection
          onSelectionChange={(rows) => setSelected(rows as BudgetCategory[])}
          onRowClick={(cat: BudgetCategory) => { setEditing(cat); setShowForm(true); }}
          bulkActions={[
            { label: "Elimina Selezionati", icon: Trash2, variant: "destructive", onClick: (rows) => { setSelected(rows as BudgetCategory[]); setShowBulkDeleteDialog(true); } },
          ]}
        />
      )}

      <TableConfiguration
        isOpen={showConfigDialog}
        onOpenChange={setShowConfigDialog}
        tableId="budget-categories"
        availableColumns={availableColumns}
        editingLayout={editingLayout}
        onSave={(layoutData) => { updateLayout(layoutData); setShowConfigDialog(false); }}
        onCancel={() => setShowConfigDialog(false)}
      />

      {showForm && (
        <Dialog open={showForm} onOpenChange={(open) => { if (!open) { setShowForm(false); setEditing(null); } }}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editing ? "Modifica Categoria" : "Nuova Categoria"}</DialogTitle>
              <DialogDescription>{editing ? "Modifica i dettagli della categoria" : "Crea una nuova categoria"}</DialogDescription>
            </DialogHeader>
            <Tabs defaultValue="details" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="details" data-testid="tab-category-details">Dettagli</TabsTrigger>
                {editing && <TabsTrigger value="history" data-testid="tab-category-history"><History className="h-4 w-4 mr-2" />Storico Modifiche</TabsTrigger>}
              </TabsList>
              <TabsContent value="details" className="mt-6">
                <BudgetCategoryForm category={editing} onSuccess={() => { setShowForm(false); setEditing(null); queryClient.invalidateQueries({ queryKey: ["/api/budget-categories"] }); }} />
              </TabsContent>
              {editing && (
                <TabsContent value="history" className="mt-6">
                  <AuditHistory tableName="budget_categories" recordId={editing.id} title="Storico Modifiche Categoria" />
                </TabsContent>
              )}
            </Tabs>
          </DialogContent>
        </Dialog>
      )}

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Conferma Eliminazione</AlertDialogTitle>
            <AlertDialogDescription>
              Sei sicuro di voler eliminare "{editing?.name}"? Questa azione non può essere annullata.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-category">Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => editing && deleteMutation.mutate(editing.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete-category"
            >
              {deleteMutation.isPending ? "Eliminando..." : "Elimina"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showBulkDeleteDialog} onOpenChange={setShowBulkDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Conferma Eliminazione Multipla</AlertDialogTitle>
            <AlertDialogDescription>
              Sei sicuro di voler eliminare {selected.length} categorie selezionate? Questa azione non può essere annullata.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-bulk-delete-category">Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => bulkDeleteMutation.mutate(selected)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={bulkDeleteMutation.isPending}
              data-testid="button-confirm-bulk-delete-category"
            >
              {bulkDeleteMutation.isPending ? "Eliminando..." : `Elimina ${selected.length} Categorie`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
