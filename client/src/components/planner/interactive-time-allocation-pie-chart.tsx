import { useState, useEffect } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Sector } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Plus, Trash2, RotateCcw, Bot } from "lucide-react";
import { cn } from "@/lib/utils";
import { TimeAllocationAIAssistant } from "@/components/time-allocation-ai-assistant";

export interface TimeAllocation {
  id: string;
  name: string;
  percentage: number;
  color: string;
}

interface Area {
  id: string;
  name: string;
  description?: string;
}

interface InteractiveTimeAllocationPieChartProps {
  initialAllocations?: TimeAllocation[];
  onAllocationsChange?: (allocations: TimeAllocation[]) => void;
  className?: string;
  editable?: boolean;
  availableAreas?: Area[];
}

const DEFAULT_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#f59e0b", // amber
  "#10b981", // emerald
  "#06b6d4", // cyan
];

const DEFAULT_ALLOCATIONS: TimeAllocation[] = [
  { id: "1", name: "Work", percentage: 40, color: DEFAULT_COLORS[0] },
  { id: "2", name: "Study", percentage: 30, color: DEFAULT_COLORS[1] },
  { id: "3", name: "Fitness", percentage: 15, color: DEFAULT_COLORS[2] },
  { id: "4", name: "Personal", percentage: 15, color: DEFAULT_COLORS[3] },
];

