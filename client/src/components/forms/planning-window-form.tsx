import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { insertPlanningWindowSchema, PlanningWindow } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Calendar, Clock, Copy } from "lucide-react";
import { addDays, differenceInDays } from "date-fns";

const formSchema = insertPlanningWindowSchema.extend({
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().min(1, "End time is required"),
  workingHoursPerDay: z.string().optional(),
  recurrenceType: z.enum(["none", "daily", "weekly", "monthly", "yearly"]).default("none"),
  daysOfWeek: z.array(z.number().min(1).max(7)).optional(),
  recurrenceInterval: z.string().optional(),
  recurrenceEnd: z.string().optional(),
  propagateEnabled: z.boolean().default(false),
  propagateUntil: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface PlanningWindowFormProps {
  projectId: string;
  planningWindow?: PlanningWindow;
  onSuccess?: () => void;
}

export default function PlanningWindowForm({ projectId, planningWindow, onSuccess }: PlanningWindowFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      projectId,
      name: planningWindow?.name || "",
      startDate: planningWindow?.startDate ? new Date(planningWindow.startDate).toISOString().split('T')[0] : "",
      endDate: planningWindow?.endDate ? new Date(planningWindow.endDate).toISOString().split('T')[0] : "",
      startTime: planningWindow?.startTime || "09:00",
      endTime: planningWindow?.endTime || "17:00",
      workingHoursPerDay: (planningWindow?.workingHoursPerDay || 8).toString(),
      isActive: planningWindow?.isActive ?? true,
      recurrenceType: planningWindow?.recurrenceType || "none",
      daysOfWeek: planningWindow?.daysOfWeek || [],
      recurrenceInterval: (planningWindow?.recurrenceInterval || 1).toString(),
      recurrenceEnd: planningWindow?.recurrenceEnd ? new Date(planningWindow.recurrenceEnd).toISOString().split('T')[0] : "",
      notes: planningWindow?.notes || "",
      propagateEnabled: false,
      propagateUntil: "",
    },
  });

  const savePlanningWindowMutation = useMutation({
    mutationFn: async (data: FormData) => {
      if (planningWindow) {
        // Edit existing planning window - no propagation for edit
        const windowData = {
          ...data,
          projectId,
          startDate: new Date(data.startDate),
          endDate: new Date(data.endDate),
          startTime: data.startTime,
          endTime: data.endTime,
          workingHoursPerDay: data.workingHoursPerDay ? parseInt(data.workingHoursPerDay) : 8,
          recurrenceType: data.recurrenceType,
          daysOfWeek: data.daysOfWeek || [],
          recurrenceInterval: data.recurrenceInterval ? parseInt(data.recurrenceInterval) : 1,
          recurrenceEnd: data.recurrenceEnd ? new Date(data.recurrenceEnd) : null,
        };
        const res = await apiRequest("PUT", `/api/planning-windows/${planningWindow.id}`, windowData);
        return res.json();
      } else {
        // Create new planning window(s)
        if (data.propagateEnabled && data.propagateUntil) {
          // Create multiple planning windows (one per day)
          const startDate = new Date(data.startDate);
          const endDate = new Date(data.propagateUntil);
          const daysDiff = differenceInDays(endDate, startDate);
          
          if (daysDiff < 0) {
            throw new Error("La data 'fino a' deve essere successiva alla data di inizio");
          }
          
          const createPromises = [];
          for (let i = 0; i <= daysDiff; i++) {
            const currentDay = addDays(startDate, i);
            const windowData = {
              ...data,
              projectId,
              name: data.name,
              startDate: currentDay,
              endDate: currentDay, // Same day for propagated windows
              startTime: data.startTime,
              endTime: data.endTime,
              workingHoursPerDay: data.workingHoursPerDay ? parseInt(data.workingHoursPerDay) : 8,
              recurrenceType: "none", // No recurrence for propagated windows
              daysOfWeek: [],
              recurrenceInterval: 1,
              recurrenceEnd: null,
            };
            createPromises.push(
              apiRequest("POST", "/api/planning-windows", windowData).then(res => res.json())
            );
          }
          
          return Promise.all(createPromises);
        } else {
          // Create single planning window
          const windowData = {
            ...data,
            projectId,
            startDate: new Date(data.startDate),
            endDate: new Date(data.endDate),
            startTime: data.startTime,
            endTime: data.endTime,
            workingHoursPerDay: data.workingHoursPerDay ? parseInt(data.workingHoursPerDay) : 8,
            recurrenceType: data.recurrenceType,
            daysOfWeek: data.daysOfWeek || [],
            recurrenceInterval: data.recurrenceInterval ? parseInt(data.recurrenceInterval) : 1,
            recurrenceEnd: data.recurrenceEnd ? new Date(data.recurrenceEnd) : null,
          };
          const res = await apiRequest("POST", "/api/planning-windows", windowData);
          return res.json();
        }
      }
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["/api/planning-windows"] });
      const count = Array.isArray(result) ? result.length : 1;
      toast({ 
        title: planningWindow 
          ? "Finestra di pianificazione aggiornata con successo" 
          : count > 1 
            ? `${count} finestre di pianificazione create con successo`
            : "Finestra di pianificazione creata con successo"
      });
      onSuccess?.();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save planning window",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormData) => {
    // Validate date range
    const startDate = new Date(data.startDate);
    const endDate = new Date(data.endDate);
    
    if (endDate <= startDate) {
      form.setError("endDate", {
        type: "manual",
        message: "End date must be after start date",
      });
      return;
    }

    savePlanningWindowMutation.mutate(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6" data-testid="form-planning-window">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Window Name</FormLabel>
              <FormControl>
                <Input 
                  placeholder="e.g., Sprint 1, Phase A, Q1 Development"
                  {...field}
                  data-testid="input-planning-window-name"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Date Range */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Date & Time Range
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Date</FormLabel>
                    <FormControl>
                      <Input 
                        type="date"
                        {...field}
                        data-testid="input-planning-window-start-date"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Date</FormLabel>
                    <FormControl>
                      <Input 
                        type="date"
                        {...field}
                        data-testid="input-planning-window-end-date"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Propagation - only for new windows */}
            {!planningWindow && (
              <div className="space-y-3 pt-2 border-t">
                <FormField
                  control={form.control}
                  name="propagateEnabled"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base flex items-center gap-2">
                          <Copy className="h-4 w-4" />
                          Propaga su più giorni
                        </FormLabel>
                        <div className="text-[0.8rem] text-muted-foreground">
                          Crea una finestra di pianificazione per ogni giorno nel periodo
                        </div>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="switch-propagate-enabled"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                {form.watch("propagateEnabled") && (
                  <FormField
                    control={form.control}
                    name="propagateUntil"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Propaga fino a</FormLabel>
                        <FormControl>
                          <Input 
                            type="date"
                            {...field}
                            data-testid="input-propagate-until"
                          />
                        </FormControl>
                        <div className="text-[0.8rem] text-muted-foreground">
                          Verrà creata una finestra separata per ogni giorno tra la data di inizio e questa data
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Time</FormLabel>
                    <FormControl>
                      <Input 
                        type="time"
                        {...field}
                        data-testid="input-planning-window-start-time"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="endTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Time</FormLabel>
                    <FormControl>
                      <Input 
                        type="time"
                        {...field}
                        data-testid="input-planning-window-end-time"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Recurrence Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Recurrence & Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="recurrenceType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Repeat</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-planning-window-recurrence">
                          <SelectValue placeholder="Select recurrence" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">No repeat</SelectItem>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="yearly">Yearly</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="workingHoursPerDay"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Working Hours per Day</FormLabel>
                    <FormControl>
                      <Input 
                        type="number"
                        min="1"
                        max="12"
                        placeholder="8"
                        {...field}
                        data-testid="input-planning-window-hours"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Days of Week - only show for weekly recurrence */}
            {form.watch("recurrenceType") === "weekly" && (
              <FormField
                control={form.control}
                name="daysOfWeek"
                render={({ field }) => {
                  const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
                  const selectedDays = field.value || [];
                  
                  return (
                    <FormItem>
                      <FormLabel>Repeat on</FormLabel>
                      <FormControl>
                        <div className="flex flex-wrap gap-2">
                          {dayNames.map((day, index) => {
                            const dayNumber = index + 1;
                            const isSelected = selectedDays.includes(dayNumber);
                            
                            return (
                              <Button
                                key={day}
                                type="button"
                                variant={isSelected ? "default" : "outline"}
                                size="sm"
                                className="h-8 w-12"
                                onClick={() => {
                                  const newDays = isSelected
                                    ? selectedDays.filter(d => d !== dayNumber)
                                    : [...selectedDays, dayNumber].sort();
                                  field.onChange(newDays);
                                }}
                                data-testid={`button-day-${dayNumber}`}
                              >
                                {day}
                              </Button>
                            );
                          })}
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />
            )}

            {/* Recurrence Interval */}
            {form.watch("recurrenceType") !== "none" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="recurrenceInterval"
                  render={({ field }) => {
                    const currentRecurrence = form.watch("recurrenceType");
                    const intervalLabel = currentRecurrence === "daily" ? "days" :
                                        currentRecurrence === "weekly" ? "weeks" :
                                        currentRecurrence === "monthly" ? "months" : "years";
                    
                    return (
                      <FormItem>
                        <FormLabel>Every</FormLabel>
                        <FormControl>
                          <div className="flex items-center gap-2">
                            <Input 
                              type="number"
                              min="1"
                              max="52"
                              placeholder="1"
                              className="w-20"
                              {...field}
                              data-testid="input-planning-window-interval"
                            />
                            <span className="text-sm text-muted-foreground">{intervalLabel}</span>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />

                <FormField
                  control={form.control}
                  name="recurrenceEnd"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End Date (Optional)</FormLabel>
                      <FormControl>
                        <Input 
                          type="date"
                          {...field}
                          data-testid="input-planning-window-recurrence-end"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}
          </CardContent>
        </Card>

        <FormField
          control={form.control}
          name="isActive"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Active Window</FormLabel>
                <div className="text-[0.8rem] text-muted-foreground">
                  Active windows are used for task scheduling
                </div>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  data-testid="switch-planning-window-active"
                />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes (Optional)</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Any additional notes about this planning window..."
                  className="resize-none"
                  {...field}
                  value={field.value || ""}
                  data-testid="textarea-planning-window-notes"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end space-x-2">
          <Button 
            type="submit" 
            disabled={savePlanningWindowMutation.isPending}
            data-testid="button-save-planning-window"
          >
            {savePlanningWindowMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {planningWindow ? "Update Window" : "Create Window"}
          </Button>
        </div>
      </form>
    </Form>
  );
}