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
import { Plus, Edit, Trash2, History, Receipt } from "lucide-react";
import type { BudgetTransaction, BudgetAccount, BudgetCategory } from "@shared/schema";
import BudgetTransactionForm from "@/components/forms/budget-transaction-form";
import AuditHistory from "@/components/ui/audit-history";

const typeColors = { income: "bg-green-100 text-green-800", expense: "bg-red-100 text-red-800" };
const typeLabels: Record<string, string> = { income: "Entrata", expense: "Uscita" };

const availableColumns = [
  { id: "transactionDate", label: "Data" },
  { id: "type", label: "Tipo" },
  { id: "account", label: "Conto" },
  { id: "category", label: "Categoria" },
  { id: "amount", label: "Importo" },
  { id: "description", label: "Descrizione" },
];

export default function BudgetTransactionsTab() {
  const [selected, setSelected] = useState<BudgetTransaction[]>([]);
  const [editing, setEditing] = useState<BudgetTransaction | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [editingLayout, setEditingLayout] = useState<any>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { currentOrganizationId } = useOrganization();
  const { currentLayoutName, savedLayouts, updateLayout, loadLayout, renameLayout, deleteLayout } = useTableLayout("budget-transactions");

  const { data: transactions = [], isLoading } = useQuery<BudgetTransaction[]>({
    queryKey: ["/api/budget-transactions"],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!currentOrganizationId,
  });

  const { data: accounts = [] } = useQuery<BudgetAccount[]>({
    queryKey: ["/api/budget-accounts"],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!currentOrganizationId,
  });

  const { data: categories = [] } = useQuery<BudgetCategory[]>({
    queryKey: ["/api/budget-categories"],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!currentOrganizationId,
  });

  const accountName = (id: string) => accounts.find((a) => a.id === id)?.name || "—";
  const categoryName = (id: string | null) => (id ? categories.find((c) => c.id === id)?.name : null) || "Non categorizzato";

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { await apiRequest("DELETE", `/api/budget-transactions/${id}`); },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/budget-transactions"] });
      setShowDeleteDialog(false);
      setEditing(null);
      toast({ title: "Movimento eliminato" });
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (list: BudgetTransaction[]) => {
      for (const item of list) await apiRequest("DELETE", `/api/budget-transactions/${item.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/budget-transactions"] });
      setSelected([]);
      setShowBulkDeleteDialog(false);
      toast({ title: "Movimenti eliminati" });
    },
  });

  const columns = [
    {
      key: "transactionDate",
      label: "Data",
      sortable: true,
      searchable: false,
      render: (tx: BudgetTransaction) => new Date(tx.transactionDate).toLocaleDateString("it-IT"),
    },
    createStandardColumns.badge("type", "Tipo", typeColors),
    {
      key: "account",
      label: "Conto",
      sortable: false,
      searchable: false,
      render: (tx: BudgetTransaction) => accountName(tx.accountId),
    },
    {
      key: "category",
      label: "Categoria",
      sortable: false,
      searchable: false,
      render: (tx: BudgetTransaction) => categoryName(tx.categoryId),
    },
    {
      key: "amount",
      label: "Importo",
      sortable: true,
      searchable: false,
      render: (tx: BudgetTransaction) => `€${parseFloat(tx.amount).toLocaleString()}`,
    },
    createStandardColumns.text("description", "Descrizione"),
    createStandardColumns.actions([
      { label: "Modifica", icon: Edit, onClick: (tx: BudgetTransaction) => { setEditing(tx); setShowForm(true); } },
      { label: "Elimina", icon: Trash2, onClick: (tx: BudgetTransaction) => { setEditing(tx); setShowDeleteDialog(true); } },
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
        <Button onClick={() => { setEditing(null); setShowForm(true); }} data-testid="button-add-transaction">
          <Plus className="h-4 w-4 mr-2" />
          Nuovo Movimento
        </Button>
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Caricamento...</div>
      ) : transactions.length === 0 ? (
        <div className="text-center py-12">
          <Receipt className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">Nessun movimento</h3>
          <p className="text-muted-foreground mb-4">Registra il tuo primo movimento reale</p>
          <Button onClick={() => { setEditing(null); setShowForm(true); }} data-testid="button-create-first-transaction">
            Crea Movimento
          </Button>
        </div>
      ) : (
        <UniversalTable
          data={transactions}
          columns={columns}
          enableSelection
          onSelectionChange={(rows) => setSelected(rows as BudgetTransaction[])}
          onRowClick={(tx: BudgetTransaction) => { setEditing(tx); setShowForm(true); }}
          bulkActions={[
            { label: "Elimina Selezionati", icon: Trash2, variant: "destructive", onClick: (rows) => { setSelected(rows as BudgetTransaction[]); setShowBulkDeleteDialog(true); } },
          ]}
        />
      )}

      <TableConfiguration
        isOpen={showConfigDialog}
        onOpenChange={setShowConfigDialog}
        tableId="budget-transactions"
        availableColumns={availableColumns}
        editingLayout={editingLayout}
        onSave={(layoutData) => { updateLayout(layoutData); setShowConfigDialog(false); }}
        onCancel={() => setShowConfigDialog(false)}
      />

      {showForm && (
        <Dialog open={showForm} onOpenChange={(open) => { if (!open) { setShowForm(false); setEditing(null); } }}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editing ? "Modifica Movimento" : "Nuovo Movimento"}</DialogTitle>
              <DialogDescription>{editing ? "Modifica i dettagli del movimento" : "Registra un nuovo movimento reale"}</DialogDescription>
            </DialogHeader>
            <Tabs defaultValue="details" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="details" data-testid="tab-transaction-details">Dettagli</TabsTrigger>
                {editing && <TabsTrigger value="history" data-testid="tab-transaction-history"><History className="h-4 w-4 mr-2" />Storico Modifiche</TabsTrigger>}
              </TabsList>
              <TabsContent value="details" className="mt-6">
                <BudgetTransactionForm transaction={editing} onSuccess={() => { setShowForm(false); setEditing(null); queryClient.invalidateQueries({ queryKey: ["/api/budget-transactions"] }); }} />
              </TabsContent>
              {editing && (
                <TabsContent value="history" className="mt-6">
                  <AuditHistory tableName="budget_transactions" recordId={editing.id} title="Storico Modifiche Movimento" />
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
              Sei sicuro di voler eliminare questo movimento? Questa azione non può essere annullata.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-transaction">Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => editing && deleteMutation.mutate(editing.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete-transaction"
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
              Sei sicuro di voler eliminare {selected.length} movimenti selezionati? Questa azione non può essere annullata.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-bulk-delete-transaction">Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => bulkDeleteMutation.mutate(selected)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={bulkDeleteMutation.isPending}
              data-testid="button-confirm-bulk-delete-transaction"
            >
              {bulkDeleteMutation.isPending ? "Eliminando..." : `Elimina ${selected.length} Movimenti`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
