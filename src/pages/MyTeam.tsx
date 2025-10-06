import { MainNav } from '@/components/navigation/MainNav';
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/auth-utils';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Users, Search, Trophy, TrendingUp, BookOpen, 
  User, Mail, Phone, Award, Target, Clock
} from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';

interface TeamMember {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  employee_code: string | null;
  designation: string | null;
  department: string | null;
  current_status: string;
  phone: string | null;
  courseProgress: number;
  completedCourses: number;
  totalCourses: number;
  pendingProjects: number;
}

export default function MyTeam() {
  const { profile } = useAuth();
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [filteredMembers, setFilteredMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const isTeamLead = profile?.role?.role_name === 'Team Lead';

  const fetchTeamMembers = useCallback(async () => {
    if (!profile?.id) return;
    
    setLoading(true);
    try {
      // Get team members
      const { data: members, error: membersError } = await supabase
        .rpc('get_profiles_with_emails');

      if (membersError) throw membersError;

      // Filter to only show direct reports
      const myTeam = (members || []).filter((m: any) => m.manager_id === profile.id);

      // Fetch course progress for each team member
      const enrichedMembers = await Promise.all(
        myTeam.map(async (member: any) => {
          // Get enrollments
          const { data: enrollments } = await supabase
            .from('course_enrollments')
            .select('status, course_id')
            .eq('employee_id', member.id);

          const totalCourses = enrollments?.length || 0;
          const completedCourses = enrollments?.filter(e => e.status === 'completed').length || 0;
          const courseProgress = totalCourses > 0 ? (completedCourses / totalCourses) * 100 : 0;

          // Get pending projects
          const { data: assignments } = await supabase
            .from('project_assignments')
            .select('status')
            .eq('assignee_id', member.id)
            .in('status', ['Not_Started', 'In_Progress']);

          return {
            id: member.id,
            first_name: member.first_name,
            last_name: member.last_name,
            email: member.email,
            employee_code: member.employee_code,
            designation: member.designation,
            department: member.department,
            current_status: member.current_status,
            phone: member.phone,
            courseProgress,
            completedCourses,
            totalCourses,
            pendingProjects: assignments?.length || 0
          };
        })
      );

      setTeamMembers(enrichedMembers);
      setFilteredMembers(enrichedMembers);
    } catch (error) {
      console.error('Error fetching team members:', error);
      toast.error('Failed to load team members');
    } finally {
      setLoading(false);
    }
  }, [profile?.id]);

  useEffect(() => {
    if (isTeamLead) {
      fetchTeamMembers();
    }
  }, [isTeamLead, fetchTeamMembers]);

  useEffect(() => {
    let filtered = teamMembers;
    if (searchTerm) {
      filtered = filtered.filter(member => 
        `${member.first_name} ${member.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member.employee_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member.designation?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    setFilteredMembers(filtered);
  }, [teamMembers, searchTerm]);

  const avgProgress = teamMembers.length > 0
    ? teamMembers.reduce((sum, m) => sum + m.courseProgress, 0) / teamMembers.length
    : 0;

  const totalPending = teamMembers.reduce((sum, m) => sum + m.pendingProjects, 0);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return 'bg-success/10 text-success border-success/20';
      case 'On Leave': return 'bg-warning/10 text-warning border-warning/20';
      case 'Inactive': return 'bg-destructive/10 text-destructive border-destructive/20';
      default: return 'bg-muted/10 text-muted-foreground border-muted/20';
    }
  };

  if (!isTeamLead) {
    return (
      <div className="min-h-screen bg-background">
        <MainNav />
        <div className="container mx-auto py-8">
          <Card className="max-w-md mx-auto">
            <CardContent className="p-8 text-center">
              <Users className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">Access Denied</h3>
              <p className="text-muted-foreground">This page is only accessible to Team Leads.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <MainNav />
      
      <div className="container mx-auto py-8 px-4">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="space-y-1">
              <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
                <div className="p-3 rounded-xl bg-primary/10 text-primary">
                  <Users className="w-8 h-8" />
                </div>
                My Team
              </h1>
              <p className="text-muted-foreground text-lg">
                Manage and monitor your team's progress
              </p>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card className="border-0 shadow-md bg-white/70 backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Team Members</p>
                    <p className="text-3xl font-bold text-foreground">{teamMembers.length}</p>
                  </div>
                  <div className="p-3 rounded-full bg-blue-500/10">
                    <Users className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-md bg-white/70 backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Avg Progress</p>
                    <p className="text-3xl font-bold text-primary">{avgProgress.toFixed(0)}%</p>
                  </div>
                  <div className="p-3 rounded-full bg-primary/10">
                    <TrendingUp className="w-6 h-6 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-md bg-white/70 backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Pending Tasks</p>
                    <p className="text-3xl font-bold text-warning">{totalPending}</p>
                  </div>
                  <div className="p-3 rounded-full bg-warning/10">
                    <Clock className="w-6 h-6 text-warning" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-md bg-white/70 backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Top Performer</p>
                    <p className="text-xl font-bold text-success">
                      {teamMembers.length > 0 
                        ? `${Math.max(...teamMembers.map(m => m.courseProgress)).toFixed(0)}%`
                        : '0%'}
                    </p>
                  </div>
                  <div className="p-3 rounded-full bg-success/10">
                    <Trophy className="w-6 h-6 text-success" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Search */}
        <Card className="mb-8 border-0 shadow-md bg-white/70 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Search className="w-5 h-5" />
              Search Team Members
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search by name, code, or designation..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-white/50"
              />
            </div>
          </CardContent>
        </Card>

        {/* Team Members Grid */}
        <Card className="border-0 shadow-md bg-white/70 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-xl font-semibold">
              Team Directory ({filteredMembers.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="bg-muted rounded-lg h-64"></div>
                  </div>
                ))}
              </div>
            ) : filteredMembers.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium mb-2">No team members found</h3>
                <p className="text-muted-foreground">
                  {searchTerm ? 'Try adjusting your search criteria.' : 'You don\'t have any team members yet.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredMembers.map((member) => (
                  <Card key={member.id} className="group hover:shadow-xl transition-all duration-300 border-0 bg-white/90">
                    <CardContent className="p-6">
                      {/* Header */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-white font-bold text-lg shadow-md">
                            {(member.first_name?.[0] || '') + (member.last_name?.[0] || '')}
                          </div>
                          <div>
                            <Link to={`/employees/${member.id}`}>
                              <h3 className="font-semibold text-lg text-foreground hover:text-primary transition-colors">
                                {member.first_name} {member.last_name}
                              </h3>
                            </Link>
                            <p className="text-sm text-muted-foreground">
                              {member.employee_code || 'No Code'}
                            </p>
                          </div>
                        </div>
                        <Badge className={`${getStatusColor(member.current_status)} font-medium`}>
                          {member.current_status}
                        </Badge>
                      </div>

                      {/* Details */}
                      <div className="space-y-3 mb-4">
                        <div className="flex items-center text-sm">
                          <User className="w-4 h-4 mr-2 text-muted-foreground" />
                          <span className="text-muted-foreground">{member.designation || 'N/A'}</span>
                        </div>
                        <div className="flex items-center text-sm">
                          <Mail className="w-4 h-4 mr-2 text-muted-foreground" />
                          <span className="text-muted-foreground truncate">{member.email || 'N/A'}</span>
                        </div>
                        {member.phone && (
                          <div className="flex items-center text-sm">
                            <Phone className="w-4 h-4 mr-2 text-muted-foreground" />
                            <span className="text-muted-foreground">{member.phone}</span>
                          </div>
                        )}
                      </div>

                      {/* Progress Section */}
                      <div className="space-y-3 pt-3 border-t border-border/50">
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium flex items-center gap-1.5">
                              <BookOpen className="w-4 h-4 text-primary" />
                              Course Progress
                            </span>
                            <span className="text-sm font-bold text-primary">
                              {member.courseProgress.toFixed(0)}%
                            </span>
                          </div>
                          <Progress value={member.courseProgress} className="h-2" />
                          <p className="text-xs text-muted-foreground mt-1">
                            {member.completedCourses} of {member.totalCourses} courses completed
                          </p>
                        </div>

                        {member.pendingProjects > 0 && (
                          <div className="flex items-center justify-between p-2 bg-warning/10 rounded-md">
                            <span className="text-xs font-medium text-warning flex items-center gap-1.5">
                              <Target className="w-3.5 h-3.5" />
                              Pending Projects
                            </span>
                            <Badge variant="outline" className="text-xs bg-warning/20 border-warning/40 text-warning">
                              {member.pendingProjects}
                            </Badge>
                          </div>
                        )}
                      </div>

                      {/* Action */}
                      <Link to={`/employees/${member.id}`}>
                        <Button variant="outline" className="w-full mt-4 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                          View Details
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
