import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { History, Plus, Minus } from "lucide-react";
import type { GamificationPointEvent } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";
import { it } from "date-fns/locale";

interface RecentEventsWidgetProps {
  events: GamificationPointEvent[];
}

const EVENT_TYPE_LABELS: Record<string, string> = {
  task_completed: "Task completato",
  task_completed_on_time: "Task completato in tempo",
  task_completed_early: "Task completato in anticipo",
  project_milestone: "Traguardo progetto",
  project_completed: "Progetto completato",
  time_tracked: "Tempo tracciato",
  time_tracking_accurate: "Tempo tracciato accurato",
  planning_window_created: "Finestra pianificata",
  planning_window_completed: "Finestra completata",
  streak_milestone: "Traguardo streak",
  challenge_completed: "Sfida completata",
  daily_login: "Login giornaliero",
  achievement_unlocked: "Achievement sbloccato",
};

export function RecentEventsWidget({ events }: RecentEventsWidgetProps) {
  return (
    <Card className="p-6" data-testid="card-recent-events">
      <div className="flex items-center gap-2 mb-4">
        <History className="h-5 w-5 text-muted-foreground" />
        <h3 className="font-semibold">Attività Recente</h3>
      </div>
      
      <ScrollArea className="h-[400px] pr-4">
        {events.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
            <History className="h-12 w-12 mb-2 opacity-20" />
            <p className="text-sm">Nessuna attività recente</p>
            <p className="text-xs mt-1">Completa task e finestre per guadagnare punti!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {events.map((event, index) => (
              <div
                key={event.id}
                className="flex items-start justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                data-testid={`event-item-${index}`}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm">
                      {EVENT_TYPE_LABELS[event.eventType] || event.eventType}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDistanceToNow(new Date(event.createdAt), { 
                      addSuffix: true,
                      locale: it 
                    })}
                  </p>
                </div>
                <div className="flex items-center gap-1 ml-4">
                  {event.points > 0 ? (
                    <Plus className="h-3 w-3 text-green-500" />
                  ) : (
                    <Minus className="h-3 w-3 text-red-500" />
                  )}
                  <span className={`font-bold text-sm ${
                    event.points > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                  }`}>
                    {event.points > 0 ? '+' : ''}{event.points}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </Card>
  );
}
