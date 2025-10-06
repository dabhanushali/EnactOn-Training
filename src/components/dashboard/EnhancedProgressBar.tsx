import { Progress } from '@/components/ui/progress';
import { Card } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface EnhancedProgressBarProps {
  value: number;
  label: string;
  showTrend?: boolean;
  trendValue?: number;
  size?: 'sm' | 'md' | 'lg';
  colorScheme?: 'default' | 'success' | 'warning' | 'error';
  showPercentage?: boolean;
  subtitle?: string;
}

export const EnhancedProgressBar = ({
  value,
  label,
  showTrend = false,
  trendValue = 0,
  size = 'md',
  colorScheme = 'default',
  showPercentage = true,
  subtitle
}: EnhancedProgressBarProps) => {
  const sizeClasses = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-3'
  };

  const colorClasses = {
    default: 'bg-primary',
    success: 'bg-success',
    warning: 'bg-warning',
    error: 'bg-destructive'
  };

  const getColorScheme = (val: number): typeof colorScheme => {
    if (val >= 80) return 'success';
    if (val >= 50) return 'warning';
    return 'error';
  };

  const displayColor = colorScheme === 'default' ? getColorScheme(value) : colorScheme;

  const getTrendIcon = () => {
    if (trendValue > 0) return <TrendingUp className="w-3 h-3 text-success" />;
    if (trendValue < 0) return <TrendingDown className="w-3 h-3 text-destructive" />;
    return <Minus className="w-3 h-3 text-muted-foreground" />;
  };

  const getTrendColor = () => {
    if (trendValue > 0) return 'text-success';
    if (trendValue < 0) return 'text-destructive';
    return 'text-muted-foreground';
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium text-foreground">{label}</span>
            {showPercentage && (
              <div className="flex items-center gap-2">
                <span className={`text-sm font-bold ${colorClasses[displayColor].replace('bg-', 'text-')}`}>
                  {value.toFixed(0)}%
                </span>
                {showTrend && (
                  <div className="flex items-center gap-1">
                    {getTrendIcon()}
                    <span className={`text-xs font-medium ${getTrendColor()}`}>
                      {Math.abs(trendValue).toFixed(1)}%
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
          {subtitle && (
            <p className="text-xs text-muted-foreground mb-2">{subtitle}</p>
          )}
        </div>
      </div>
      
      <div className="relative">
        <Progress 
          value={value} 
          className={`${sizeClasses[size]} bg-muted/30`}
        />
        <div 
          className={`absolute top-0 left-0 ${sizeClasses[size]} ${colorClasses[displayColor]} rounded-full transition-all duration-500 ease-out shadow-sm`}
          style={{ width: `${Math.min(value, 100)}%` }}
        />
      </div>
    </div>
  );
};

export const DepartmentProgressCard = ({ 
  department, 
  progress, 
  members, 
  completed 
}: { 
  department: string; 
  progress: number; 
  members: number; 
  completed: number;
}) => {
  return (
    <Card className="p-4 hover:shadow-md transition-shadow">
      <div className="space-y-3">
        <div className="flex items-start justify-between">
          <div>
            <h4 className="font-semibold text-foreground">{department}</h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              {completed} of {members} completed
            </p>
          </div>
          <div className="text-right">
            <div className={`text-2xl font-bold ${
              progress >= 80 ? 'text-success' : 
              progress >= 50 ? 'text-warning' : 
              'text-destructive'
            }`}>
              {progress.toFixed(0)}%
            </div>
          </div>
        </div>
        
        <EnhancedProgressBar
          value={progress}
          label=""
          showPercentage={false}
          size="sm"
        />
      </div>
    </Card>
  );
};
