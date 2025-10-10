import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { StatsWidget } from "@/components/gamification/stats-widget";
import { StreakWidget } from "@/components/gamification/streak-widget";
import { RecentEventsWidget } from "@/components/gamification/recent-events-widget";
import { AchievementsPreviewWidget } from "@/components/gamification/achievements-preview-widget";
import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import { useOrganization } from "@/contexts/organization-context";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { Trophy } from "lucide-react";
import type { 
  AchievementDefinition, 
  UserGamificationStats,
  GamificationLevel,
  GamificationPointEvent,
  UserAchievement,
  Streak,
  MilestoneEvent
} from "@shared/schema";

interface GamificationSummary {
  stats: UserGamificationStats;
  currentLevel: GamificationLevel | null;
  nextLevel: GamificationLevel | null;
  recentEvents: GamificationPointEvent[];
  unlockedAchievements: (UserAchievement & { achievement: AchievementDefinition })[];
  dailyStreak: Streak;
  weeklyStreak: Streak;
  uncelebratedMilestones: MilestoneEvent[];
}

export default function GamificationPage() {
  const { currentOrganizationId } = useOrganization();

  // Fetch gamification summary
  const { data: summary, isLoading } = useQuery<GamificationSummary>({
    queryKey: ['/api/gamification/stats', currentOrganizationId],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!currentOrganizationId,
  });

  // Fetch all achievements for count
  const { data: allAchievements = [] } = useQuery<AchievementDefinition[]>({
    queryKey: ['/api/gamification/achievements'],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  if (isLoading) {
    return (
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-auto">
          <Header 
            title="Gamification" 
            subtitle="Monitora i tuoi progressi e achievement"
          />
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[...Array(3)].map((_, i) => (
                <Card key={i} className="p-6">
                  <Skeleton className="h-20 w-full" />
                </Card>
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[...Array(2)].map((_, i) => (
                <Card key={i} className="p-6">
                  <Skeleton className="h-32 w-full" />
                </Card>
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-auto">
          <Header 
            title="Gamification" 
            subtitle="Monitora i tuoi progressi e achievement"
          />
          <div className="p-6">
            <Card className="p-12 text-center">
              <Trophy className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-20" />
              <h3 className="text-lg font-semibold mb-2">Sistema Gamification</h3>
              <p className="text-muted-foreground">
                Inizia a completare task e finestre per guadagnare punti e sbloccare achievement!
              </p>
            </Card>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <Header 
          title="Gamification" 
          subtitle="Monitora i tuoi progressi e achievement"
        />
        
        <div className="p-6 space-y-6">
          {/* Stats Cards - Points, XP, Level */}
          <StatsWidget 
            stats={summary.stats}
            currentLevel={summary.currentLevel}
            nextLevel={summary.nextLevel}
          />

          {/* Streaks */}
          <StreakWidget 
            dailyStreak={summary.dailyStreak}
            weeklyStreak={summary.weeklyStreak}
          />

          {/* Recent Events & Achievements Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <RecentEventsWidget events={summary.recentEvents} />
            <AchievementsPreviewWidget 
              unlockedAchievements={summary.unlockedAchievements}
              totalAchievements={allAchievements.length}
              onViewAll={() => {
                // TODO: Navigate to full achievements page
                console.log('View all achievements');
              }}
            />
          </div>

          {/* Uncelebrated Milestones Alert (if any) */}
          {summary.uncelebratedMilestones.length > 0 && (
            <Card className="p-6 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950 dark:to-orange-950 border-amber-200 dark:border-amber-800">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-amber-900 dark:text-amber-100">
                    🎉 Hai {summary.uncelebratedMilestones.length} traguardi da celebrare!
                  </h4>
                  <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                    Clicca per vedere i tuoi ultimi achievement e traguardi
                  </p>
                </div>
              </div>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
