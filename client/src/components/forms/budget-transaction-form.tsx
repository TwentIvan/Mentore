import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, getQueryFn } from "@/lib/queryClient";
import { insertBudgetTransactionSchema, type BudgetTransaction, type BudgetCategory, type BudgetAccount, type BudgetPlanItem } from "@shared/schema";
import { useOrganization } from "@/contexts/organization-context";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";

const NONE = "none";

const formSchema = insertBudgetTransactionSchema.omit({ userId: true });
type FormData = z.infer<typeof formSchema>;

interface BudgetTransactionFormProps {
  transaction?: BudgetTransaction | null;
  onSuccess?: () => void;
}

export default function BudgetTransactionForm({ transaction, onSuccess }: BudgetTransactionFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { currentOrganizationId } = useOrganization();

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

  const { data: planItems = [] } = useQuery<BudgetPlanItem[]>({
    queryKey: ["/api/budget-plan-items"],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!currentOrganizationId,
  });

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      accountId: transaction?.accountId || "",
      categoryId: transaction?.categoryId || undefined,
      planItemId: transaction?.planItemId || undefined,
      type: transaction?.type || "expense",
      amount: transaction?.amount || "",
      transactionDate: transaction?.transactionDate ? new Date(transaction.transactionDate).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
      description: transaction?.description || "",
      notes: transaction?.notes || "",
    },
  });

  const watchedType = form.watch("type");
  const filteredCategories = categories.filter((c) => c.type === watchedType);
  const filteredPlanItems = planItems.filter((p) => p.type === watchedType);

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      const payload = {
        ...data,
        categoryId: data.categoryId === NONE ? null : data.categoryId || null,
        planItemId: data.planItemId === NONE ? null : data.planItemId || null,
      };
      const res = transaction
        ? await apiRequest("PUT", `/api/budget-transactions/${transaction.id}`, payload)
        : await apiRequest("POST", "/api/budget-transactions", payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/budget-transactions"] });
      toast({ title: transaction ? "Movimento aggiornato" : "Movimento creato" });
      onSuccess?.();
    },
    onError: (error: Error) => {
      toast({ title: "Errore", description: error.message, variant: "destructive" });
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((data) => mutation.mutate(data))} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-transaction-type">
                      <SelectValue placeholder="Seleziona tipo" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="income">Entrata</SelectItem>
                    <SelectItem value="expense">Uscita</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="accountId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Conto/Carta</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-transaction-account">
                      <SelectValue placeholder="Seleziona conto" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {accounts.map((acc) => (
                      <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Importo (€)</FormLabel>
                <FormControl>
                  <Input {...field} type="number" step="0.01" data-testid="input-transaction-amount" placeholder="0.00" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="transactionDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Data</FormLabel>
                <FormControl>
                  <Input {...field} type="date" data-testid="input-transaction-date" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="categoryId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Categoria (opzionale)</FormLabel>
                <Select onValueChange={field.onChange} value={field.value || NONE}>
                  <FormControl>
                    <SelectTrigger data-testid="select-transaction-category">
                      <SelectValue placeholder="Non categorizzato" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value={NONE}>Non categorizzato</SelectItem>
                    {filteredCategories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="planItemId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Voce Pianificata (opzionale)</FormLabel>
                <Select onValueChange={field.onChange} value={field.value || NONE}>
                  <FormControl>
                    <SelectTrigger data-testid="select-transaction-plan-item">
                      <SelectValue placeholder="Nessuna" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value={NONE}>Nessuna</SelectItem>
                    {filteredPlanItems.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descrizione (opzionale)</FormLabel>
              <FormControl>
                <Input {...field} value={field.value || ""} data-testid="input-transaction-description" placeholder="Es. Esselunga, bonifico affitto..." />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Note (opzionale)</FormLabel>
              <FormControl>
                <Textarea {...field} value={field.value || ""} data-testid="input-transaction-notes" rows={2} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end space-x-2 pt-4">
          <Button type="submit" disabled={mutation.isPending} data-testid="button-submit-transaction">
            {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {transaction ? "Salva" : "Crea Movimento"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
