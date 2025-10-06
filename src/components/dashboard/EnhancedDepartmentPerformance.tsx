import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Users, 
  TrendingUp, 
  Award, 
  Target, 
  CheckCircle, 
  Clock,
  BarChart3,
  Filter,
  Download,
  RefreshCw,
  ChevronUp,
  ChevronDown,
  Star,
  AlertTriangle,
  Calendar
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';

interface DepartmentMetrics {
  department: string;
  totalEmployees: number;
  activeEmployees: number;
  completedCourses: number;
  totalCourses: number;
  avgProgress: number;
  avgRating: number;
  topPerformer?: {
    name: string;
    progress: number;
  };
  monthlyProgress: number[];
  coursesInProgress: number;
  overdueCourses: number;
  certificationsEarned: number;
  skillsAcquired: string[];
  performanceTrend: 'up' | 'down' | 'stable';
  riskEmployees: number;
}

interface EnhancedDepartmentPerformanceProps {
  departments: DepartmentMetrics[];
  loading?: boolean;
  onRefresh?: () => void;
  onExport?: () => void;
}

export const EnhancedDepartmentPerformance = ({ 
  departments, 
  loading = false,
  onRefresh,
  onExport
}: EnhancedDepartmentPerformanceProps) => {
  const [selectedTimeRange, setSelectedTimeRange] = useState('30');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [sortBy, setSortBy] = useState<'progress' | 'completion' | 'employees'>('progress');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

  const getPerformanceColor = (progress: number) => {
    if (progress >= 85) return 'text-emerald-600';
    if (progress >= 70) return 'text-blue-600';
    if (progress >= 50) return 'text-amber-600';
    return 'text-red-600';
  };

  const getPerformanceBg = (progress: number) => {
    if (progress >= 85) return 'bg-emerald-50 border-emerald-200';
    if (progress >= 70) return 'bg-blue-50 border-blue-200';
    if (progress >= 50) return 'bg-amber-50 border-amber-200';
    return 'bg-red-50 border-red-200';
  };

  const getPerformanceGradient = (progress: number) => {
    if (progress >= 85) return 'from-emerald-500 to-green-600';
    if (progress >= 70) return 'from-blue-500 to-indigo-600';
    if (progress >= 50) return 'from-amber-500 to-orange-600';
    return 'from-red-500 to-rose-600';
  };

  const getPerformanceLabel = (progress: number) => {
    if (progress >= 85) return 'Exceptional';
    if (progress >= 70) return 'Strong';
    if (progress >= 50) return 'Developing';
    return 'Needs Focus';
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return <ChevronUp className="w-4 h-4 text-green-500" />;
      case 'down':
        return <ChevronDown className="w-4 h-4 text-red-500" />;
      default:
        return <div className="w-4 h-4 border-2 border-gray-400 rounded-full" />;
    }
  };

  const filteredDepartments = departments
    .filter(dept => selectedDepartment === 'all' || dept.department === selectedDepartment)
    .sort((a, b) => {
      const multiplier = sortOrder === 'asc' ? 1 : -1;
      switch (sortBy) {
        case 'progress':
          return (a.avgProgress - b.avgProgress) * multiplier;
        case 'completion':
          return ((a.completedCourses / a.totalCourses) - (b.completedCourses / b.totalCourses)) * multiplier;
        case 'employees':
          return (a.totalEmployees - b.totalEmployees) * multiplier;
        default:
          return 0;
      }
    });

  const overallStats = departments.reduce((acc, dept) => {
    acc.totalEmployees += dept.totalEmployees;
    acc.totalCompletedCourses += dept.completedCourses;
    acc.totalCourses += dept.totalCourses;
    acc.avgProgress += dept.avgProgress * dept.totalEmployees;
    acc.totalRiskEmployees += dept.riskEmployees;
    return acc;
  }, { 
    totalEmployees: 0, 
    totalCompletedCourses: 0, 
    totalCourses: 0, 
    avgProgress: 0,
    totalRiskEmployees: 0
  });

  if (departments.length > 0) {
    overallStats.avgProgress = overallStats.avgProgress / overallStats.totalEmployees;
  }

  const overallCompletionRate = overallStats.totalCourses > 0 
    ? (overallStats.totalCompletedCourses / overallStats.totalCourses) * 100 
    : 0;

  if (loading) {
    return (
      <Card className="border-0 shadow-xl bg-gradient-to-br from-white to-gray-50">
        <CardContent className="p-8">
          <div className="flex items-center justify-center">
            <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
            <span className="ml-3 text-lg font-medium text-gray-600">Loading performance data...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <Card className="border-0 shadow-lg bg-gradient-to-r from-blue-50 to-indigo-50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-3 text-2xl font-bold">
              <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
                <BarChart3 className="h-6 w-6" />
              </div>
              Department Performance Analytics
            </CardTitle>
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" onClick={onRefresh} disabled={loading}>
                <RefreshCw className={cn("w-4 h-4 mr-2", loading && "animate-spin")} />
                Refresh
              </Button>
              <Button variant="outline" size="sm" onClick={onExport}>
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-500" />
              <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="All Departments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments.map(dept => (
                    <SelectItem key={dept.department} value={dept.department}>
                      {dept.department}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-500" />
              <Select value={selectedTimeRange} onValueChange={setSelectedTimeRange}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Last 7 days</SelectItem>
                  <SelectItem value="30">Last 30 days</SelectItem>
                  <SelectItem value="90">Last 3 months</SelectItem>
                  <SelectItem value="365">Last year</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Sort by:</span>
              <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="progress">Progress</SelectItem>
                  <SelectItem value="completion">Completion</SelectItem>
                  <SelectItem value="employees">Team Size</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              >
                {sortOrder === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Overall Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-blue-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600 mb-1">Total Employees</p>
                <p className="text-3xl font-bold text-blue-900">{overallStats.totalEmployees.toLocaleString()}</p>
              </div>
              <Users className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-green-50 to-green-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600 mb-1">Avg Progress</p>
                <p className="text-3xl font-bold text-green-900">{overallStats.avgProgress.toFixed(1)}%</p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-50 to-purple-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600 mb-1">Completion Rate</p>
                <p className="text-3xl font-bold text-purple-900">{overallCompletionRate.toFixed(1)}%</p>
              </div>
              <CheckCircle className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-red-50 to-red-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-600 mb-1">At Risk</p>
                <p className="text-3xl font-bold text-red-900">{overallStats.totalRiskEmployees}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Department Cards */}
      {filteredDepartments.length === 0 ? (
        <Card className="border-0 shadow-lg">
          <CardContent className="p-12 text-center">
            <BarChart3 className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <h3 className="text-xl font-semibold text-gray-600 mb-2">No Data Available</h3>
            <p className="text-gray-500">No department performance data found for the selected criteria.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {filteredDepartments.map((dept) => {
            const completionRate = dept.totalCourses > 0 
              ? (dept.completedCourses / dept.totalCourses) * 100 
              : 0;
            
            return (
              <Card 
                key={dept.department} 
                className={cn(
                  "group hover:shadow-2xl transition-all duration-500 border-0 overflow-hidden",
                  getPerformanceBg(dept.avgProgress)
                )}
              >
                <CardContent className="p-0">
                  <div className="relative">
                    {/* Background Gradient */}
                    <div className={cn(
                      "absolute inset-0 bg-gradient-to-r opacity-5",
                      getPerformanceGradient(dept.avgProgress)
                    )} />
                    
                    <div className="relative p-6">
                      {/* Header Row */}
                      <div className="flex items-start justify-between mb-6">
                        <div className="flex-1">
                          <div className="flex items-center gap-4 mb-3">
                            <h3 className="text-2xl font-bold text-gray-900">
                              {dept.department}
                            </h3>
                            <Badge 
                              className={cn(
                                "font-semibold text-white border-0 shadow-md",
                                `bg-gradient-to-r ${getPerformanceGradient(dept.avgProgress)}`
                              )}
                            >
                              {getPerformanceLabel(dept.avgProgress)}
                            </Badge>
                            {getTrendIcon(dept.performanceTrend)}
                          </div>
                          
                          <div className="flex items-center gap-6 text-sm text-gray-600">
                            <div className="flex items-center gap-2">
                              <Users className="w-4 h-4" />
                              <span className="font-medium">{dept.totalEmployees} total</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <CheckCircle className="w-4 h-4 text-green-500" />
                              <span className="font-medium">{dept.activeEmployees} active</span>
                            </div>
                            {dept.riskEmployees > 0 && (
                              <div className="flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4 text-red-500" />
                                <span className="font-medium text-red-600">{dept.riskEmployees} at risk</span>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <div className={cn("text-5xl font-bold mb-1", getPerformanceColor(dept.avgProgress))}>
                            {dept.avgProgress.toFixed(0)}%
                          </div>
                          <p className="text-sm text-gray-500">Average Progress</p>
                          {dept.avgRating && (
                            <div className="flex items-center gap-1 mt-2 justify-end">
                              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                              <span className="text-sm font-medium">{dept.avgRating.toFixed(1)}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="relative mb-6">
                        <Progress value={dept.avgProgress} className="h-4 bg-white/60" />
                        <div 
                          className={cn(
                            "absolute top-0 left-0 h-4 rounded-full transition-all duration-1000 ease-out",
                            `bg-gradient-to-r ${getPerformanceGradient(dept.avgProgress)} shadow-lg`
                          )}
                          style={{ width: `${Math.min(dept.avgProgress, 100)}%` }}
                        />
                      </div>

                      {/* Metrics Grid */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 text-center border border-white/20">
                          <div className="flex items-center justify-center gap-2 mb-2">
                            <Target className="w-5 h-5 text-blue-500" />
                            <span className="text-sm font-medium text-gray-600">Courses</span>
                          </div>
                          <div className="text-2xl font-bold text-gray-900">
                            {dept.completedCourses}/{dept.totalCourses}
                          </div>
                          <div className="text-xs text-gray-500">
                            {completionRate.toFixed(0)}% complete
                          </div>
                        </div>

                        <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 text-center border border-white/20">
                          <div className="flex items-center justify-center gap-2 mb-2">
                            <Clock className="w-5 h-5 text-amber-500" />
                            <span className="text-sm font-medium text-gray-600">In Progress</span>
                          </div>
                          <div className="text-2xl font-bold text-gray-900">
                            {dept.coursesInProgress}
                          </div>
                          <div className="text-xs text-gray-500">ongoing</div>
                        </div>

                        <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 text-center border border-white/20">
                          <div className="flex items-center justify-center gap-2 mb-2">
                            <Award className="w-5 h-5 text-purple-500" />
                            <span className="text-sm font-medium text-gray-600">Certificates</span>
                          </div>
                          <div className="text-2xl font-bold text-gray-900">
                            {dept.certificationsEarned}
                          </div>
                          <div className="text-xs text-gray-500">earned</div>
                        </div>

                        <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 text-center border border-white/20">
                          <div className="flex items-center justify-center gap-2 mb-2">
                            <Star className="w-5 h-5 text-green-500" />
                            <span className="text-sm font-medium text-gray-600">Top Performer</span>
                          </div>
                          <div className="text-sm font-bold text-gray-900 truncate" title={dept.topPerformer?.name}>
                            {dept.topPerformer?.name || 'N/A'}
                          </div>
                          <div className="text-xs text-gray-500">
                            {dept.topPerformer?.progress.toFixed(0)}% progress
                          </div>
                        </div>
                      </div>

                      {/* Skills Section */}
                      {dept.skillsAcquired.length > 0 && (
                        <div className="bg-white/40 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                          <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                            <Award className="w-4 h-4" />
                            Top Skills Being Developed
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {dept.skillsAcquired.slice(0, 6).map((skill, index) => (
                              <Badge 
                                key={index} 
                                variant="secondary" 
                                className="bg-white/80 text-gray-700 border-white/40 text-xs"
                              >
                                {skill}
                              </Badge>
                            ))}
                            {dept.skillsAcquired.length > 6 && (
                              <Badge variant="secondary" className="bg-gray-100 text-gray-600 text-xs">
                                +{dept.skillsAcquired.length - 6} more
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};