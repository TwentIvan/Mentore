import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import { useOrganization } from "@/contexts/organization-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown, PiggyBank } from "lucide-react";

const monthLabels = [
  "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
  "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre",
];

interface BudgetSummaryCategory {
  categoryId: string;
  categoryName: string;
  type: "income" | "expense";
  planned: number;
  actual: number;
  variance: number;
}

interface BudgetSummaryResponse {
  year: number;
  month: number;
  categories: BudgetSummaryCategory[];
  totals: {
    plannedIncome: number;
    actualIncome: number;
    plannedExpense: number;
    actualExpense: number;
    plannedSavings: number;
    actualSavings: number;
  };
}

function formatCurrency(value: number): string {
  return `€${value.toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function BudgetSummaryTab() {
  const { currentOrganizationId } = useOrganization();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const { data: summary, isLoading } = useQuery<BudgetSummaryResponse>({
    queryKey: [`/api/budget/summary?year=${year}&month=${month}`],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!currentOrganizationId,
  });

  const goToPrevMonth = () => {
    if (month === 1) { setMonth(12); setYear(year - 1); } else { setMonth(month - 1); }
  };
  const goToNextMonth = () => {
    if (month === 12) { setMonth(1); setYear(year + 1); } else { setMonth(month + 1); }
  };

  const totals = summary?.totals;
  const incomeCategories = summary?.categories.filter((c) => c.type === "income") || [];
  const expenseCategories = summary?.categories.filter((c) => c.type === "expense") || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-center gap-4">
        <Button variant="outline" size="icon" onClick={goToPrevMonth} data-testid="button-summary-prev-month">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-lg font-medium min-w-[180px] text-center" data-testid="text-summary-period">
          {monthLabels[month - 1]} {year}
        </span>
        <Button variant="outline" size="icon" onClick={goToNextMonth} data-testid="button-summary-next-month">
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {isLoading || !totals ? (
        <div className="text-sm text-muted-foreground text-center">Caricamento...</div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Entrate</p>
                    <p className="text-2xl font-bold text-foreground" data-testid="text-total-income-actual">
                      {formatCurrency(totals.actualIncome)}
                    </p>
                    <p className="text-xs text-muted-foreground">Pianificato: {formatCurrency(totals.plannedIncome)}</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Uscite</p>
                    <p className="text-2xl font-bold text-foreground" data-testid="text-total-expense-actual">
                      {formatCurrency(totals.actualExpense)}
                    </p>
                    <p className="text-xs text-muted-foreground">Pianificato: {formatCurrency(totals.plannedExpense)}</p>
                  </div>
                  <TrendingDown className="h-8 w-8 text-red-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Risparmio</p>
                    <p className={`text-2xl font-bold ${totals.actualSavings < 0 ? "text-destructive" : "text-foreground"}`} data-testid="text-total-savings-actual">
                      {formatCurrency(totals.actualSavings)}
                    </p>
                    <p className="text-xs text-muted-foreground">Pianificato: {formatCurrency(totals.plannedSavings)}</p>
                  </div>
                  <PiggyBank className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Entrate per Categoria</CardTitle>
            </CardHeader>
            <CardContent>
              <SummaryCategoryTable categories={incomeCategories} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Uscite per Categoria</CardTitle>
            </CardHeader>
            <CardContent>
              <SummaryCategoryTable categories={expenseCategories} />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function SummaryCategoryTable({ categories }: { categories: BudgetSummaryCategory[] }) {
  if (categories.length === 0) {
    return <p className="text-sm text-muted-foreground">Nessuna categoria con importi in questo mese.</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-muted-foreground">
            <th className="py-2 pr-4">Categoria</th>
            <th className="py-2 pr-4 text-right">Pianificato</th>
            <th className="py-2 pr-4 text-right">Effettivo</th>
            <th className="py-2 text-right">Scostamento</th>
          </tr>
        </thead>
        <tbody>
          {categories.map((cat) => {
            const isBad = cat.type === "expense" ? cat.variance > 0 : cat.variance < 0;
            return (
              <tr key={cat.categoryId} className="border-b last:border-0" data-testid={`row-summary-category-${cat.categoryId}`}>
                <td className="py-2 pr-4">{cat.categoryName}</td>
                <td className="py-2 pr-4 text-right">{formatCurrency(cat.planned)}</td>
                <td className="py-2 pr-4 text-right">{formatCurrency(cat.actual)}</td>
                <td className={`py-2 text-right font-medium ${isBad ? "text-destructive" : "text-muted-foreground"}`}>
                  {cat.variance > 0 ? "+" : ""}{formatCurrency(cat.variance)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
