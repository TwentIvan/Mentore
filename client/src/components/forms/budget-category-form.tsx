import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { insertBudgetCategorySchema, type BudgetCategory } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";

const formSchema = insertBudgetCategorySchema.omit({ userId: true });
type FormData = z.infer<typeof formSchema>;

interface BudgetCategoryFormProps {
  category?: BudgetCategory | null;
  onSuccess?: () => void;
}

export default function BudgetCategoryForm({ category, onSuccess }: BudgetCategoryFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: category?.name || "",
      type: category?.type || "expense",
      isActive: category?.isActive ?? true,
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      const res = category
        ? await apiRequest("PUT", `/api/budget-categories/${category.id}`, data)
        : await apiRequest("POST", "/api/budget-categories", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/budget-categories"] });
      toast({ title: category ? "Categoria aggiornata" : "Categoria creata" });
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
                <Input {...field} data-testid="input-category-name" placeholder="Es. Alimentari" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tipo</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger data-testid="select-category-type">
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

        <div className="flex justify-end space-x-2 pt-4">
          <Button type="submit" disabled={mutation.isPending} data-testid="button-submit-category">
            {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {category ? "Salva" : "Crea Categoria"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