export function InteractiveTimeAllocationPieChart({
  initialAllocations = DEFAULT_ALLOCATIONS,
  onAllocationsChange,
  className,
  editable = true,
  availableAreas = [],
}: InteractiveTimeAllocationPieChartProps) {
  const [allocations, setAllocations] = useState<TimeAllocation[]>(initialAllocations);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [showAIAssistant, setShowAIAssistant] = useState(false);

  useEffect(() => {
    setAllocations(initialAllocations);
  }, [initialAllocations]);

  const totalPercentage = allocations.reduce((sum, item) => sum + item.percentage, 0);
  const isValid = Math.abs(totalPercentage - 100) < 0.01;

  const handlePercentageChange = (id: string, newPercentage: number) => {
    // Clamp the new percentage
    newPercentage = Math.max(0, Math.min(100, newPercentage));
    
    // Find the current allocation and calculate delta
    const currentAllocation = allocations.find(item => item.id === id);
    if (!currentAllocation) return;
    
    const delta = newPercentage - currentAllocation.percentage;
    if (Math.abs(delta) < 0.01) return; // No change
    
    // Get other allocations (excluding the one being changed)
    const others = allocations.filter(item => item.id !== id);
    
    // If there are no others, just update without redistribution
    if (others.length === 0) {
      const updatedAllocations = allocations.map(item =>
        item.id === id ? { ...item, percentage: newPercentage } : item
      );
      setAllocations(updatedAllocations);
      onAllocationsChange?.(updatedAllocations);
      return;
    }
    
    // Calculate total percentage of others
    const othersTotal = others.reduce((sum, item) => sum + item.percentage, 0);
    
    let updatedAllocations: TimeAllocation[];
    
    if (othersTotal === 0) {
      // All others are at 0%, distribute the remainder (100 - newPercentage) equally
      const remainder = 100 - newPercentage;
      const perOther = remainder / others.length;
      
      updatedAllocations = allocations.map(item => {
        if (item.id === id) {
          return { ...item, percentage: newPercentage };
        } else {
          return { ...item, percentage: Math.max(0, perOther) };
        }
      });
    } else {
      // Redistribute the delta proportionally among other allocations
      updatedAllocations = allocations.map(item => {
        if (item.id === id) {
          return { ...item, percentage: newPercentage };
        } else {
          // Proportional redistribution based on current percentage
          const proportion = item.percentage / othersTotal;
          const adjustment = -delta * proportion;
          const newValue = Math.max(0, item.percentage + adjustment);
          return { ...item, percentage: newValue };
        }
      });
      
      // Renormalize to ensure total is exactly 100% (only adjust non-edited items)
      const currentTotal = updatedAllocations.reduce((sum, item) => sum + item.percentage, 0);
      if (Math.abs(currentTotal - 100) > 0.01) {
        const nonEditedItems = updatedAllocations.filter(item => item.id !== id && item.percentage > 0);
        const nonEditedTotal = nonEditedItems.reduce((sum, item) => sum + item.percentage, 0);
        
        if (nonEditedTotal > 0) {
          const targetTotal = 100 - newPercentage;
          const scaleFactor = targetTotal / nonEditedTotal;
          
          updatedAllocations = updatedAllocations.map(item => {
            if (item.id === id || item.percentage === 0) return item;
            return { ...item, percentage: item.percentage * scaleFactor };
          });
        }
      }
    }
    
    setAllocations(updatedAllocations);
    onAllocationsChange?.(updatedAllocations);
  };

  const handleNameChange = (id: string, newName: string) => {
    const updatedAllocations = allocations.map(item =>
      item.id === id ? { ...item, name: newName } : item
    );
    setAllocations(updatedAllocations);
    onAllocationsChange?.(updatedAllocations);
  };

  const addAllocation = () => {
    const newAllocation: TimeAllocation = {
      id: Date.now().toString(),
      name: `Area ${allocations.length + 1}`,
      percentage: 0,
      color: DEFAULT_COLORS[allocations.length % DEFAULT_COLORS.length],
    };
    const updatedAllocations = [...allocations, newAllocation];
    setAllocations(updatedAllocations);
    onAllocationsChange?.(updatedAllocations);
  };

  const removeAllocation = (id: string) => {
    const updatedAllocations = allocations.filter(item => item.id !== id);
    setAllocations(updatedAllocations);
    onAllocationsChange?.(updatedAllocations);
  };

  const resetAllocations = () => {
    setAllocations(DEFAULT_ALLOCATIONS);
    onAllocationsChange?.(DEFAULT_ALLOCATIONS);
  };

  const normalizePercentages = () => {
    if (totalPercentage === 0) return;
    
    const normalized = allocations.map(item => ({
      ...item,
      percentage: (item.percentage / totalPercentage) * 100,
    }));
    setAllocations(normalized);
    onAllocationsChange?.(normalized);
  };

  const renderActiveShape = (props: any) => {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;

    return (
      <g>
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={innerRadius}
          outerRadius={outerRadius + 10}
          startAngle={startAngle}
          endAngle={endAngle}
          fill={fill}
        />
      </g>
    );
  };

  const handleAIAllocations = (aiAllocations: TimeAllocation[]) => {
    setAllocations(aiAllocations);
    onAllocationsChange?.(aiAllocations);
  };

  return (
    <Card className={cn("w-full", className)} data-testid="card-time-allocation-chart">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle data-testid="text-chart-title">Time Allocation</CardTitle>
            <CardDescription data-testid="text-chart-description">
              Distribute your time across different areas
            </CardDescription>
          </div>
          {editable && (
            <div className="flex gap-2">
              {availableAreas.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAIAssistant(true)}
                  data-testid="button-ai-time-assistant"
                >
                  <Bot className="h-4 w-4 mr-2" />
                  AI Assistant
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={resetAllocations}
                data-testid="button-reset-allocations"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid md:grid-cols-2 gap-6">
          {/* Pie Chart */}
          <div className="flex flex-col items-center justify-center" data-testid="container-pie-chart">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={allocations}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  dataKey="percentage"
                  activeIndex={activeIndex ?? undefined}
                  activeShape={renderActiveShape}
                  onMouseEnter={(_, index) => setActiveIndex(index)}
                  onMouseLeave={() => setActiveIndex(null)}
                  label={({ name, percentage }) => `${name} ${percentage.toFixed(0)}%`}
                  labelLine={false}
                >
                  {allocations.map((entry, index) => (
                    <Cell key={`cell-${entry.id}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="text-center mt-4">
              <p className={cn(
                "text-2xl font-bold",
                isValid ? "text-green-600" : "text-red-600"
              )} data-testid="text-total-percentage">
                {totalPercentage.toFixed(1)}%
              </p>
              <p className="text-sm text-muted-foreground" data-testid="text-total-label">
                {isValid ? "Valid allocation" : "Must total 100%"}
              </p>
              {!isValid && totalPercentage > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={normalizePercentages}
                  className="mt-2"
                  data-testid="button-normalize"
                >
                  Normalize to 100%
                </Button>
              )}
            </div>
          </div>

          {/* Controls */}
          <div className="space-y-4" data-testid="container-controls">
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
              {allocations.map((item) => (
                <div key={item.id} className="space-y-2 p-3 border rounded-lg" data-testid={`allocation-item-${item.id}`}>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-4 h-4 rounded-full flex-shrink-0"
                      style={{ backgroundColor: item.color }}
                      data-testid={`color-indicator-${item.id}`}
                    />
                    {editable ? (
                      <Input
                        value={item.name}
                        onChange={(e) => handleNameChange(item.id, e.target.value)}
                        className="flex-1 h-8"
                        data-testid={`input-name-${item.id}`}
                      />
                    ) : (
                      <span className="flex-1 font-medium" data-testid={`text-name-${item.id}`}>{item.name}</span>
                    )}
                    {editable && allocations.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeAllocation(item.id)}
                        className="h-8 w-8 p-0"
                        data-testid={`button-remove-${item.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    {editable ? (
                      <>
                        <Slider
                          value={[item.percentage]}
                          onValueChange={([value]) => handlePercentageChange(item.id, value)}
                          max={100}
                          step={1}
                          className="flex-1"
                          data-testid={`slider-percentage-${item.id}`}
                        />
                        <Input
                          type="number"
                          value={item.percentage}
                          onChange={(e) => handlePercentageChange(item.id, parseFloat(e.target.value) || 0)}
                          className="w-16 h-8 text-center"
                          min={0}
                          max={100}
                          step={1}
                          data-testid={`input-percentage-${item.id}`}
                        />
                        <span className="text-sm text-muted-foreground w-4">%</span>
                      </>
                    ) : (
                      <div className="flex-1 flex items-center justify-between">
                        <div className="flex-1 bg-muted rounded-full h-2">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${item.percentage}%`,
                              backgroundColor: item.color,
                            }}
                          />
                        </div>
                        <span className="ml-3 font-medium" data-testid={`text-percentage-${item.id}`}>
                          {item.percentage}%
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {editable && (
              <Button
                variant="outline"
                size="sm"
                onClick={addAllocation}
                className="w-full"
                data-testid="button-add-allocation"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Area
              </Button>
            )}
          </div>
        </div>
      </CardContent>

      {/* AI Assistant Dialog */}
      {availableAreas.length > 0 && (
        <TimeAllocationAIAssistant
          open={showAIAssistant}
          onOpenChange={setShowAIAssistant}
          areas={availableAreas}
          onAcceptAllocations={handleAIAllocations}
        />
      )}
    </Card>
  );
}
