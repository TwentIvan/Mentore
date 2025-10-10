import type { IStorage } from "./storage";
import type { 
  GamificationPointEvent, 
  UserGamificationStats, 
  GamificationLevel, 
  AchievementDefinition,
  UserAchievement,
  Streak,
  MilestoneEvent 
} from "@shared/schema";

export type PointEventType = 
  | 'task_completed'
  | 'task_completed_on_time'
  | 'task_completed_early'
  | 'project_milestone'
  | 'project_completed'
  | 'time_tracked'
  | 'time_tracking_accurate'
  | 'planning_window_created'
  | 'planning_window_completed'
  | 'streak_milestone'
  | 'challenge_completed'
  | 'daily_login'
  | 'achievement_unlocked';

export interface AwardPointsParams {
  userId: string;
  organizationId: string;
  eventType: PointEventType;
  points: number;
  metadata?: any;
  sourceEntityType?: string;
  sourceEntityId?: string;
}

export class GamificationService {
  constructor(private storage: IStorage) {}

  /**
   * Award points to a user and handle all cascading effects:
   * - Create point event
   * - Update user stats (XP, total points, level)
   * - Check for level up
   * - Check for achievement unlocks
   * - Create milestone events
   */
  async awardPoints(params: AwardPointsParams): Promise<{
    pointEvent: GamificationPointEvent;
    stats: UserGamificationStats;
    levelUp?: GamificationLevel;
    achievements?: UserAchievement[];
    milestones?: MilestoneEvent[];
  }> {
    const { userId, organizationId, eventType, points, metadata, sourceEntityType, sourceEntityId } = params;

    // 1. Create point event
    const pointEvent = await this.storage.recordPointEvent({
      userId,
      organizationId,
      eventType,
      points,
      xp: points, // XP equals points for now
      sourceType: sourceEntityType || null,
      sourceId: sourceEntityId || null,
      metadata: metadata || null,
    });

    // 2. Get current stats and update
    const currentStats = await this.storage.ensureUserStats(userId, organizationId);
    const newXP = currentStats.totalXp + points;
    const newTotalPoints = currentStats.totalPoints + points;

    // 3. Check for level up (support multiple level jumps)
    const levels = await this.storage.getAllLevels();
    const sortedLevels = levels.sort((a, b) => a.level - b.level);

    let levelUp: GamificationLevel | undefined;
    let newLevel = currentStats.currentLevel;
    let finalXP = newXP;

    // Iterate through levels to find the highest reachable level
    for (const level of sortedLevels) {
      if (level.level > currentStats.currentLevel && finalXP >= level.xpThreshold) {
        newLevel = level.level;
        levelUp = level; // Keep updating to the highest level reached
      }
    }

    // 4. Update stats
    const updatedStats = await this.storage.updateUserStats(userId, organizationId, {
      totalXp: finalXP,
      currentLevel: newLevel,
      totalPoints: newTotalPoints,
    });

    // 5. Check for achievement unlocks
    const achievements = await this.checkAchievements(userId, organizationId, eventType, updatedStats);

    // 6. Create milestone events
    const milestones: MilestoneEvent[] = [];

    if (levelUp) {
      const milestone = await this.storage.createMilestoneEvent({
        userId,
        organizationId,
        milestoneType: 'level_up',
        sourceType: 'level',
        sourceId: levelUp.id,
        title: `Raggiunto livello ${levelUp.level}`,
        description: `Raggiunto livello ${levelUp.level}: ${levelUp.title}`,
      });
      milestones.push(milestone);
    }

    if (achievements && achievements.length > 0) {
      // Get all achievement definitions once
      const allAchievements = await this.storage.getAllAchievements();
      const achievementMap = new Map(allAchievements.map(a => [a.id, a]));
      
      for (const achievement of achievements) {
        const achievementDef = achievementMap.get(achievement.achievementId);
        if (achievementDef) {
          const milestone = await this.storage.createMilestoneEvent({
            userId,
            organizationId,
            milestoneType: 'achievement_unlocked',
            sourceType: 'achievement',
            sourceId: achievementDef.id,
            title: `Sbloccato achievement`,
            description: `Sbloccato achievement: ${achievementDef.title}`,
          });
          milestones.push(milestone);
        }
      }
    }

    return {
      pointEvent,
      stats: updatedStats,
      levelUp,
      achievements,
      milestones,
    };
  }

  /**
   * Check and unlock achievements based on user stats and event type
   */
  private async checkAchievements(
    userId: string, 
    organizationId: string, 
    eventType: PointEventType,
    stats: UserGamificationStats
  ): Promise<UserAchievement[]> {
    const achievements = await this.storage.getAllAchievements();
    const unlockedAchievements: UserAchievement[] = [];

    // Get already unlocked to avoid duplicates
    const alreadyUnlocked = await this.storage.getUserAchievements(userId, organizationId);
    const unlockedIds = new Set(alreadyUnlocked.map(a => a.achievementId));

    for (const achievement of achievements) {
      // Skip if already unlocked
      if (unlockedIds.has(achievement.id)) continue;

      // Check condition based on achievement type
      let shouldUnlock = false;

      switch (achievement.id) {
        case 'first_task':
          // Unlock on first task completion
          if (eventType === 'task_completed') {
            const taskEvents = await this.storage.getPointEvents(userId, organizationId, 100);
            const taskCount = taskEvents.filter(e => e.eventType === 'task_completed').length;
            shouldUnlock = taskCount === 1;
          }
          break;

        case 'task_master_10':
          // 10 tasks completed
          const taskEvents = await this.storage.getPointEvents(userId, organizationId, 100);
          const taskCount = taskEvents.filter(e => e.eventType === 'task_completed').length;
          shouldUnlock = taskCount >= 10;
          break;

        case 'level_5':
          // Reach level 5
          shouldUnlock = stats.currentLevel >= 5;
          break;

        case 'streak_7':
          // 7 day streak
          const dailyStreak = await this.storage.ensureStreak(userId, organizationId, 'daily');
          shouldUnlock = dailyStreak.currentCount >= 7;
          break;

        case 'points_1000':
          // 1000 total points
          shouldUnlock = stats.totalPoints >= 1000;
          break;

        case 'perfect_week':
          // Complete all planned windows in a week
          // TODO: Implement proper logic when we have more context
          shouldUnlock = false;
          break;

        case 'early_bird':
          // Complete 5 windows before 9 AM
          // TODO: Implement proper logic when we have time block data
          shouldUnlock = false;
          break;
      }

      if (shouldUnlock) {
        const unlocked = await this.storage.unlockAchievement(
          userId, 
          organizationId, 
          achievement.id,
          { eventType, stats }
        );
        unlockedAchievements.push(unlocked);
      }
    }

    return unlockedAchievements;
  }

