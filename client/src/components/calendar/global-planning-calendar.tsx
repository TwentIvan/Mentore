import { useMemo, useState, type ComponentType } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  ChevronLeft, ChevronRight, X, Pencil,
  Calendar, FolderTree, Clock,
  Tag, Briefcase, GraduationCap, Dumbbell, Heart, Home, Music, Palette, Sparkles,
  Book, BookOpen, Coffee, Camera, Plane, Car, ShoppingBag, Users, Star, Zap,
  Laptop, Phone, Mail, MessageSquare, Video, Mic, Headphones, Globe, Map, MapPin, Navigation,
  Flag, Award, Target, Trophy, Gift, Rocket, Lightbulb, Flame, Sun, Moon,
  Cloud, Umbrella, Droplet, Wind, Snowflake, Leaf, Flower2, Trees, Mountain, Waves,
  Pizza, UtensilsCrossed, IceCream, Wine, Cookie, Apple, Carrot, Sandwich, Soup,
  Gamepad2, Puzzle, Dice5, Swords, Shield, Crown, Gem, Coins, Banknote, CreditCard,
  Shirt, Watch, Glasses, Footprints, Backpack, Bike, Train, Bus, Sailboat,
  Baby, Dog, Cat, Bird, Fish, Bug, Rabbit, Squirrel, Turtle,
  Smile, Laugh, Frown, Meh, ThumbsUp, ThumbsDown, HeartHandshake, Handshake,
  Wrench, Hammer, Settings, Cog, HardHat, Construction, Package, Cpu, CircuitBoard, Plug, Factory, Warehouse, Container, Boxes
} from "lucide-react";
import { PlanningWindow, Project, InterestArea } from "@shared/schema";
import { 
  format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, 
  isWithinInterval, addDays, startOfWeek, endOfWeek, startOfDay, endOfDay, addWeeks, 
  subWeeks, subDays, eachHourOfInterval, isSameHour, parseISO, setHours, setMinutes,
  isAfter, isBefore, differenceInMinutes, max, min
} from "date-fns";

interface PlanningWindowWithProject extends PlanningWindow {
  project: Project | null;
  interestArea: InterestArea | null;
}

interface GlobalPlanningCalendarProps {
  onWindowSelect?: (window: PlanningWindow) => void;
}

interface ExpandedPlanningInstance {
  window: PlanningWindow;
  project: Project | null;
  interestArea: InterestArea | null;
  date: Date;
  startTime: string;
  endTime: string;
  level: number;
}

type CalendarView = 'month' | 'week' | 'day';

// Icon mapping for interest areas (from interest-areas-page.tsx)
const iconMap: Record<string, ComponentType<{ className?: string }>> = {
  Tag, Briefcase, GraduationCap, Dumbbell, Heart, Home, Music, Palette, Sparkles,
  Book, BookOpen, Coffee, Camera, Plane, Car, ShoppingBag, Users, Star, Zap,
  Clock, Calendar,
  Laptop, Phone, Mail, MessageSquare, Video, Mic, Headphones, Globe, Map, MapPin, Navigation,
  Flag, Award, Target, Trophy, Gift, Rocket, Lightbulb, Flame, Sun, Moon,
  Cloud, Umbrella, Droplet, Wind, Snowflake, Leaf, Flower2, Trees, Mountain, Waves,
  Pizza, UtensilsCrossed, IceCream, Wine, Cookie, Apple, Carrot, Sandwich, Soup,
  Gamepad2, Puzzle, Dice5, Swords, Shield, Crown, Gem, Coins, Banknote, CreditCard,
  Shirt, Watch, Glasses, Footprints, Backpack, Bike, Train, Bus, Sailboat,
  Baby, Dog, Cat, Bird, Fish, Bug, Rabbit, Squirrel, Turtle,
  Smile, Laugh, Frown, Meh, ThumbsUp, ThumbsDown, HeartHandshake, Handshake,
  Wrench, Hammer, Settings, Cog, HardHat, Construction, Package, Cpu, CircuitBoard, Plug, Factory, Warehouse, Container, Boxes
};

// Helper to get icon component with fallback
const getIconComponent = (iconName: string | null | undefined) => {
  if (!iconName) return null;
  return iconMap[iconName] || Tag; // Fallback to Tag icon if not found
};

