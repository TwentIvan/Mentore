import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { insertBudgetAccountSchema, type BudgetAccount } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";

const formSchema = insertBudgetAccountSchema.omit({ userId: true });
type FormData = z.infer<typeof formSchema>;

const accountTypeLabels: Record<string, string> = {
  conto_corrente: "Conto Corrente",
  carta_credito: "Carta di Credito",
  carta_debito: "Carta di Debito",
  contanti: "Contanti",
  conto_risparmio: "Conto Risparmio",
  altro: "Altro",
};

interface BudgetAccountFormProps {
  account?: BudgetAccount | null;
  onSuccess?: () => void;
}

export default function BudgetAccountForm({ account, onSuccess }: BudgetAccountFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: account?.name || "",
      type: account?.type || "conto_corrente",
      institution: account?.institution || "",
      currency: account?.currency || "EUR",
      initialBalance: account?.initialBalance || "0",
      isActive: account?.isActive ?? true,
      notes: account?.notes || "",
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      const res = account
        ? await apiRequest("PUT", `/api/budget-accounts/${account.id}`, data)
        : await apiRequest("POST", "/api/budget-accounts", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/budget-accounts"] });
      toast({ title: account ? "Conto aggiornato" : "Conto creato" });
      onSuccess?.();
    },
    onError: (error: Error) => {
      toast({ title: "Errore", description: error.message, variant: "destructive" });
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((data) => mutation.mutate(data))} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome</FormLabel>
              <FormControl>
                <Input {...field} data-testid="input-account-name" placeholder="Es. Conto principale" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-account-type">
                      <SelectValue placeholder="Seleziona tipo" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {Object.entries(accountTypeLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="institution"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Istituto (opzionale)</FormLabel>
                <FormControl>
                  <Input {...field} value={field.value || ""} data-testid="input-account-institution" placeholder="Es. Intesa Sanpaolo" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="initialBalance"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Saldo Iniziale (€)</FormLabel>
                <FormControl>
                  <Input {...field} type="number" step="0.01" data-testid="input-account-initial-balance" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="currency"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Valuta</FormLabel>
                <FormControl>
                  <Input {...field} data-testid="input-account-currency" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Note (opzionale)</FormLabel>
              <FormControl>
                <Textarea {...field} value={field.value || ""} data-testid="input-account-notes" rows={2} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end space-x-2 pt-4">
          <Button type="submit" disabled={mutation.isPending} data-testid="button-submit-account">
            {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {account ? "Salva" : "Crea Conto"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
