import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  FolderOpen, Plus, Target, CheckCircle, 
  Clock, AlertCircle, TrendingUp 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { CreateProjectDialog } from './CreateProjectDialog';

interface ProjectQuickActionsProps {
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  pendingEvaluations?: number;
  userRole: string;
  onProjectCreated: () => void;
}

export const ProjectQuickActions = ({ 
  totalProjects, 
  activeProjects, 
  completedProjects,
  pendingEvaluations = 0,
  userRole, 
  onProjectCreated
}: ProjectQuickActionsProps) => {
  const navigate = useNavigate();
  const canManage = ['Management', 'HR', 'Team Lead'].includes(userRole);
  
  const completionRate = totalProjects > 0 
    ? (completedProjects / totalProjects) * 100 
    : 0;

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
      {/* Total Projects */}
      <Card className="border-0 shadow-md bg-gradient-to-br from-indigo-50 to-white hover:shadow-lg transition-all">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-xl bg-indigo-500/10">
              <FolderOpen className="w-6 h-6 text-indigo-600" />
            </div>
            <Badge variant="secondary" className="text-xs">
              Total
            </Badge>
          </div>
          <div className="space-y-1">
            <p className="text-3xl font-bold text-foreground">{totalProjects}</p>
            <p className="text-sm text-muted-foreground">All Projects</p>
          </div>
        </CardContent>
      </Card>

      {/* Active Projects */}
      <Card className="border-0 shadow-md bg-gradient-to-br from-amber-50 to-white hover:shadow-lg transition-all cursor-pointer"
            onClick={() => navigate('/projects')}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-xl bg-warning/10">
              <Clock className="w-6 h-6 text-warning" />
            </div>
            <Badge className="bg-warning/20 text-warning border-warning/30 text-xs">
              Active
            </Badge>
          </div>
          <div className="space-y-1">
            <p className="text-3xl font-bold text-foreground">{activeProjects}</p>
            <p className="text-sm text-muted-foreground">In Progress</p>
          </div>
        </CardContent>
      </Card>

      {/* Completed Projects */}
      <Card className="border-0 shadow-md bg-gradient-to-br from-emerald-50 to-white hover:shadow-lg transition-all">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-xl bg-success/10">
              <CheckCircle className="w-6 h-6 text-success" />
            </div>
            <Badge className="bg-success/20 text-success border-success/30 text-xs">
              Done
            </Badge>
          </div>
          <div className="space-y-1">
            <p className="text-3xl font-bold text-foreground">{completedProjects}</p>
            <p className="text-sm text-muted-foreground">Completed</p>
          </div>
        </CardContent>
      </Card>

      {/* Pending Evaluations or Quick Action */}
      {canManage ? (
        pendingEvaluations > 0 ? (
          <Card className="border-0 shadow-md bg-gradient-to-br from-red-50 to-white hover:shadow-lg transition-all cursor-pointer"
                onClick={() => navigate('/projects')}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 rounded-xl bg-destructive/10">
                  <AlertCircle className="w-6 h-6 text-destructive" />
                </div>
                <Badge className="bg-destructive/20 text-destructive border-destructive/30 text-xs">
                  Urgent
                </Badge>
              </div>
              <div className="space-y-1">
                <p className="text-3xl font-bold text-foreground">{pendingEvaluations}</p>
                <p className="text-sm text-muted-foreground">Pending Reviews</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-0 shadow-md bg-gradient-to-br from-violet-50 to-white hover:shadow-lg transition-all">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 rounded-xl bg-primary/10">
                  <Plus className="w-6 h-6 text-primary" />
                </div>
                <Badge className="bg-primary/20 text-primary border-primary/30 text-xs">
                  Action
                </Badge>
              </div>
              <div className="space-y-2">
                <CreateProjectDialog onProjectCreated={onProjectCreated}>
                  <Button 
                    className="w-full bg-primary hover:bg-primary/90" 
                    size="lg"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create Project
                  </Button>
                </CreateProjectDialog>
              </div>
            </CardContent>
          </Card>
        )
      ) : (
        <Card className="border-0 shadow-md bg-gradient-to-br from-cyan-50 to-white hover:shadow-lg transition-all">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-xl bg-primary/10">
                <TrendingUp className="w-6 h-6 text-primary" />
              </div>
              <Badge variant="secondary" className="text-xs">
                Rate
              </Badge>
            </div>
            <div className="space-y-1">
              <p className="text-3xl font-bold text-primary">{completionRate.toFixed(0)}%</p>
              <p className="text-sm text-muted-foreground">Success Rate</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