export default function GlobalPlanningCalendar({ onWindowSelect }: GlobalPlanningCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<CalendarView>('month');
  const [hoveredWindowId, setHoveredWindowId] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [windowToDelete, setWindowToDelete] = useState<PlanningWindow | null>(null);
  const [selectedWindowIds, setSelectedWindowIds] = useState<Set<string>>(new Set());
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [windowToEdit, setWindowToEdit] = useState<PlanningWindow | null>(null);
  
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // Fetch all planning windows for the user
  const { data: planningWindowsWithProject, isLoading } = useQuery<PlanningWindowWithProject[]>({
    queryKey: ["/api/planning-windows", "user"],
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/planning-windows/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/planning-windows"] });
      setShowDeleteDialog(false);
      setWindowToDelete(null);
      toast({
        title: "Pianificazione eliminata",
        description: "La pianificazione è stata eliminata con successo",
      });
    },
    onError: () => {
      toast({
        title: "Errore",
        description: "Impossibile eliminare la pianificazione",
        variant: "destructive",
      });
    },
  });

  // Bulk delete mutation
  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      await Promise.all(ids.map(id => apiRequest("DELETE", `/api/planning-windows/${id}`)));
    },
    onSuccess: (_, ids) => {
      queryClient.invalidateQueries({ queryKey: ["/api/planning-windows"] });
      setShowBulkDeleteDialog(false);
      setSelectedWindowIds(new Set());
      toast({
        title: "Pianificazioni eliminate",
        description: `${ids.length} pianificazioni eliminate con successo`,
      });
    },
    onError: () => {
      toast({
        title: "Errore",
        description: "Impossibile eliminare le pianificazioni",
        variant: "destructive",
      });
    },
  });

  const handleDeleteClick = (e: React.MouseEvent, window: PlanningWindow) => {
    e.stopPropagation(); // Prevent window selection
    setWindowToDelete(window);
    setShowDeleteDialog(true);
  };

  const handleEditClick = (e: React.MouseEvent, window: PlanningWindow) => {
    e.stopPropagation(); // Prevent window selection
    setWindowToEdit(window);
    setShowEditDialog(true);
  };

  const handleToggleSelection = (windowId: string) => {
    const newSelection = new Set(selectedWindowIds);
    if (newSelection.has(windowId)) {
      newSelection.delete(windowId);
    } else {
      newSelection.add(windowId);
    }
    setSelectedWindowIds(newSelection);
  };

  const handleSelectAll = () => {
    if (!planningWindowsWithProject) return;
    const allIds = new Set(planningWindowsWithProject.map(w => w.id));
    setSelectedWindowIds(allIds);
  };

  const handleDeselectAll = () => {
    setSelectedWindowIds(new Set());
  };

  const handleBulkDelete = () => {
    setShowBulkDeleteDialog(true);
  };

  const confirmBulkDelete = () => {
    bulkDeleteMutation.mutate(Array.from(selectedWindowIds));
  };

  // Build project hierarchy map
  const projectHierarchy = useMemo(() => {
    if (!planningWindowsWithProject) return new Map<string, number>();
    
    const hierarchy = new Map<string, number>();
    const projects = Array.from(new Set(planningWindowsWithProject.map(w => w.project).filter(p => p !== null)));
    
    const calculateDepth = (project: Project, visited = new Set<string>()): number => {
      if (visited.has(project.id)) return 0;
      visited.add(project.id);
      
      if (!project.parentProjectId) return 0;
      
      const parent = projects.find(p => p.id === project.parentProjectId);
      if (!parent) return 0;
      
      return 1 + calculateDepth(parent, visited);
    };
    
    projects.forEach(project => {
      hierarchy.set(project.id, calculateDepth(project));
    });
    
    return hierarchy;
  }, [planningWindowsWithProject]);

  // Get date range based on view
  const getDateRange = () => {
    switch (view) {
      case 'day':
        return {
          start: startOfDay(currentDate),
          end: endOfDay(currentDate)
        };
      case 'week':
        return {
          start: startOfWeek(currentDate, { weekStartsOn: 1 }),
          end: endOfWeek(currentDate, { weekStartsOn: 1 })
        };
      case 'month':
      default:
        const monthStart = startOfMonth(currentDate);
        const monthEnd = endOfMonth(currentDate);
        return {
          start: startOfWeek(monthStart, { weekStartsOn: 1 }),
          end: endOfWeek(monthEnd, { weekStartsOn: 1 })
        };
    }
  };

  // Expand planning windows for current view
  const expandedInstances = useMemo(() => {
    if (!planningWindowsWithProject) return [];
    
    const { start: calendarStart, end: calendarEnd } = getDateRange();
    const instances: ExpandedPlanningInstance[] = [];
    
    planningWindowsWithProject.forEach(({ project, interestArea, ...window }) => {
      const windowStart = new Date(window.startDate);
      const windowEnd = new Date(window.endDate);
      const projectLevel = project ? (projectHierarchy.get(project.id) || 0) : 0;
      
      if (window.recurrenceType === 'none') {
        if (isWithinInterval(windowStart, { start: calendarStart, end: calendarEnd }) ||
            isWithinInterval(windowEnd, { start: calendarStart, end: calendarEnd }) ||
            (windowStart <= calendarStart && windowEnd >= calendarEnd)) {
          
          // Per i progetti padre, creiamo istanze per ogni giorno nel range della planning window
          // Questo assicura che il box padre sia continuo anche quando ci sono gap tra i progetti figlio
          const hasChildProjects = project ? planningWindowsWithProject.some(w => w.project?.parentProjectId === project.id) : false;
          
          if (hasChildProjects || projectLevel === 0) {
            // Per progetti padre o progetti di primo livello, creiamo istanze per ogni giorno
            const rangeStart = max([windowStart, calendarStart]);
            const rangeEnd = min([windowEnd, calendarEnd]);
            const dayRange = eachDayOfInterval({ start: rangeStart, end: rangeEnd });
            
            dayRange.forEach(day => {
              instances.push({
                window,
                project,
                interestArea,
                date: day,
                startTime: window.startTime || '09:00',
                endTime: window.endTime || '17:00',
                level: projectLevel
              });
            });
          } else {
            // Per i progetti figlio senza sotto-progetti, manteniamo la logica originale
            instances.push({
              window,
              project,
              interestArea,
              date: windowStart,
              startTime: window.startTime || '09:00',
              endTime: window.endTime || '17:00',
              level: projectLevel
            });
          }
        }
      } else {
        const interval = window.recurrenceInterval || 1;
        const endRecurrence = window.recurrenceEnd ? new Date(window.recurrenceEnd) : calendarEnd;
        
        if (window.recurrenceType === 'weekly' && window.daysOfWeek && window.daysOfWeek.length > 0) {
          const startWeek = startOfWeek(windowStart, { weekStartsOn: 1 });
          let currentWeek = startWeek;
          let weekCount = 0;
          
          while (currentWeek <= endRecurrence && currentWeek <= calendarEnd) {
            if (weekCount % interval === 0) {
              window.daysOfWeek.forEach(dayOfWeekNumber => {
                const dayOffset = dayOfWeekNumber === 7 ? 6 : dayOfWeekNumber - 1;
                const targetDate = addDays(currentWeek, dayOffset);
                
                const targetDateOnly = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
                const windowStartOnly = new Date(windowStart.getFullYear(), windowStart.getMonth(), windowStart.getDate());
                const endRecurrenceOnly = new Date(endRecurrence.getFullYear(), endRecurrence.getMonth(), endRecurrence.getDate());
                
                if (targetDateOnly >= windowStartOnly && 
                    targetDateOnly <= endRecurrenceOnly && 
                    targetDate >= calendarStart && 
                    targetDate <= calendarEnd) {
                  instances.push({
                    window,
                    project,
                    interestArea,
                    date: new Date(targetDate),
                    startTime: window.startTime || '09:00',
                    endTime: window.endTime || '17:00',
                    level: projectLevel
                  });
                }
              });
            }
            
            currentWeek = addDays(currentWeek, 7);
            weekCount++;
            
            if (weekCount > 1000) break;
          }
        } else {
          let currentInstanceDate = new Date(windowStart);
          
          while (currentInstanceDate <= endRecurrence && currentInstanceDate <= calendarEnd) {
            if (currentInstanceDate >= calendarStart) {
              instances.push({
                window,
                project,
                interestArea,
                date: new Date(currentInstanceDate),
                startTime: window.startTime || '09:00',
                endTime: window.endTime || '17:00',
                level: projectLevel
              });
            }
            
            switch (window.recurrenceType) {
              case 'daily':
                currentInstanceDate = addDays(currentInstanceDate, interval);
                break;
              case 'monthly':
                currentInstanceDate = new Date(currentInstanceDate.setMonth(currentInstanceDate.getMonth() + interval));
                break;
              case 'yearly':
                currentInstanceDate = new Date(currentInstanceDate.setFullYear(currentInstanceDate.getFullYear() + interval));
                break;
              default:
                currentInstanceDate = addDays(currentInstanceDate, 1);
                break;
            }
            
            if (currentInstanceDate.getTime() <= new Date(windowStart).getTime()) {
              break;
            }
          }
        }
      }
    });
    
    return instances;
  }, [planningWindowsWithProject, currentDate, view, projectHierarchy]);

  // Navigation functions
  const navigate = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      switch (view) {
        case 'day':
          return direction === 'prev' ? subDays(prev, 1) : addDays(prev, 1);
        case 'week':
          return direction === 'prev' ? subWeeks(prev, 1) : addWeeks(prev, 1);
        case 'month':
        default:
          return direction === 'prev' ? subMonths(prev, 1) : addMonths(prev, 1);
      }
    });
  };

  // Helper functions per colori gerarchici
  // Utility per convertire hex a rgb
  const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  };

  // Utility per convertire rgb a hex
  const rgbToHex = (r: number, g: number, b: number): string => {
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  };

  // Funzione per schiarire un colore in base al livello gerarchico
  const getLighterColor = (baseColor: string, level: number): string => {
    const rgb = hexToRgb(baseColor);
    if (!rgb) return baseColor;
    
    // Aumenta la luminosità del 20% per ogni livello
    const factor = level * 0.2;
    const newR = Math.min(255, Math.round(rgb.r + (255 - rgb.r) * factor));
    const newG = Math.min(255, Math.round(rgb.g + (255 - rgb.g) * factor));
    const newB = Math.min(255, Math.round(rgb.b + (255 - rgb.b) * factor));
    
    return rgbToHex(newR, newG, newB);
  };

  // Funzione per generare gli stili inline per un progetto e livello
  const getProjectColorStyle = (projectColor: string, level: number): { backgroundColor: string; borderColor: string; color: string } => {
    const lightColor = getLighterColor(projectColor, level);
    const rgb = hexToRgb(lightColor);
    if (!rgb) return { backgroundColor: '#E5E7EB', borderColor: '#D1D5DB', color: '#374151' };
    
    // Calcola luminosità per determinare il colore del testo
    const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
    const textColor = luminance > 0.6 ? '#374151' : '#FFFFFF';
    
    return {
      backgroundColor: lightColor,
      borderColor: projectColor, // Il bordo usa sempre il colore base del progetto
      color: textColor
    };
  };

  const getLevelIndentation = (level: number) => {
    return level * 4;
  };

  // Funzione per trovare il colore di un planning window (da progetto o area di interesse)
  const getPlanningWindowColor = (pwp: { project: Project | null; interestArea: InterestArea | null }): string => {
    // Se ha un progetto, usa il colore del progetto (con gerarchia)
    if (pwp.project) {
      return getProjectHierarchyColor(pwp.project);
    }
    // Altrimenti usa il colore dell'area di interesse
    if (pwp.interestArea && pwp.interestArea.color) {
      return pwp.interestArea.color;
    }
    // Fallback
    return '#3B82F6';
  };

  // Funzione per trovare il colore del progetto padre nella gerarchia
  const getProjectHierarchyColor = (project: Project | null): string => {
    if (!project) return '#3B82F6'; // Default color for null projects
    
    // Se il progetto ha un padre, cerca ricorsivamente il colore del progetto root
    if (project.parentProjectId && planningWindowsWithProject) {
      const parentProject = planningWindowsWithProject
        .map(pwp => pwp.project)
        .filter((p): p is Project => p !== null)
        .find((p) => p.id === project.parentProjectId);
      if (parentProject) {
        return getProjectHierarchyColor(parentProject);
      }
    }
    // Questo è il progetto root, restituisce il suo colore
    return project.color || '#3B82F6';
  };

  const formatDateRange = () => {
    switch (view) {
      case 'day':
        return format(currentDate, 'EEEE, dd MMMM yyyy');
      case 'week':
        const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
        const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
        return `${format(weekStart, 'dd MMM')} - ${format(weekEnd, 'dd MMM yyyy')}`;
      case 'month':
      default:
        return format(currentDate, 'MMMM yyyy');
    }
  };

  // Calculate continuous periods for month view
  const getContinuousPeriods = () => {
    if (!planningWindowsWithProject) return [];
    
    const { start: calendarStart, end: calendarEnd } = getDateRange();
    const periods: Array<{
      window: PlanningWindow;
      project: Project | null;
      level: number;
      startDate: Date;
      endDate: Date;
      startTime: string;
      endTime: string;
    }> = [];
    
    planningWindowsWithProject.forEach(({ project, ...window }) => {
      if (!project) return; // Skip planning windows without a project
      
      const windowStart = new Date(window.startDate);
      const windowEnd = new Date(window.endDate);
      const projectLevel = projectHierarchy.get(project.id) || 0;
      
      // Solo progetti padre o senza padre
      const hasChildProjects = planningWindowsWithProject.some(w => w.project?.parentProjectId === project.id);
      if (hasChildProjects || !project.parentProjectId) {
        // Intersect with calendar range
        const rangeStart = max([windowStart, calendarStart]);
        const rangeEnd = min([windowEnd, calendarEnd]);
        
        if (rangeStart <= rangeEnd) {
          periods.push({
            window,
            project,
            level: projectLevel,
            startDate: rangeStart,
            endDate: rangeEnd,
            startTime: window.startTime || '09:00',
            endTime: window.endTime || '17:00'
          });
        }
      }
    });
    
    return periods.sort((a, b) => a.level - b.level);
  };

  // Funzione per convertire time string in minuti dall'inizio della giornata (come nella vista settimanale)
  const timeToMinutes = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  };

  // Funzione per verificare se due eventi si sovrappongono temporalmente
  const doEventsOverlap = (event1: { startTime: string; endTime: string }, event2: { startTime: string; endTime: string }) => {
    const start1 = timeToMinutes(event1.startTime);
    const end1 = timeToMinutes(event1.endTime);
    const start2 = timeToMinutes(event2.startTime);
    const end2 = timeToMinutes(event2.endTime);
    
    return start1 < end2 && start2 < end1;
  };

  // Funzione per calcolare le colonne di affiancamento per eventi sovrapposti usando gruppi di conflitto
  const calculateEventColumns = (events: ExpandedPlanningInstance[]) => {
    if (events.length === 0) return [];
    
    // Crea gruppi di conflitto: eventi che si sovrappongono devono stare nello stesso gruppo
    const conflictGroups: Set<ExpandedPlanningInstance>[] = [];
    const eventToGroup = new Map<ExpandedPlanningInstance, Set<ExpandedPlanningInstance>>();
    
    events.forEach(event => {
      // Trova tutti i gruppi con cui questo evento si sovrappone
      const overlappingGroups = conflictGroups.filter(group => 
        Array.from(group).some(other => doEventsOverlap(event, other))
      );
      
      if (overlappingGroups.length === 0) {
        // Nessuna sovrapposizione, crea nuovo gruppo
        const newGroup = new Set([event]);
        conflictGroups.push(newGroup);
        eventToGroup.set(event, newGroup);
      } else if (overlappingGroups.length === 1) {
        // Si sovrappone con un solo gruppo, aggiungilo
        overlappingGroups[0].add(event);
        eventToGroup.set(event, overlappingGroups[0]);
      } else {
        // Si sovrappone con più gruppi, uniscili tutti
        const mergedGroup = new Set([event]);
        overlappingGroups.forEach(group => {
          group.forEach(e => {
            mergedGroup.add(e);
            eventToGroup.set(e, mergedGroup);
          });
          conflictGroups.splice(conflictGroups.indexOf(group), 1);
        });
        conflictGroups.push(mergedGroup);
      }
    });
    
    // Ora assegna le colonne all'interno di ogni gruppo
    const columns: { instance: ExpandedPlanningInstance; column: number; totalColumns: number }[] = [];
    
    conflictGroups.forEach(group => {
      const groupEvents = Array.from(group).sort((a, b) => 
        timeToMinutes(a.startTime) - timeToMinutes(b.startTime)
      );
      
      const groupColumns: number[] = [];
      
      groupEvents.forEach(event => {
        // Trova le colonne già occupate da eventi sovrapposti in questo gruppo
        const usedColumns = new Set<number>();
        groupEvents.forEach((other, otherIdx) => {
          if (other !== event && doEventsOverlap(event, other) && groupColumns[groupEvents.indexOf(other)] !== undefined) {
            usedColumns.add(groupColumns[groupEvents.indexOf(other)]);
          }
        });
        
        // Trova la prima colonna disponibile
        let column = 0;
        while (usedColumns.has(column)) {
          column++;
        }
        
        groupColumns[groupEvents.indexOf(event)] = column;
      });
      
      // Trova il numero totale di colonne necessarie per questo gruppo
      const totalColumns = Math.max(...groupColumns) + 1;
      
      // Assegna i risultati
      groupEvents.forEach((event, idx) => {
        columns.push({
          instance: event,
          column: groupColumns[idx],
          totalColumns: totalColumns
        });
      });
    });
    
    return columns;
  };

  // Render functions for different views
  const renderMonthView = () => {
    const { start: calendarStart, end: calendarEnd } = getDateRange();
    const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
    
    const instancesByDate = expandedInstances.reduce((acc, instance) => {
      const dateKey = format(instance.date, 'yyyy-MM-dd');
      if (!acc[dateKey]) acc[dateKey] = [];
      acc[dateKey].push(instance);
      return acc;
    }, {} as Record<string, ExpandedPlanningInstance[]>);

    // Aggiungi i periodi continui per i progetti padre
    const continuousPeriods = getContinuousPeriods();
    
    Object.keys(instancesByDate).forEach(dateKey => {
      instancesByDate[dateKey].sort((a, b) => a.level - b.level);
    });

    // Altezza fissa per tutti i giorni per mantenere allineamento griglia
    // Per far stare il mese in una schermata: 6 settimane * 140px = 840px + headers
    const FIXED_DAY_HEIGHT = 140; // Altezza per fit in schermata
    const HEADER_HEIGHT = 28; // Spazio per numero del giorno
    const CONTENT_HEIGHT = FIXED_DAY_HEIGHT - HEADER_HEIGHT; // 112px effettivi
    // Con 112px di contenuto: 8 ore = 1/3 = ~37px, quindi ~4.7px per ora

    // Funzione ricorsiva per renderizzare progetti padre -> figli
    const renderHierarchicalProjects = (instances: ExpandedPlanningInstance[], availableHeight: number, parentBounds?: { start: number, end: number, level: number }) => {
      const minutesInDay = 24 * 60; // 1440 minuti
      // IMPORTANTE: Usa l'altezza totale della cella (140px) per calcoli proporzioni corrette
      const totalCellHeight = FIXED_DAY_HEIGHT; // 140px per proporzioni corrette
      
      // Calcola colonne di affiancamento per eventi sovrapposti
      const eventColumns = calculateEventColumns(instances);
      
      // Raggruppa per livello
      const byLevel = instances.reduce((acc, instance) => {
        if (!acc[instance.level]) acc[instance.level] = [];
        acc[instance.level].push(instance);
        return acc;
      }, {} as Record<number, ExpandedPlanningInstance[]>);
      
      const levels = Object.keys(byLevel).map(Number).sort();
      const result: JSX.Element[] = [];
      
      levels.forEach(level => {
        const levelInstances = byLevel[level];
        
        levelInstances.forEach((instance, idx) => {
          const startMinutes = timeToMinutes(instance.startTime);
          const endMinutes = timeToMinutes(instance.endTime);
          const durationMinutes = endMinutes - startMinutes;
          
          // Trova le informazioni sulla colonna per questo evento
          const columnInfo = eventColumns.find(c => c.instance === instance) || { column: 0, totalColumns: 1 };
          
          // Se c'è un parent bound, calcola le coordinate relative al padre
          let relativeStart = startMinutes;
          let relativeHeight = totalCellHeight; // Usa altezza totale per proporzioni corrette
          let relativeTop = 0;
          
          if (parentBounds) {
            relativeTop = ((parentBounds.start) / minutesInDay) * totalCellHeight;
            relativeHeight = ((parentBounds.end - parentBounds.start) / minutesInDay) * totalCellHeight;
            relativeStart = startMinutes - parentBounds.start; // Posizione relativa al padre
          }
          
          // Calcola proporzioni usando altezza totale cella (140px): 8 ore = 1/3 = ~47px
          const topPosition = relativeTop + (relativeStart / (parentBounds ? (parentBounds.end - parentBounds.start) : minutesInDay)) * relativeHeight;
          const height = Math.max(8, (durationMinutes / (parentBounds ? (parentBounds.end - parentBounds.start) : minutesInDay)) * relativeHeight);
          
          // Determina se questo è un progetto padre (ha figli) - per ora tutti i progetti level 0 sono padri
          const hasChildren = level === 0 && instances.some(other => other.level > level);
          
          // Calcola left e width in base alla colonna
          const baseIndent = getLevelIndentation(level);
          const columnWidth = 100 / columnInfo.totalColumns;
          const leftPercent = columnInfo.column * columnWidth;
          
          result.push(
            <div
              key={`${instance.window.id}-${level}-${idx}`}
              onClick={() => onWindowSelect?.(instance.window)}
              className="absolute cursor-pointer"
              style={{ 
                top: `${topPosition}px`,
                height: `${height}px`,
                left: `calc(${leftPercent}% + ${baseIndent}px)`,
                width: `calc(${columnWidth}% - ${baseIndent * 2}px)`,
                zIndex: hasChildren ? level : 10 + level,
                opacity: hasChildren ? 0.4 : 1
              }}
            >
              <div 
                className={`${hoveredWindowId === instance.window.id ? 'ring-2 ring-offset-1 ring-primary' : ''} hover:opacity-80 rounded border h-full w-full ${hasChildren ? 'border-2 border-dashed' : ''} relative group`}
                style={getProjectColorStyle(getPlanningWindowColor({ project: instance.project, interestArea: instance.interestArea }), level)}
                onMouseEnter={() => setHoveredWindowId(instance.window.id)}
                onMouseLeave={() => setHoveredWindowId(null)}
              >
                {/* Checkbox - visible on hover */}
                {height >= 20 && (
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleSelection(instance.window.id);
                    }}
                    className="absolute top-0.5 left-0.5 p-0.5 rounded bg-background/90 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer z-10"
                    data-testid={`checkbox-select-planning-${instance.window.id}`}
                  >
                    <Checkbox
                      checked={selectedWindowIds.has(instance.window.id)}
                      className="h-3 w-3"
                    />
                  </div>
                )}
                
                {/* Icona area di interesse per altezza sufficiente */}
                {height >= 16 && instance.interestArea?.icon && (() => {
                  const IconComponent = getIconComponent(instance.interestArea.icon);
                  if (!IconComponent) return null;
                  return (
                    <div className="flex items-center justify-center h-full opacity-40">
                      <IconComponent className="w-3 h-3" />
                    </div>
                  );
                })()}
                {/* Edit Button - visible on hover */}
                {height >= 20 && (
                  <button
                    onClick={(e) => handleEditClick(e, instance.window)}
                    className="absolute top-0.5 right-6 p-0.5 rounded bg-primary/90 text-primary-foreground opacity-0 group-hover:opacity-100 transition-opacity hover:bg-primary"
                    data-testid={`button-edit-planning-${instance.window.id}`}
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                )}
                
                {/* Delete Button - visible on hover */}
                {height >= 20 && (
                  <button
                    onClick={(e) => handleDeleteClick(e, instance.window)}
                    className="absolute top-0.5 right-0.5 p-0.5 rounded bg-destructive/90 text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive"
                    data-testid={`button-delete-planning-${instance.window.id}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>
          );
          
          // Se questo ha figli, renderizza i figli all'interno
          if (hasChildren) {
            const children = instances.filter(other => other.level > level);
            const childElements = renderHierarchicalProjects(children, totalCellHeight, {
              start: startMinutes,
              end: endMinutes,
              level: level
            });
            result.push(...childElements);
          }
        });
      });
      
      return result;
    };

    return (
      <div className="grid grid-cols-7 gap-1">
        {['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'].map(day => (
          <div key={day} className="p-2 text-center text-sm font-medium text-muted-foreground">
            {day}
          </div>
        ))}
        
        {calendarDays.map(day => {
          const dateKey = format(day, 'yyyy-MM-dd');
          const dayInstances = instancesByDate[dateKey] || [];
          const isInCurrentMonth = day.getMonth() === currentDate.getMonth();
          const isTodayDate = isSameDay(day, new Date());
          
          // Find continuous periods that include this day  
          const dayPeriods = continuousPeriods.filter(period => 
            day >= period.startDate && day <= period.endDate
          );
          
          return (
            <div 
              key={dateKey} 
              className={`
                p-2 border border-border/50 relative
                ${!isInCurrentMonth ? 'bg-muted/30 text-muted-foreground' : 'bg-background'}
                ${isTodayDate ? 'bg-blue-50 dark:bg-blue-950/20 border-blue-300 dark:border-blue-800' : ''}
              `}
              style={{ height: `${FIXED_DAY_HEIGHT}px` }}
            >
              <div className={`text-sm font-medium mb-1 ${isTodayDate ? 'text-blue-600 dark:text-blue-400' : ''}`}>
                {format(day, 'd')}
              </div>
              
              {/* Renderizzazione ricorsiva progetti padre -> figli */}
              <div className="absolute inset-x-0" style={{ 
                top: `0px`, // Inizia dall'alto della cella per proporzioni corrette
                height: `${FIXED_DAY_HEIGHT}px` // Usa altezza totale per proporzioni corrette
              }}>
                {renderHierarchicalProjects(dayInstances, FIXED_DAY_HEIGHT)}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderWeekView = () => {
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
    const weekDays = eachDayOfInterval({ start: weekStart, end: endOfWeek(weekStart, { weekStartsOn: 1 }) });
    const hours = Array.from({ length: 24 }, (_, i) => i);
    const hourHeight = 60;
    
    // Raggruppa le istanze per data
    const instancesByDate = expandedInstances.reduce((acc, instance) => {
      const dateKey = format(instance.date, 'yyyy-MM-dd');
      if (!acc[dateKey]) acc[dateKey] = [];
      acc[dateKey].push(instance);
      return acc;
    }, {} as Record<string, ExpandedPlanningInstance[]>);

    // Funzione per convertire time string in minuti dall'inizio della giornata
    const timeToMinutes = (timeStr: string) => {
      const [hours, minutes] = timeStr.split(':').map(Number);
      return hours * 60 + minutes;
    };

    return (
      <div className="flex flex-col">
        {/* Header con grid per allineamento perfetto */}
        <div className="grid grid-cols-8 gap-1 border-b border-border">
          <div className="p-2 text-center text-sm font-medium text-muted-foreground">
            Ora
          </div>
          {['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'].map(day => (
            <div key={day} className="p-2 text-center text-sm font-medium text-muted-foreground">
              {day}
            </div>
          ))}
        </div>
        
        {/* Corpo con layout fisso che mantiene box continui */}
        <div className="flex-1 overflow-auto max-h-[600px] relative">
          <div className="grid grid-cols-8 gap-1">
            {/* Colonna orari */}
            <div className="bg-muted/30">
              {hours.map(hour => (
                <div key={hour} className="relative border-b border-border/50" style={{ height: `${hourHeight}px` }}>
                  <div className="p-2 text-xs text-muted-foreground text-right">
                    {hour.toString().padStart(2, '0')}:00
                  </div>
                  {/* Linea tratteggiata per la mezzora */}
                  <div 
                    className="absolute left-0 right-0 border-t border-dashed border-border/30"
                    style={{ top: `${hourHeight / 2}px` }}
                  />
                </div>
              ))}
            </div>
            
            {/* Colonne giorni */}
            {weekDays.map(day => {
              const dateKey = format(day, 'yyyy-MM-dd');
              const dayInstances = instancesByDate[dateKey] || [];
              const isTodayDate = isSameDay(day, new Date());
              
              return (
                <div key={dateKey} className={`relative ${isTodayDate ? 'bg-blue-50 dark:bg-blue-950/20' : 'bg-background'}`}>
                  {/* Griglia di background */}
                  {hours.map(hour => (
                    <div 
                      key={hour} 
                      className="border-b border-border/50 relative"
                      style={{ height: `${hourHeight}px` }}
                    >
                      {/* Linea tratteggiata per la mezzora */}
                      <div 
                        className="absolute left-0 right-0 border-t border-dashed border-border/30"
                        style={{ top: `${hourHeight / 2}px` }}
                      />
                    </div>
                  ))}
                  
                  {/* Eventi sovrapposti come box continui */}
                  {(() => {
                    const eventColumns = calculateEventColumns(dayInstances);
                    return dayInstances.map((instance, idx) => {
                      const startMinutes = timeToMinutes(instance.startTime);
                      const endMinutes = timeToMinutes(instance.endTime);
                      const durationMinutes = endMinutes - startMinutes;
                      
                      const topPosition = (startMinutes / 60) * hourHeight;
                      const height = Math.max(40, (durationMinutes / 60) * hourHeight);
                      
                      const columnInfo = eventColumns.find(c => c.instance === instance) || { column: 0, totalColumns: 1 };
                      const baseIndent = 2 + getLevelIndentation(instance.level);
                      const columnWidth = 100 / columnInfo.totalColumns;
                      const leftPercent = columnInfo.column * columnWidth;
                      
                      return (
                        <div
                          key={`${instance.window.id}-${idx}`}
                          onClick={() => onWindowSelect?.(instance.window)}
                          className="absolute cursor-pointer z-10"
                          style={{ 
                            top: `${topPosition}px`,
                            height: `${height}px`,
                            left: `calc(${leftPercent}% + ${baseIndent}px)`,
                            width: `calc(${columnWidth}% - ${baseIndent * 2}px)`,
                          }}
                        >
                          <div 
                            className={`hover:opacity-80 text-xs p-2 rounded border h-full overflow-hidden flex flex-col`}
                            style={getProjectColorStyle(getPlanningWindowColor({ project: instance.project, interestArea: instance.interestArea }), instance.level)}
                          >
                            {(() => {
                              const IconComponent = getIconComponent(instance.interestArea?.icon);
                              if (IconComponent) {
                                return (
                                  <div className="flex items-center gap-1">
                                    <IconComponent className="w-3 h-3 flex-shrink-0" />
                                    <div className="font-medium truncate flex-1">
                                      {instance.window.name}
                                    </div>
                                  </div>
                                );
                              }
                              return (
                                <div className="font-medium truncate">
                                  {instance.window.name}
                                </div>
                              );
                            })()}
                            <div className="text-[10px] opacity-75">
                              {instance.startTime} - {instance.endTime}
                            </div>
                            <div className="text-[9px] opacity-75 truncate">
                              {instance.project?.name || instance.interestArea?.name || 'Nessun progetto'}
                              {instance.level > 0 && <span className="ml-1">{'→'.repeat(instance.level)}</span>}
                            </div>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const renderDayView = () => {
    const hours = Array.from({ length: 24 }, (_, i) => i);
    const hourHeight = 80; // altezza in pixel più grande per la vista giornaliera
    const dayInstances = expandedInstances.filter(instance => 
      isSameDay(instance.date, currentDate)
    );
    
    // Funzione per convertire time string in minuti dall'inizio della giornata
    const timeToMinutes = (timeStr: string) => {
      const [hours, minutes] = timeStr.split(':').map(Number);
      return hours * 60 + minutes;
    };

    return (
      <div className="flex flex-col">
        <div className="border-b border-border p-4">
          <h3 className="text-lg font-medium text-center">
            {format(currentDate, 'EEEE, dd MMMM yyyy')}
          </h3>
        </div>
        
        <div className="flex-1 overflow-auto max-h-[700px] relative">
          <div className="flex">
            {/* Colonna orari */}
            <div className="w-20 border-r border-border bg-muted/30 flex-shrink-0">
              {hours.map(hour => (
                <div key={hour} className="relative border-b border-border/50" style={{ height: `${hourHeight}px` }}>
                  <div className="p-3 text-sm text-muted-foreground text-right">
                    {hour.toString().padStart(2, '0')}:00
                  </div>
                  {/* Linea tratteggiata per la mezzora */}
                  <div 
                    className="absolute left-0 right-0 border-t border-dashed border-border/30"
                    style={{ top: `${hourHeight / 2}px` }}
                  />
                </div>
              ))}
            </div>
            
            {/* Colonna eventi */}
            <div className="flex-1 relative">
              {/* Griglia di background */}
              {hours.map(hour => (
                <div 
                  key={hour} 
                  className="border-b border-border/50 relative"
                  style={{ height: `${hourHeight}px` }}
                >
                  {/* Linea tratteggiata per la mezzora */}
                  <div 
                    className="absolute left-0 right-0 border-t border-dashed border-border/30"
                    style={{ top: `${hourHeight / 2}px` }}
                  />
                </div>
              ))}
              
              {/* Eventi sovrapposti */}
              {(() => {
                const eventColumns = calculateEventColumns(dayInstances);
                return dayInstances.map((instance, idx) => {
                  const startMinutes = timeToMinutes(instance.startTime);
                  const endMinutes = timeToMinutes(instance.endTime);
                  const durationMinutes = endMinutes - startMinutes;
                  
                  const topPosition = (startMinutes / 60) * hourHeight;
                  const height = Math.max(60, (durationMinutes / 60) * hourHeight);
                  
                  const columnInfo = eventColumns.find(c => c.instance === instance) || { column: 0, totalColumns: 1 };
                  const baseIndent = 8 + getLevelIndentation(instance.level);
                  const columnWidth = 100 / columnInfo.totalColumns;
                  const leftPercent = columnInfo.column * columnWidth;
                  
                  return (
                    <div
                      key={`${instance.window.id}-${idx}`}
                      onClick={() => onWindowSelect?.(instance.window)}
                      className="absolute cursor-pointer z-10"
                      style={{ 
                        top: `${topPosition}px`,
                        height: `${height}px`,
                        left: `calc(${leftPercent}% + ${baseIndent}px)`,
                        width: `calc(${columnWidth}% - ${baseIndent * 2}px)`,
                      }}
                    >
                      <div 
                        className={`hover:opacity-80 p-3 rounded border h-full overflow-hidden flex flex-col`}
                        style={getProjectColorStyle(getPlanningWindowColor({ project: instance.project, interestArea: instance.interestArea }), instance.level)}
                      >
                        {(() => {
                          const IconComponent = getIconComponent(instance.interestArea?.icon);
                          if (IconComponent) {
                            return (
                              <div className="flex items-center gap-2 mb-1">
                                <IconComponent className="w-5 h-5 flex-shrink-0" />
                                <div className="font-medium truncate flex-1">
                                  {instance.window.name}
                                </div>
                              </div>
                            );
                          }
                          return (
                            <div className="font-medium truncate">
                              {instance.window.name}
                            </div>
                          );
                        })()}
                        <div className="text-sm opacity-75 mt-1">
                          {instance.startTime} - {instance.endTime}
                        </div>
                        <div className="text-sm opacity-75 mt-1">
                          {instance.project?.name || instance.interestArea?.name || 'Nessun progetto'}
                          {instance.level > 0 && (
                            <span className="ml-2">
                              {'→'.repeat(instance.level)}
                            </span>
                          )}
                        </div>
                        {instance.project?.description && height > 120 && (
                          <div className="text-xs opacity-60 mt-2 flex-1 overflow-hidden">
                            {instance.project.description}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Get unique planning windows for legend
  const uniqueWindows = useMemo(() => {
    if (!planningWindowsWithProject) return [];
    
    const windowMap = new Map<string, { window: PlanningWindow; project: Project | null; interestArea: InterestArea | null }>();
    planningWindowsWithProject.forEach(({ project, interestArea, ...window }) => {
      if (!windowMap.has(window.id)) {
        windowMap.set(window.id, { window, project, interestArea });
      }
    });
    
    return Array.from(windowMap.values()).sort((a, b) => 
      a.window.name.localeCompare(b.window.name)
    );
  }, [planningWindowsWithProject]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="text-center">Loading calendar...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FolderTree className="h-5 w-5" />
            Global Planning Calendar
          </div>
          
          <div className="flex items-center gap-4">
            {/* Bulk actions */}
            {selectedWindowIds.size > 0 && (
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{selectedWindowIds.size} selezionate</Badge>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleSelectAll}
                  data-testid="button-select-all"
                >
                  Seleziona tutto
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleDeselectAll}
                  data-testid="button-deselect-all"
                >
                  Deseleziona
                </Button>
                <Button 
                  variant="destructive" 
                  size="sm" 
                  onClick={handleBulkDelete}
                  data-testid="button-bulk-delete"
                >
                  <X className="h-4 w-4 mr-1" />
                  Elimina selezionate
                </Button>
              </div>
            )}
            
            {/* View buttons */}
            <div className="flex gap-1 bg-muted rounded-lg p-1">
              <Button
                variant={view === 'day' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setView('day')}
                data-testid="button-day-view"
              >
                Giorno
              </Button>
              <Button
                variant={view === 'week' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setView('week')}
                data-testid="button-week-view"
              >
                Settimana
              </Button>
              <Button
                variant={view === 'month' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setView('month')}
                data-testid="button-month-view"
              >
                Mese
              </Button>
            </div>
            
            {/* Navigation */}
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => navigate('prev')} data-testid="button-prev">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="font-medium min-w-[200px] text-center">
                {formatDateRange()}
              </span>
              <Button variant="outline" size="sm" onClick={() => navigate('next')} data-testid="button-next">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        <div className="flex gap-4">
          {/* Main Calendar */}
          <div className="flex-1">
            {view === 'month' && renderMonthView()}
            {view === 'week' && renderWeekView()}
            {view === 'day' && renderDayView()}
            
            {expandedInstances.length === 0 && (
              <div className="text-center text-muted-foreground py-8">
                Nessuna finestra di pianificazione per questo periodo
              </div>
            )}
          </div>
          
          {/* Legend Sidebar */}
          <div className="w-64 border-l border-border pl-4">
            <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Calendari
            </h4>
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {uniqueWindows.map(({ window, project, interestArea }) => (
                <div
                  key={window.id}
                  className={`p-2 rounded-lg border cursor-pointer transition-all ${
                    hoveredWindowId === window.id 
                      ? 'ring-2 ring-primary ring-offset-1 bg-muted' 
                      : 'hover:bg-muted/50'
                  }`}
                  style={{
                    borderColor: getPlanningWindowColor({ project, interestArea }),
                    backgroundColor: hoveredWindowId === window.id 
                      ? undefined 
                      : `${getPlanningWindowColor({ project, interestArea })}15`
                  }}
                  onMouseEnter={() => setHoveredWindowId(window.id)}
                  onMouseLeave={() => setHoveredWindowId(null)}
                  onClick={() => onWindowSelect?.(window)}
                  data-testid={`legend-item-${window.id}`}
                >
                  <div className="flex items-start gap-2">
                    <div 
                      className="w-4 h-4 rounded border flex-shrink-0 mt-0.5 flex items-center justify-center"
                      style={{ 
                        backgroundColor: getPlanningWindowColor({ project, interestArea }),
                        borderColor: getPlanningWindowColor({ project, interestArea })
                      }}
                    >
                      {(() => {
                        const IconComponent = getIconComponent(interestArea?.icon);
                        if (IconComponent) {
                          return <IconComponent className="w-2.5 h-2.5 text-white" />;
                        }
                        return null;
                      })()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">
                        {window.name}
                      </div>
                      {project && (
                        <div className="text-xs text-muted-foreground truncate mt-0.5">
                          {project.name}
                        </div>
                      )}
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {window.startTime} - {window.endTime}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>

    <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
      <AlertDialogContent data-testid="dialog-delete-planning">
        <AlertDialogHeader>
          <AlertDialogTitle>Eliminare la pianificazione?</AlertDialogTitle>
          <AlertDialogDescription>
            Sei sicuro di voler eliminare "{windowToDelete?.name}"? Questa azione non può essere annullata.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel data-testid="button-cancel-delete">Annulla</AlertDialogCancel>
          <AlertDialogAction
            data-testid="button-confirm-delete"
            onClick={() => windowToDelete && deleteMutation.mutate(windowToDelete.id)}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Elimina
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <AlertDialog open={showBulkDeleteDialog} onOpenChange={setShowBulkDeleteDialog}>
      <AlertDialogContent data-testid="dialog-bulk-delete-planning">
        <AlertDialogHeader>
          <AlertDialogTitle>Eliminare le pianificazioni selezionate?</AlertDialogTitle>
          <AlertDialogDescription>
            Sei sicuro di voler eliminare {selectedWindowIds.size} pianificazioni? Questa azione non può essere annullata.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel data-testid="button-cancel-bulk-delete">Annulla</AlertDialogCancel>
          <AlertDialogAction
            data-testid="button-confirm-bulk-delete"
            onClick={confirmBulkDelete}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Elimina {selectedWindowIds.size} pianificazioni
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}