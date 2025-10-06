import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, TrendingUp, Award, AlertCircle, ChevronRight } from 'lucide-react';

interface DepartmentStats {
  department: string;
  totalEmployees: number;
  activeEmployees: number;
  coursesCompleted: number;
  averageProgress: number;
  topPerformers: number;
}

interface TeamOverviewCardProps {
  departmentStats: DepartmentStats[];
  onViewDetails?: (department: string) => void;
}

export const TeamOverviewCard = ({ departmentStats, onViewDetails }: TeamOverviewCardProps) => {
  const getPerformanceLevel = (progress: number) => {
    if (progress >= 80) return { level: 'Excellent', color: 'text-success', bgColor: 'bg-success/10', icon: Award };
    if (progress >= 60) return { level: 'Good', color: 'text-primary', bgColor: 'bg-primary/10', icon: TrendingUp };
    if (progress >= 40) return { level: 'Fair', color: 'text-warning', bgColor: 'bg-warning/10', icon: Users };
    return { level: 'Needs Attention', color: 'text-error', bgColor: 'bg-error/10', icon: AlertCircle };
  };

  return (
    <Card className="border-2">
      <CardHeader className="border-b bg-muted/30">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Team Overview
          </CardTitle>
          <Badge variant="secondary" className="text-xs">
            {departmentStats.length} Departments
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y">
          {departmentStats.map((dept) => {
            const performance = getPerformanceLevel(dept.averageProgress);
            const Icon = performance.icon;
            
            return (
              <div
                key={dept.department}
                className="p-4 hover:bg-muted/50 transition-colors cursor-pointer group"
                onClick={() => onViewDetails?.(dept.department)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 space-y-3">
                    {/* Department Name and Badge */}
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-base">{dept.department}</h3>
                      <Badge className={`${performance.bgColor} ${performance.color} border-0`}>
                        <Icon className="w-3 h-3 mr-1" />
                        {performance.level}
                      </Badge>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="flex flex-col">
                        <span className="text-xs text-muted-foreground">Team Size</span>
                        <span className="text-lg font-bold text-foreground">
                          {dept.totalEmployees}
                        </span>
                      </div>
                      
                      <div className="flex flex-col">
                        <span className="text-xs text-muted-foreground">Active</span>
                        <span className="text-lg font-bold text-primary">
                          {dept.activeEmployees}
                        </span>
                      </div>
                      
                      <div className="flex flex-col">
                        <span className="text-xs text-muted-foreground">Completed</span>
                        <span className="text-lg font-bold text-success">
                          {dept.coursesCompleted}
                        </span>
                      </div>
                      
                      <div className="flex flex-col">
                        <span className="text-xs text-muted-foreground">Top Performers</span>
                        <span className="text-lg font-bold text-warning">
                          {dept.topPerformers}
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground font-medium">Avg Progress</span>
                        <span className="font-bold text-primary">{dept.averageProgress.toFixed(1)}%</span>
                      </div>
                      <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
                        <div 
                          className={`h-full transition-all duration-500 rounded-full ${
                            dept.averageProgress >= 80 
                              ? 'bg-gradient-to-r from-success to-success/80' 
                              : dept.averageProgress >= 60 
                              ? 'bg-gradient-to-r from-primary to-primary/80'
                              : dept.averageProgress >= 40
                              ? 'bg-gradient-to-r from-warning to-warning/80'
                              : 'bg-gradient-to-r from-error to-error/80'
                          }`}
                          style={{ width: `${dept.averageProgress}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* View Details Button */}
                  <div className="ml-4">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {departmentStats.length === 0 && (
          <div className="py-12 text-center">
            <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
            <p className="text-muted-foreground font-medium">No department data available</p>
            <p className="text-sm text-muted-foreground">Team statistics will appear here once employees are added</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};