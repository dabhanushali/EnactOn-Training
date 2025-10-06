// DEPRECATED: This component has been replaced by EnhancedDepartmentPerformance.tsx
// The new component provides better analytics, interactive charts, and improved UX
// Please use EnhancedDepartmentPerformance instead for new implementations

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, TrendingUp, Award, Target, CheckCircle, AlertTriangle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';

interface DepartmentStats {
  department: string;
  totalEmployees: number;
  activeEmployees: number;
  avgProgress: number;
  completedCourses: number;
  totalCourses: number;
  topPerformer?: string;
}

interface DepartmentPerformanceCardProps {
  departments: DepartmentStats[];
}

/**
 * @deprecated This component has been replaced by EnhancedDepartmentPerformance
 * Use EnhancedDepartmentPerformance for better analytics and user experience
 */
export const DepartmentPerformanceCard = ({ departments }: DepartmentPerformanceCardProps) => {
  const getPerformanceColor = (progress: number) => {
    if (progress >= 80) return 'text-success';
    if (progress >= 60) return 'text-primary';
    if (progress >= 40) return 'text-warning';
    return 'text-destructive';
  };

  const getPerformanceBg = (progress: number) => {
    if (progress >= 80) return 'bg-success/10 border-success/20';
    if (progress >= 60) return 'bg-primary/10 border-primary/20';
    if (progress >= 40) return 'bg-warning/10 border-warning/20';
    return 'bg-destructive/10 border-destructive/20';
  };

  const getPerformanceLabel = (progress: number) => {
    if (progress >= 80) return 'Excellent';
    if (progress >= 60) return 'Good';
    if (progress >= 40) return 'Fair';
    return 'Needs Attention';
  };

  return (
    <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-xl">
            <div className="p-2 rounded-lg bg-primary/10">
              <Users className="h-5 w-5 text-primary" />
            </div>
            Department Performance Overview
          </CardTitle>
          <div className="bg-amber-100 text-amber-800 px-3 py-1 rounded-full text-sm font-medium">
            ⚠️ Legacy Component
          </div>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-900 mb-1">Enhanced Version Available</h4>
              <p className="text-sm text-blue-700">
                This component has been replaced with <code className="bg-blue-100 px-1 rounded">EnhancedDepartmentPerformance</code> which provides:
              </p>
              <ul className="text-sm text-blue-700 mt-2 ml-4 list-disc">
                <li>Interactive charts and analytics</li>
                <li>Advanced filtering and sorting</li>
                <li>Real-time performance tracking</li>
                <li>Export capabilities</li>
                <li>Better visual design and UX</li>
              </ul>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {departments.length === 0 ? (
          <div className="text-center py-8">
            <Users className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
            <p className="text-muted-foreground">No department data available</p>
          </div>
        ) : (
          <div className="space-y-4">
            {departments.map((dept) => {
              const completionRate = dept.totalCourses > 0 
                ? (dept.completedCourses / dept.totalCourses) * 100 
                : 0;
              
              return (
                <Card 
                  key={dept.department} 
                  className={`group hover:shadow-md transition-all duration-300 ${getPerformanceBg(dept.avgProgress)}`}
                >
                  <CardContent className="p-5">
                    {/* Header Row */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-foreground">
                            {dept.department}
                          </h3>
                          <Badge 
                            variant="outline" 
                            className={`${getPerformanceBg(dept.avgProgress)} ${getPerformanceColor(dept.avgProgress)} border font-medium`}
                          >
                            {getPerformanceLabel(dept.avgProgress)}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1.5">
                            <Users className="w-4 h-4" />
                            <span>{dept.totalEmployees} employees</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <CheckCircle className="w-4 h-4 text-success" />
                            <span>{dept.activeEmployees} active</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className={`text-4xl font-bold ${getPerformanceColor(dept.avgProgress)}`}>
                          {dept.avgProgress.toFixed(0)}%
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Avg Progress</p>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-3 mb-4">
                      <div className="relative">
                        <Progress value={dept.avgProgress} className="h-3" />
                        <div 
                          className="absolute top-0 left-0 h-3 rounded-full transition-all duration-500 ease-out shadow-sm"
                          style={{ 
                            width: `${Math.min(dept.avgProgress, 100)}%`,
                            background: dept.avgProgress >= 80 
                              ? 'linear-gradient(90deg, hsl(var(--success)) 0%, hsl(var(--success)) 100%)'
                              : dept.avgProgress >= 60
                              ? 'linear-gradient(90deg, hsl(var(--primary)) 0%, hsl(var(--primary)) 100%)'
                              : dept.avgProgress >= 40
                              ? 'linear-gradient(90deg, hsl(var(--warning)) 0%, hsl(var(--warning)) 100%)'
                              : 'linear-gradient(90deg, hsl(var(--destructive)) 0%, hsl(var(--destructive)) 100%)'
                          }}
                        />
                      </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="text-center p-3 rounded-lg bg-background/60 border border-border/50">
                        <div className="flex items-center justify-center gap-1.5 mb-1">
                          <Target className="w-4 h-4 text-primary" />
                          <span className="text-xs font-medium text-muted-foreground">Courses</span>
                        </div>
                        <div className="text-lg font-bold text-foreground">
                          {dept.completedCourses}/{dept.totalCourses}
                        </div>
                      </div>

                      <div className="text-center p-3 rounded-lg bg-background/60 border border-border/50">
                        <div className="flex items-center justify-center gap-1.5 mb-1">
                          <TrendingUp className="w-4 h-4 text-success" />
                          <span className="text-xs font-medium text-muted-foreground">Rate</span>
                        </div>
                        <div className="text-lg font-bold text-foreground">
                          {completionRate.toFixed(0)}%
                        </div>
                      </div>

                      <div className="text-center p-3 rounded-lg bg-background/60 border border-border/50">
                        <div className="flex items-center justify-center gap-1.5 mb-1">
                          <Award className="w-4 h-4 text-warning" />
                          <span className="text-xs font-medium text-muted-foreground">Top</span>
                        </div>
                        <div className="text-sm font-bold text-foreground truncate" title={dept.topPerformer}>
                          {dept.topPerformer || 'N/A'}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};