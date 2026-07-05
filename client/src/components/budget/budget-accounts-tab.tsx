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
import { Plus, Edit, Trash2, History, Wallet } from "lucide-react";
import type { BudgetAccount } from "@shared/schema";
import BudgetAccountForm from "@/components/forms/budget-account-form";
import AuditHistory from "@/components/ui/audit-history";

const accountTypeLabels: Record<string, string> = {
  conto_corrente: "Conto Corrente",
  carta_credito: "Carta di Credito",
  carta_debito: "Carta di Debito",
  contanti: "Contanti",
  conto_risparmio: "Conto Risparmio",
  altro: "Altro",
};

const availableColumns = [
  { id: "name", label: "Nome" },
  { id: "type", label: "Tipo" },
  { id: "institution", label: "Istituto" },
  { id: "initialBalance", label: "Saldo Iniziale" },
];

export default function BudgetAccountsTab() {
  const [selected, setSelected] = useState<BudgetAccount[]>([]);
  const [editing, setEditing] = useState<BudgetAccount | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [editingLayout, setEditingLayout] = useState<any>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { currentOrganizationId } = useOrganization();
  const { currentLayoutName, savedLayouts, updateLayout, loadLayout, renameLayout, deleteLayout } = useTableLayout("budget-accounts");

  const { data: accounts = [], isLoading } = useQuery<BudgetAccount[]>({
    queryKey: ["/api/budget-accounts"],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!currentOrganizationId,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { await apiRequest("DELETE", `/api/budget-accounts/${id}`); },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/budget-accounts"] });
      setShowDeleteDialog(false);
      setEditing(null);
      toast({ title: "Conto eliminato" });
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (items: BudgetAccount[]) => {
      for (const item of items) await apiRequest("DELETE", `/api/budget-accounts/${item.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/budget-accounts"] });
      setSelected([]);
      setShowBulkDeleteDialog(false);
      toast({ title: "Conti eliminati" });
    },
  });

  const columns = [
    createStandardColumns.text("name", "Nome"),
    {
      key: "type",
      label: "Tipo",
      sortable: true,
      searchable: false,
      render: (acc: BudgetAccount) => accountTypeLabels[acc.type] || acc.type,
    },
    createStandardColumns.text("institution", "Istituto"),
    {
      key: "initialBalance",
      label: "Saldo Iniziale",
      sortable: true,
      searchable: false,
      render: (acc: BudgetAccount) => `€${parseFloat(acc.initialBalance).toLocaleString()}`,
    },
    createStandardColumns.actions([
      { label: "Modifica", icon: Edit, onClick: (acc: BudgetAccount) => { setEditing(acc); setShowForm(true); } },
      { label: "Elimina", icon: Trash2, onClick: (acc: BudgetAccount) => { setEditing(acc); setShowDeleteDialog(true); } },
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
        <Button onClick={() => { setEditing(null); setShowForm(true); }} data-testid="button-add-account">
          <Plus className="h-4 w-4 mr-2" />
          Nuovo Conto
        </Button>
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Caricamento...</div>
      ) : accounts.length === 0 ? (
        <div className="text-center py-12">
          <Wallet className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">Nessun conto</h3>
          <p className="text-muted-foreground mb-4">Aggiungi il tuo primo conto o carta</p>
          <Button onClick={() => { setEditing(null); setShowForm(true); }} data-testid="button-create-first-account">
            Crea Conto
          </Button>
        </div>
      ) : (
        <UniversalTable
          data={accounts}
          columns={columns}
          enableSelection
          onSelectionChange={(rows) => setSelected(rows as BudgetAccount[])}
          onRowClick={(acc: BudgetAccount) => { setEditing(acc); setShowForm(true); }}
          bulkActions={[
            { label: "Elimina Selezionati", icon: Trash2, variant: "destructive", onClick: (rows) => { setSelected(rows as BudgetAccount[]); setShowBulkDeleteDialog(true); } },
          ]}
        />
      )}

      <TableConfiguration
        isOpen={showConfigDialog}
        onOpenChange={setShowConfigDialog}
        tableId="budget-accounts"
        availableColumns={availableColumns}
        editingLayout={editingLayout}
        onSave={(layoutData) => { updateLayout(layoutData); setShowConfigDialog(false); }}
        onCancel={() => setShowConfigDialog(false)}
      />

      {showForm && (
        <Dialog open={showForm} onOpenChange={(open) => { if (!open) { setShowForm(false); setEditing(null); } }}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editing ? "Modifica Conto" : "Nuovo Conto"}</DialogTitle>
              <DialogDescription>{editing ? "Modifica i dettagli del conto/carta" : "Aggiungi un nuovo conto o carta"}</DialogDescription>
            </DialogHeader>
            <Tabs defaultValue="details" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="details" data-testid="tab-account-details">Dettagli</TabsTrigger>
                {editing && <TabsTrigger value="history" data-testid="tab-account-history"><History className="h-4 w-4 mr-2" />Storico Modifiche</TabsTrigger>}
              </TabsList>
              <TabsContent value="details" className="mt-6">
                <BudgetAccountForm account={editing} onSuccess={() => { setShowForm(false); setEditing(null); queryClient.invalidateQueries({ queryKey: ["/api/budget-accounts"] }); }} />
              </TabsContent>
              {editing && (
                <TabsContent value="history" className="mt-6">
                  <AuditHistory tableName="budget_accounts" recordId={editing.id} title="Storico Modifiche Conto" />
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
            <AlertDialogCancel data-testid="button-cancel-delete-account">Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => editing && deleteMutation.mutate(editing.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete-account"
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
              Sei sicuro di voler eliminare {selected.length} conti selezionati? Questa azione non può essere annullata.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-bulk-delete-account">Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => bulkDeleteMutation.mutate(selected)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={bulkDeleteMutation.isPending}
              data-testid="button-confirm-bulk-delete-account"
            >
              {bulkDeleteMutation.isPending ? "Eliminando..." : `Elimina ${selected.length} Conti`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
