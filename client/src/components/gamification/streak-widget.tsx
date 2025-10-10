import { Card } from "@/components/ui/card";
import { Flame, Calendar } from "lucide-react";
import type { Streak } from "@shared/schema";

interface StreakWidgetProps {
  dailyStreak: Streak;
  weeklyStreak: Streak;
}

export function StreakWidget({ dailyStreak, weeklyStreak }: StreakWidgetProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Daily Streak Card */}
      <Card className="p-6" data-testid="card-daily-streak">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-3">
              <Flame className="h-5 w-5 text-orange-500" />
              <h3 className="font-semibold">Streak Giornaliero</h3>
            </div>
            <div className="space-y-2">
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold" data-testid="text-daily-streak-current">{dailyStreak.currentCount}</span>
                <span className="text-muted-foreground">giorni</span>
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Trophy className="h-3 w-3" />
                  <span>Record: {dailyStreak.longestCount}</span>
                </div>
                {dailyStreak.lastEventDate && (
                  <div>
                    Ultimo: {new Date(dailyStreak.lastEventDate).toLocaleDateString('it-IT')}
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className={`h-16 w-16 rounded-full flex items-center justify-center ${
            dailyStreak.currentCount > 0 
              ? 'bg-orange-100 dark:bg-orange-900' 
              : 'bg-gray-100 dark:bg-gray-800'
          }`}>
            <Flame className={`h-8 w-8 ${
              dailyStreak.currentCount > 0 
                ? 'text-orange-500' 
                : 'text-gray-400'
            }`} />
          </div>
        </div>
      </Card>

      {/* Weekly Streak Card */}
      <Card className="p-6" data-testid="card-weekly-streak">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="h-5 w-5 text-blue-500" />
              <h3 className="font-semibold">Streak Settimanale</h3>
            </div>
            <div className="space-y-2">
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold" data-testid="text-weekly-streak-current">{weeklyStreak.currentCount}</span>
                <span className="text-muted-foreground">settimane</span>
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Trophy className="h-3 w-3" />
                  <span>Record: {weeklyStreak.longestCount}</span>
                </div>
                {weeklyStreak.lastEventDate && (
                  <div>
                    Ultimo: {new Date(weeklyStreak.lastEventDate).toLocaleDateString('it-IT')}
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className={`h-16 w-16 rounded-full flex items-center justify-center ${
            weeklyStreak.currentCount > 0 
              ? 'bg-blue-100 dark:bg-blue-900' 
              : 'bg-gray-100 dark:bg-gray-800'
          }`}>
            <Calendar className={`h-8 w-8 ${
              weeklyStreak.currentCount > 0 
                ? 'text-blue-500' 
                : 'text-gray-400'
            }`} />
          </div>
        </div>
      </Card>
    </div>
  );
}

function Trophy({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" />
      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </svg>
  );
}
