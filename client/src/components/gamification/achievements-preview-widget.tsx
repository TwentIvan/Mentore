import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Award, Lock, ArrowRight } from "lucide-react";
import type { AchievementDefinition, UserAchievement } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";
import { it } from "date-fns/locale";

interface AchievementsPreviewWidgetProps {
  unlockedAchievements: (UserAchievement & { achievement: AchievementDefinition })[];
  totalAchievements: number;
  onViewAll?: () => void;
}

const TIER_COLORS = {
  bronze: "bg-amber-700 text-white",
  silver: "bg-gray-400 text-white",
  gold: "bg-yellow-500 text-white",
  platinum: "bg-blue-400 text-white",
  diamond: "bg-cyan-400 text-white",
};

export function AchievementsPreviewWidget({ 
  unlockedAchievements, 
  totalAchievements,
  onViewAll 
}: AchievementsPreviewWidgetProps) {
  const unlockedCount = unlockedAchievements.length;
  const progressPercentage = totalAchievements > 0 
    ? Math.round((unlockedCount / totalAchievements) * 100) 
    : 0;

  // Show max 3 most recent unlocked achievements
  const recentUnlocked = [...unlockedAchievements]
    .sort((a, b) => new Date(b.earnedAt).getTime() - new Date(a.earnedAt).getTime())
    .slice(0, 3);

  return (
    <Card className="p-6" data-testid="card-achievements-preview">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Award className="h-5 w-5 text-muted-foreground" />
          <h3 className="font-semibold">Achievement</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {unlockedCount}/{totalAchievements}
          </span>
          <span className="text-sm font-semibold text-primary">
            {progressPercentage}%
          </span>
        </div>
      </div>

      {recentUnlocked.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
          <Lock className="h-12 w-12 mb-2 opacity-20" />
          <p className="text-sm">Nessun achievement sbloccato</p>
          <p className="text-xs mt-1">Completa obiettivi per sbloccare achievement!</p>
        </div>
      ) : (
        <div className="space-y-3 mb-4">
          {recentUnlocked.map((ua, index) => (
            <div
              key={ua.id}
              className="flex items-start gap-3 p-3 rounded-lg bg-muted/50"
              data-testid={`achievement-item-${index}`}
            >
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <span className="text-xl">{ua.achievement.icon}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium text-sm">{ua.achievement.title}</p>
                  <Badge 
                    variant="secondary" 
                    className={`${TIER_COLORS[ua.achievement.tier]} text-xs`}
                  >
                    {ua.achievement.tier}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {ua.achievement.description}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Sbloccato {formatDistanceToNow(new Date(ua.earnedAt), { 
                    addSuffix: true,
                    locale: it 
                  })}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {unlockedAchievements.length > 3 && (
        <Button
          variant="outline"
          className="w-full"
          onClick={onViewAll}
          data-testid="button-view-all-achievements"
        >
          Vedi tutti gli achievement
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      )}
    </Card>
  );
}
