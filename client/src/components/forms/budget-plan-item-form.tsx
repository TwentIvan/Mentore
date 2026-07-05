import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, getQueryFn } from "@/lib/queryClient";
import { insertBudgetPlanItemSchema, type BudgetPlanItem, type BudgetCategory, type BudgetAccount } from "@shared/schema";
import { useOrganization } from "@/contexts/organization-context";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";

const monthLabels = [
  "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
  "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre",
];

const intervalOptions = [
  { value: "one-time", label: "Una tantum" },
  { value: "1", label: "Mensile" },
  { value: "2", label: "Bimestrale" },
  { value: "3", label: "Trimestrale" },
  { value: "6", label: "Semestrale" },
  { value: "12", label: "Annuale" },
];

const formSchema = insertBudgetPlanItemSchema.omit({ userId: true }).extend({
  intervalOption: z.string(),
  intervalCustom: z.string().optional(),
});
type FormData = z.infer<typeof formSchema>;

interface BudgetPlanItemFormProps {
  item?: BudgetPlanItem | null;
  onSuccess?: () => void;
}

export default function BudgetPlanItemForm({ item, onSuccess }: BudgetPlanItemFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { currentOrganizationId } = useOrganization();

  const { data: categories = [] } = useQuery<BudgetCategory[]>({
    queryKey: ["/api/budget-categories"],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!currentOrganizationId,
  });

  const { data: accounts = [] } = useQuery<BudgetAccount[]>({
    queryKey: ["/api/budget-accounts"],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!currentOrganizationId,
  });

  const knownIntervals = ["1", "2", "3", "6", "12"];
  const initialInterval = item?.intervalMonths == null
    ? "one-time"
    : knownIntervals.includes(String(item.intervalMonths)) ? String(item.intervalMonths) : "custom";

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: item?.name || "",
      type: item?.type || "expense",
      categoryId: item?.categoryId || "",
      accountId: item?.accountId || undefined,
      amount: item?.amount || "",
      startYear: item?.startYear || new Date().getFullYear(),
      startMonth: item?.startMonth || new Date().getMonth() + 1,
      intervalOption: initialInterval,
      intervalCustom: item?.intervalMonths != null ? String(item.intervalMonths) : "",
      endDate: item?.endDate ? new Date(item.endDate).toISOString().split("T")[0] : "",
      isActive: item?.isActive ?? true,
      notes: item?.notes || "",
    },
  });

  const watchedType = form.watch("type");
  const watchedInterval = form.watch("intervalOption");

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      const { intervalOption, intervalCustom, ...rest } = data;
      const intervalMonths = intervalOption === "one-time"
        ? null
        : intervalOption === "custom"
          ? parseInt(intervalCustom || "1", 10)
          : parseInt(intervalOption, 10);
      const payload = {
        ...rest,
        intervalMonths,
        accountId: rest.accountId || null,
        endDate: rest.endDate || null,
      };
      const res = item
        ? await apiRequest("PUT", `/api/budget-plan-items/${item.id}`, payload)
        : await apiRequest("POST", "/api/budget-plan-items", payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/budget-plan-items"] });
      toast({ title: item ? "Voce aggiornata" : "Voce creata" });
      onSuccess?.();
    },
    onError: (error: Error) => {
      toast({ title: "Errore", description: error.message, variant: "destructive" });
    },
  });

  const filteredCategories = categories.filter((c) => c.type === watchedType);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((data) => mutation.mutate(data))} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome Voce</FormLabel>
              <FormControl>
                <Input {...field} data-testid="input-plan-item-name" placeholder="Es. Stipendio, Affitto..." />
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
                    <SelectTrigger data-testid="select-plan-item-type">
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
            name="categoryId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Categoria</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-plan-item-category">
                      <SelectValue placeholder="Seleziona categoria" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {filteredCategories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
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
                  <Input {...field} type="number" step="0.01" data-testid="input-plan-item-amount" placeholder="0.00" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="accountId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Conto/Carta (opzionale)</FormLabel>
                <Select onValueChange={field.onChange} value={field.value || undefined}>
                  <FormControl>
                    <SelectTrigger data-testid="select-plan-item-account">
                      <SelectValue placeholder="Nessuno" />
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

        <div className="grid grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="startMonth"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Mese 1° Pagamento</FormLabel>
                <Select onValueChange={(v) => field.onChange(parseInt(v, 10))} value={String(field.value)}>
                  <FormControl>
                    <SelectTrigger data-testid="select-plan-item-start-month">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {monthLabels.map((label, idx) => (
                      <SelectItem key={idx + 1} value={String(idx + 1)}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="startYear"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Anno 1° Pagamento</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    value={field.value}
                    onChange={(e) => field.onChange(parseInt(e.target.value, 10) || new Date().getFullYear())}
                    data-testid="input-plan-item-start-year"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="intervalOption"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Frequenza</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-plan-item-interval">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {intervalOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                    <SelectItem value="custom">Personalizzata (mesi)</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {watchedInterval === "custom" && (
          <FormField
            control={form.control}
            name="intervalCustom"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Intervallo personalizzato (mesi)</FormLabel>
                <FormControl>
                  <Input {...field} type="number" min="1" data-testid="input-plan-item-interval-custom" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {watchedInterval !== "one-time" && (
          <FormField
            control={form.control}
            name="endDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Data Fine (opzionale)</FormLabel>
                <FormControl>
                  <Input {...field} value={field.value || ""} type="date" data-testid="input-plan-item-end-date" />
                </FormControl>
                <FormDescription>Lascia vuoto se la ricorrenza non ha una fine nota</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Note (opzionale)</FormLabel>
              <FormControl>
                <Textarea {...field} value={field.value || ""} data-testid="input-plan-item-notes" rows={2} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end space-x-2 pt-4">
          <Button type="submit" disabled={mutation.isPending} data-testid="button-submit-plan-item">
            {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {item ? "Salva" : "Crea Voce"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
