import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Trophy, Zap, TrendingUp } from "lucide-react";
import type { UserGamificationStats, GamificationLevel } from "@shared/schema";

interface StatsWidgetProps {
  stats: UserGamificationStats;
  currentLevel: GamificationLevel | null;
  nextLevel: GamificationLevel | null;
}

export function StatsWidget({ stats, currentLevel, nextLevel }: StatsWidgetProps) {
  // Calculate progress to next level
  const progressPercentage = nextLevel 
    ? Math.min(100, Math.round((stats.totalXp / nextLevel.xpThreshold) * 100))
    : 100;

  const xpToNextLevel = nextLevel 
    ? nextLevel.xpThreshold - stats.totalXp
    : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Total Points Card */}
      <Card className="p-6" data-testid="card-total-points">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Punti Totali</p>
            <p className="text-3xl font-bold mt-2" data-testid="text-total-points">{stats.totalPoints}</p>
          </div>
          <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
            <Trophy className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
        </div>
      </Card>

      {/* Current XP Card */}
      <Card className="p-6" data-testid="card-current-xp">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">XP Totali</p>
            <p className="text-3xl font-bold mt-2" data-testid="text-current-xp">{stats.totalXp}</p>
            {nextLevel && (
              <p className="text-xs text-muted-foreground mt-1">
                {xpToNextLevel} XP al livello {nextLevel.level}
              </p>
            )}
          </div>
          <div className="h-12 w-12 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
            <Zap className="h-6 w-6 text-purple-600 dark:text-purple-400" />
          </div>
        </div>
      </Card>

      {/* Current Level Card */}
      <Card className="p-6" data-testid="card-current-level">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground">Livello Attuale</p>
            <div className="flex items-baseline gap-2 mt-2">
              <p className="text-3xl font-bold" data-testid="text-current-level">{stats.currentLevel}</p>
              {currentLevel && (
                <p className="text-lg font-medium text-muted-foreground">{currentLevel.title}</p>
              )}
            </div>
            {nextLevel && (
              <div className="mt-3 space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Progresso</span>
                  <span>{progressPercentage}%</span>
                </div>
                <Progress value={progressPercentage} className="h-2" data-testid="progress-level" />
              </div>
            )}
          </div>
          <div className="h-12 w-12 rounded-full bg-amber-100 dark:bg-amber-900 flex items-center justify-center ml-4">
            <TrendingUp className="h-6 w-6 text-amber-600 dark:text-amber-400" />
          </div>
        </div>
      </Card>
    </div>
  );
}
