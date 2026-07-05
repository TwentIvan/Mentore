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
import { Plus, Edit, Trash2, History, CalendarClock } from "lucide-react";
import type { BudgetPlanItem, BudgetCategory } from "@shared/schema";
import BudgetPlanItemForm from "@/components/forms/budget-plan-item-form";
import AuditHistory from "@/components/ui/audit-history";

const typeColors = { income: "bg-green-100 text-green-800", expense: "bg-red-100 text-red-800" };
const typeLabels: Record<string, string> = { income: "Entrata", expense: "Uscita" };

const monthLabels = [
  "Gen", "Feb", "Mar", "Apr", "Mag", "Giu", "Lug", "Ago", "Set", "Ott", "Nov", "Dic",
];

function frequencyLabel(intervalMonths: number | null): string {
  if (intervalMonths == null) return "Una tantum";
  const known: Record<number, string> = { 1: "Mensile", 2: "Bimestrale", 3: "Trimestrale", 6: "Semestrale", 12: "Annuale" };
  return known[intervalMonths] || `Ogni ${intervalMonths} mesi`;
}

const availableColumns = [
  { id: "name", label: "Nome" },
  { id: "type", label: "Tipo" },
  { id: "category", label: "Categoria" },
  { id: "amount", label: "Importo" },
  { id: "frequency", label: "Frequenza" },
  { id: "start", label: "Inizio" },
];

export default function BudgetPlanItemsTab() {
  const [selected, setSelected] = useState<BudgetPlanItem[]>([]);
  const [editing, setEditing] = useState<BudgetPlanItem | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [editingLayout, setEditingLayout] = useState<any>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { currentOrganizationId } = useOrganization();
  const { currentLayoutName, savedLayouts, updateLayout, loadLayout, renameLayout, deleteLayout } = useTableLayout("budget-plan-items");

  const { data: items = [], isLoading } = useQuery<BudgetPlanItem[]>({
    queryKey: ["/api/budget-plan-items"],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!currentOrganizationId,
  });

  const { data: categories = [] } = useQuery<BudgetCategory[]>({
    queryKey: ["/api/budget-categories"],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!currentOrganizationId,
  });

  const categoryName = (id: string) => categories.find((c) => c.id === id)?.name || "—";

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { await apiRequest("DELETE", `/api/budget-plan-items/${id}`); },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/budget-plan-items"] });
      setShowDeleteDialog(false);
      setEditing(null);
      toast({ title: "Voce eliminata" });
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (list: BudgetPlanItem[]) => {
      for (const item of list) await apiRequest("DELETE", `/api/budget-plan-items/${item.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/budget-plan-items"] });
      setSelected([]);
      setShowBulkDeleteDialog(false);
      toast({ title: "Voci eliminate" });
    },
  });

  const columns = [
    createStandardColumns.text("name", "Nome"),
    createStandardColumns.badge("type", "Tipo", typeColors),
    {
      key: "category",
      label: "Categoria",
      sortable: false,
      searchable: false,
      render: (item: BudgetPlanItem) => categoryName(item.categoryId),
    },
    {
      key: "amount",
      label: "Importo",
      sortable: true,
      searchable: false,
      render: (item: BudgetPlanItem) => `€${parseFloat(item.amount).toLocaleString()}`,
    },
    {
      key: "frequency",
      label: "Frequenza",
      sortable: false,
      searchable: false,
      render: (item: BudgetPlanItem) => frequencyLabel(item.intervalMonths),
    },
    {
      key: "start",
      label: "Inizio",
      sortable: false,
      searchable: false,
      render: (item: BudgetPlanItem) => `${monthLabels[item.startMonth - 1]} ${item.startYear}`,
    },
    createStandardColumns.actions([
      { label: "Modifica", icon: Edit, onClick: (item: BudgetPlanItem) => { setEditing(item); setShowForm(true); } },
      { label: "Elimina", icon: Trash2, onClick: (item: BudgetPlanItem) => { setEditing(item); setShowDeleteDialog(true); } },
    ]),
  ];

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
        <Button onClick={() => { setEditing(null); setShowForm(true); }} data-testid="button-add-plan-item">
          <Plus className="h-4 w-4 mr-2" />
          Nuova Voce
        </Button>
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Caricamento...</div>
      ) : items.length === 0 ? (
        <div className="text-center py-12">
          <CalendarClock className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">Nessuna voce pianificata</h3>
          <p className="text-muted-foreground mb-4">Aggiungi entrate e uscite ricorrenti o una tantum</p>
          <Button onClick={() => { setEditing(null); setShowForm(true); }} data-testid="button-create-first-plan-item">
            Crea Voce
          </Button>
        </div>
      ) : (
        <UniversalTable
          data={items}
          columns={columns}
          enableSelection
          onSelectionChange={(rows) => setSelected(rows as BudgetPlanItem[])}
          onRowClick={(item: BudgetPlanItem) => { setEditing(item); setShowForm(true); }}
          bulkActions={[
            { label: "Elimina Selezionati", icon: Trash2, variant: "destructive", onClick: (rows) => { setSelected(rows as BudgetPlanItem[]); setShowBulkDeleteDialog(true); } },
          ]}
        />
      )}

      <TableConfiguration
        isOpen={showConfigDialog}
        onOpenChange={setShowConfigDialog}
        tableId="budget-plan-items"
        availableColumns={availableColumns}
        editingLayout={editingLayout}
        onSave={(layoutData) => { updateLayout(layoutData); setShowConfigDialog(false); }}
        onCancel={() => setShowConfigDialog(false)}
      />

      {showForm && (
        <Dialog open={showForm} onOpenChange={(open) => { if (!open) { setShowForm(false); setEditing(null); } }}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editing ? "Modifica Voce Pianificata" : "Nuova Voce Pianificata"}</DialogTitle>
              <DialogDescription>{editing ? "Modifica i dettagli della voce" : "Crea una nuova voce di entrata o uscita pianificata"}</DialogDescription>
            </DialogHeader>
            <Tabs defaultValue="details" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="details" data-testid="tab-plan-item-details">Dettagli</TabsTrigger>
                {editing && <TabsTrigger value="history" data-testid="tab-plan-item-history"><History className="h-4 w-4 mr-2" />Storico Modifiche</TabsTrigger>}
              </TabsList>
              <TabsContent value="details" className="mt-6">
                <BudgetPlanItemForm item={editing} onSuccess={() => { setShowForm(false); setEditing(null); queryClient.invalidateQueries({ queryKey: ["/api/budget-plan-items"] }); }} />
              </TabsContent>
              {editing && (
                <TabsContent value="history" className="mt-6">
                  <AuditHistory tableName="budget_plan_items" recordId={editing.id} title="Storico Modifiche Voce" />
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
            <AlertDialogCancel data-testid="button-cancel-delete-plan-item">Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => editing && deleteMutation.mutate(editing.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete-plan-item"
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
              Sei sicuro di voler eliminare {selected.length} voci selezionate? Questa azione non può essere annullata.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-bulk-delete-plan-item">Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => bulkDeleteMutation.mutate(selected)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={bulkDeleteMutation.isPending}
              data-testid="button-confirm-bulk-delete-plan-item"
            >
              {bulkDeleteMutation.isPending ? "Eliminando..." : `Elimina ${selected.length} Voci`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