  /**
   * Update streak for a user (called daily/weekly)
   */
  async updateStreak(userId: string, organizationId: string, scope: 'daily' | 'weekly'): Promise<{
    streak: Streak;
    pointEvent?: GamificationPointEvent;
  }> {
    const streak = await this.storage.ensureStreak(userId, organizationId, scope);
    
    // Award points for streak maintenance
    let pointEvent: GamificationPointEvent | undefined;
    
    if (streak.currentCount > 0) {
      const points = scope === 'daily' ? 5 : 20; // Base points
      const bonusPoints = Math.floor(streak.currentCount / 7) * 5; // Bonus every 7 days/weeks
      
      const result = await this.awardPoints({
        userId,
        organizationId,
        eventType: 'streak_milestone',
        points: points + bonusPoints,
        metadata: { streakCount: streak.currentCount, scope },
      });
      
      pointEvent = result.pointEvent;
    }

    return { streak, pointEvent };
  }

  /**
   * Award points for task completion
   */
  async awardTaskCompletionPoints(
    userId: string,
    organizationId: string,
    taskId: string,
    isOnTime: boolean = false,
    isEarly: boolean = false
  ): Promise<ReturnType<typeof this.awardPoints>> {
    const basePoints = 10;
    const onTimeBonus = 3;
    const earlyBonus = 5;
    
    let points = basePoints;
    let eventType: PointEventType = 'task_completed';
    
    if (isEarly) {
      points += earlyBonus;
      eventType = 'task_completed_early';
    } else if (isOnTime) {
      points += onTimeBonus;
      eventType = 'task_completed_on_time';
    }

    return this.awardPoints({
      userId,
      organizationId,
      eventType,
      points,
      metadata: { taskId, isOnTime, isEarly },
      sourceEntityType: 'task',
      sourceEntityId: taskId,
    });
  }

  /**
   * Award points for planning window completion
   */
  async awardWindowCompletionPoints(
    userId: string,
    organizationId: string,
    windowId: string,
    completionPercentage: number = 100
  ): Promise<ReturnType<typeof this.awardPoints>> {
    // Scale points based on completion percentage
    const basePoints = 20;
    const points = Math.floor(basePoints * (completionPercentage / 100));

    return this.awardPoints({
      userId,
      organizationId,
      eventType: 'planning_window_completed',
      points,
      metadata: { windowId, completionPercentage },
      sourceEntityType: 'planning_window',
      sourceEntityId: windowId,
    });
  }

  /**
   * Award points for challenge completion
   */
  async awardChallengeCompletionPoints(
    userId: string,
    organizationId: string,
    challengeId: string,
    challengeName: string
  ): Promise<ReturnType<typeof this.awardPoints>> {
    const points = 50; // Higher points for challenges

    return this.awardPoints({
      userId,
      organizationId,
      eventType: 'challenge_completed',
      points,
      metadata: { challengeId, challengeName },
      sourceEntityType: 'challenge_instance',
      sourceEntityId: challengeId,
    });
  }

  /**
   * Get gamification summary for a user
   */
  async getUserSummary(userId: string, organizationId: string): Promise<{
    stats: UserGamificationStats;
    currentLevel: GamificationLevel | null;
    nextLevel: GamificationLevel | null;
    recentEvents: GamificationPointEvent[];
    unlockedAchievements: UserAchievement[];
    dailyStreak: Streak;
    weeklyStreak: Streak;
    uncelebratedMilestones: MilestoneEvent[];
  }> {
    const [stats, levels, recentEvents, unlockedAchievements, dailyStreak, weeklyStreak, uncelebratedMilestones] = await Promise.all([
      this.storage.ensureUserStats(userId, organizationId),
      this.storage.getAllLevels(),
      this.storage.getPointEvents(userId, organizationId, 10),
      this.storage.getUserAchievements(userId, organizationId),
      this.storage.ensureStreak(userId, organizationId, 'daily'),
      this.storage.ensureStreak(userId, organizationId, 'weekly'),
      this.storage.getUncelebratedMilestones(userId, organizationId),
    ]);

    const currentLevel = levels.find(l => l.level === stats.currentLevel) || null;
    const nextLevel = levels.find(l => l.level === stats.currentLevel + 1) || null;

    return {
      stats,
      currentLevel,
      nextLevel,
      recentEvents,
      unlockedAchievements,
      dailyStreak,
      weeklyStreak,
      uncelebratedMilestones,
    };
  }
}
