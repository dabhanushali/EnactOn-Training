import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Users, TrendingUp, Award, Clock, CheckCircle, AlertCircle } from 'lucide-react';

interface CourseAnalyticsProps {
  totalEnrolled: number;
  activeStudents: number;
  completedStudents: number;
  averageProgress: number;
  averageScore: number;
  completionRate: number;
  averageTimeToComplete?: number;
}

export const CourseAnalytics = ({
  totalEnrolled,
  activeStudents,
  completedStudents,
  averageProgress,
  averageScore,
  completionRate,
  averageTimeToComplete
}: CourseAnalyticsProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Course Analytics
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 rounded-lg bg-primary/5 border border-primary/20">
            <Users className="h-6 w-6 text-primary mx-auto mb-2" />
            <div className="text-2xl font-bold text-foreground">{totalEnrolled}</div>
            <div className="text-xs text-muted-foreground">Total Enrolled</div>
          </div>

          <div className="text-center p-4 rounded-lg bg-blue-500/5 border border-blue-500/20">
            <Clock className="h-6 w-6 text-blue-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-foreground">{activeStudents}</div>
            <div className="text-xs text-muted-foreground">Active</div>
          </div>

          <div className="text-center p-4 rounded-lg bg-success/5 border border-success/20">
            <CheckCircle className="h-6 w-6 text-success mx-auto mb-2" />
            <div className="text-2xl font-bold text-success">{completedStudents}</div>
            <div className="text-xs text-muted-foreground">Completed</div>
          </div>

          <div className="text-center p-4 rounded-lg bg-warning/5 border border-warning/20">
            <Award className="h-6 w-6 text-warning mx-auto mb-2" />
            <div className="text-2xl font-bold text-foreground">{averageScore.toFixed(0)}%</div>
            <div className="text-xs text-muted-foreground">Avg. Score</div>
          </div>
        </div>

        {/* Progress Metrics */}
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Completion Rate</span>
              <span className="text-sm font-bold">{completionRate.toFixed(0)}%</span>
            </div>
            <Progress value={completionRate} className="h-2" />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Average Progress</span>
              <span className="text-sm font-bold">{averageProgress.toFixed(0)}%</span>
            </div>
            <Progress value={averageProgress} className="h-2" />
          </div>
        </div>

        {/* Additional Stats */}
        {averageTimeToComplete && (
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Avg. Time to Complete</span>
            </div>
            <Badge variant="secondary">{averageTimeToComplete} days</Badge>
          </div>
        )}

        {/* Performance Indicator */}
        <div className="p-4 rounded-lg border">
          <div className="flex items-start gap-3">
            {completionRate >= 70 ? (
              <div className="p-2 rounded-full bg-success/10">
                <CheckCircle className="h-5 w-5 text-success" />
              </div>
            ) : (
              <div className="p-2 rounded-full bg-warning/10">
                <AlertCircle className="h-5 w-5 text-warning" />
              </div>
            )}
            <div>
              <p className="font-medium text-sm">
                {completionRate >= 70 ? 'High Performance Course' : 'Needs Attention'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {completionRate >= 70
                  ? 'This course is performing well with strong completion rates.'
                  : 'Consider reviewing course content or providing additional support to students.'}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
