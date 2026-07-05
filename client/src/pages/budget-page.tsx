import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import BudgetSummaryTab from "@/components/budget/budget-summary-tab";
import BudgetAccountsTab from "@/components/budget/budget-accounts-tab";
import BudgetCategoriesTab from "@/components/budget/budget-categories-tab";
import BudgetPlanItemsTab from "@/components/budget/budget-plan-items-tab";
import BudgetTransactionsTab from "@/components/budget/budget-transactions-tab";

export default function BudgetPage() {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <Header title="Budget" subtitle="Piano annuale/mensile e movimenti reali su conti e carte" />

        <div className="p-6 space-y-6">
          <Tabs defaultValue="summary" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="summary" data-testid="tab-budget-summary">Riepilogo</TabsTrigger>
              <TabsTrigger value="accounts" data-testid="tab-budget-accounts">Conti</TabsTrigger>
              <TabsTrigger value="categories" data-testid="tab-budget-categories">Categorie</TabsTrigger>
              <TabsTrigger value="plan-items" data-testid="tab-budget-plan-items">Voci Pianificate</TabsTrigger>
              <TabsTrigger value="transactions" data-testid="tab-budget-transactions">Movimenti</TabsTrigger>
            </TabsList>

            <TabsContent value="summary" className="mt-6">
              <BudgetSummaryTab />
            </TabsContent>
            <TabsContent value="accounts" className="mt-6">
              <BudgetAccountsTab />
            </TabsContent>
            <TabsContent value="categories" className="mt-6">
              <BudgetCategoriesTab />
            </TabsContent>
            <TabsContent value="plan-items" className="mt-6">
              <BudgetPlanItemsTab />
            </TabsContent>
            <TabsContent value="transactions" className="mt-6">
              <BudgetTransactionsTab />
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
