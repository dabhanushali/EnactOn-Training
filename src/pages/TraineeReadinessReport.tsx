import { MainNav } from '@/components/navigation/MainNav';
import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { ChevronsUpDown, Check, TrendingUp, Star, BookOpen, FolderOpen, UserCheck, Clock, BarChart2, Percent } from "lucide-react";
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/auth-utils';
import { AccessDenied } from '@/components/common/AccessDenied';

interface ReadinessSummary {
    overall_readiness_score: number;
    average_assessment_score: number;
    average_project_score: number;
}

interface Course {
    course_id: string;
    course_name: string;
    completion_date?: string;
    enrollment_date?: string;
}

interface AssessmentDetail {
    assessment_id: string;
    course_name: string;
    assessment_title: string;
    score: number;
    passed: boolean;
    taken_at: string;
}

interface ProjectEvaluation {
    evaluator: string;
    overall_score: number;
    strengths: string;
    areas_for_improvement: string;
    evaluation_date: string;
}

interface ProjectDetail {
    project_id: string;
    project_name: string;
    status: string;
    evaluation: ProjectEvaluation[];
}

interface ReportData {
  profile: {
    user_id: string;
    first_name: string;
    last_name: string;
    email: string;
    designation: string;
    department: string;
  };
  readiness_summary: ReadinessSummary;
  completed_courses: Course[];
  pending_courses: Course[];
  assessment_details: AssessmentDetail[];
  project_details: ProjectDetail[];
}

// Type definitions
interface Trainee {
  user_id: string;
  first_name: string;
  last_name: string;
}

interface ProfileWithRole {
  id: string;
  first_name: string;
  last_name: string;
  roles?: {
    role_name: string;
  };
}

// --- Data Fetching ---
const fetchTrainees = async (): Promise<Trainee[]> => {
  const { data, error } = await supabase
    .from('profiles')
    .select(`id, first_name, last_name, roles(role_name)`);

  if (error) throw new Error(error.message);

  const trainees = (data as any[])
    .filter(profile => profile.roles?.role_name === 'Trainee')
    .map(p => ({ user_id: p.id, first_name: p.first_name, last_name: p.last_name }));
    
  return trainees;
};

const fetchReadinessReport = async (userId: string | null): Promise<ReportData | null> => {
  if (!userId) return null;
  const { data, error } = await supabase.rpc('get_trainee_readiness_data' as any, { p_user_id: userId });
  if (error) throw new Error(`Failed to fetch readiness report: ${error.message}`);
  return data as any;
};


// --- Main Component ---
const TraineeReadinessReport: React.FC = () => {
  const { profile } = useAuth();
  const [open, setOpen] = useState(false);
  const [selectedTrainee, setSelectedTrainee] = useState<Trainee | null>(null);

  // Check access permissions
  const userRole = profile?.role?.role_name;
  const hasAccess = userRole === 'Management' || userRole === 'HR' || userRole === 'Team Lead';

  if (!hasAccess) {
    return (
      <>
        <MainNav />
        <AccessDenied 
          message="Access to Trainee Readiness Reports is restricted."
          allowedRoles={['Management', 'HR', 'Team Lead']}
        />
      </>
    );
  }

  const { data: trainees, isLoading: traineesLoading, error: traineesError } = useQuery<Trainee[]>({ 
    queryKey: ['traineesForReport'], 
    queryFn: fetchTrainees 
  });

  const { data: reportData, isLoading: reportLoading, error: reportError } = useQuery<ReportData | null>({
    queryKey: ['readinessReport', selectedTrainee?.user_id], 
    queryFn: () => fetchReadinessReport(selectedTrainee?.user_id || null),
    enabled: !!selectedTrainee,
  });

  return (
    <>
    <MainNav />
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 bg-gray-50/50 min-h-screen">
      <HeaderSection 
        trainees={trainees || []}
        selectedTrainee={selectedTrainee}
        setSelectedTrainee={setSelectedTrainee}
        isLoading={traineesLoading}
        error={traineesError}
        open={open}
        setOpen={setOpen}
      />

      {selectedTrainee ? (
        reportLoading ? <p className="text-center py-12">Loading report...</p> :
        reportError ? <p className="text-center py-12 text-red-500">Error: {reportError.message}</p> :
        reportData && (
          <div className="space-y-6">
            <SummarySection summary={reportData.readiness_summary} profile={reportData.profile} />
            <PerformanceChart data={reportData.assessment_details} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <CoursesSection title="Completed Courses" courses={reportData.completed_courses} />
                <CoursesSection title="Pending Courses" courses={reportData.pending_courses} />
            </div>
            <DetailsTable title="Assessment Details" data={reportData.assessment_details} type="assessment" />
            <DetailsTable title="Project Details" data={reportData.project_details} type="project" />
          </div>
        )
      ) : (
        <div className="text-center py-20 text-gray-500"><p>Please select a trainee to view their readiness report.</p></div>
      )}
    </div>
    </>
  );
};

// --- Sub-Components ---

const HeaderSection = ({ trainees, selectedTrainee, setSelectedTrainee, isLoading, error, open, setOpen }: any) => (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b">
        <h1 className="text-3xl font-bold text-gray-800 mb-2 sm:mb-0">Trainee Readiness Report</h1>
        <TraineeSelector 
          trainees={trainees} 
          selectedTrainee={selectedTrainee} 
          setSelectedTrainee={setSelectedTrainee} 
          isLoading={isLoading}
          error={error}
          open={open}
          setOpen={setOpen}
        />
    </div>
);

const TraineeSelector = ({ trainees, selectedTrainee, setSelectedTrainee, isLoading, error, open, setOpen }: any) => (
  isLoading ? <p>Loading trainees...</p> :
  error ? <p className="text-red-500">Failed to load trainees.</p> :
  <Popover open={open} onOpenChange={setOpen}>
    <PopoverTrigger asChild>
      <Button variant="outline" role="combobox" aria-expanded={open} className="w-full sm:w-[250px] justify-between">
        {selectedTrainee ? `${selectedTrainee.first_name} ${selectedTrainee.last_name}` : "Select a trainee..."}
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </Button>
    </PopoverTrigger>
    <PopoverContent className="w-full sm:w-[250px] p-0">
      <Command>
        <CommandInput placeholder="Search trainee..." />
        <CommandEmpty>No trainee found.</CommandEmpty>
        <CommandGroup>
          {trainees?.map((trainee: Trainee) => (
            <CommandItem
              key={trainee.user_id}
              value={`${trainee.first_name} ${trainee.last_name}`}
              onSelect={() => { setSelectedTrainee(trainee); setOpen(false); }}
            >
              <Check className={cn("mr-2 h-4 w-4", selectedTrainee?.user_id === trainee.user_id ? "opacity-100" : "opacity-0")} />
              {trainee.first_name} {trainee.last_name}
            </CommandItem>
          )) || <CommandItem disabled>No trainees available</CommandItem>}
        </CommandGroup>
      </Command>
    </PopoverContent>
  </Popover>
);

const SummarySection = ({ summary, profile }: { summary: ReadinessSummary, profile: ReportData['profile'] }) => {
    const scoreColor = summary.overall_readiness_score >= 70 ? 'text-green-600' : summary.overall_readiness_score >= 40 ? 'text-yellow-600' : 'text-red-600';
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Trainee</CardTitle>
                    <UserCheck className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-xl font-bold">{profile.first_name} {profile.last_name}</div>
                    <p className="text-xs text-muted-foreground">{profile.email}</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Overall Readiness</CardTitle>
                    <Star className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className={`text-5xl font-bold ${scoreColor}`}>{summary.overall_readiness_score}%</div>
                    <p className="text-xs text-muted-foreground">Composite score of all metrics</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Assessment Score</CardTitle>
                    <BarChart2 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{summary.average_assessment_score}%</div>
                    <p className="text-xs text-muted-foreground">Average across all assessments</p>
                </CardContent>
            </Card>
        </div>
    );
};

const PerformanceChart = ({ data }: { data: AssessmentDetail[] }) => {
    const chartData = useMemo(() => 
        data.map(a => ({
            name: a.assessment_title,
            score: a.score,
            date: new Date(a.taken_at)
        })).sort((a, b) => a.date.getTime() - b.date.getTime()), 
    [data]);

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center"><TrendingUp className="mr-2 h-5 w-5"/>Performance Trend</CardTitle>
            </CardHeader>
            <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" angle={-30} textAnchor="end" height={70} tick={{ fontSize: 10 }} />
                        <YAxis domain={[0, 100]} />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="score" name="Assessment Score" stroke="#8884d8" strokeWidth={2} />
                    </LineChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
};

const CoursesSection = ({ title, courses }: { title: string, courses: Course[] }) => (
    <Card>
        <CardHeader><CardTitle className="flex items-center"><BookOpen className="mr-2 h-5 w-5"/>{title}</CardTitle></CardHeader>
        <CardContent>
            {courses.length > 0 ? (
                <ul className="space-y-2">
                    {courses.map(c => (
                        <li key={c.course_id} className="text-sm text-gray-700">{c.course_name}</li>
                    ))}
                </ul>
            ) : <p className="text-sm text-gray-500">No courses in this category.</p>}
        </CardContent>
    </Card>
);

const DetailsTable = ({ data, type, title }: { data: any[], type: 'assessment' | 'project', title: string }) => (
  <Card>
    <CardHeader><CardTitle className="flex items-center">
        {type === 'assessment' && <BookOpen className="mr-2 h-5 w-5"/>}
        {type === 'project' && <FolderOpen className="mr-2 h-5 w-5"/>}
        {title}
    </CardTitle></CardHeader>
    <CardContent>
      <Table>
        <TableHeader>
          {type === 'assessment' ? (
            <TableRow>
              <TableHead>Course</TableHead>
              <TableHead>Assessment</TableHead>
              <TableHead className="text-right">Score</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          ) : (
            <TableRow>
              <TableHead>Project</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Avg. Score</TableHead>
              <TableHead>Feedback</TableHead>
            </TableRow>
          )}
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow><TableCell colSpan={4} className="text-center">No data available.</TableCell></TableRow>
          ) : type === 'assessment' ? (
            data.map((item: AssessmentDetail) => (
              <TableRow key={item.assessment_id}>
                <TableCell>{item.course_name}</TableCell>
                <TableCell>{item.assessment_title}</TableCell>
                <TableCell className="text-right">{item.score}%</TableCell>
                <TableCell>{item.passed ? 'Passed' : 'Failed'}</TableCell>
              </TableRow>
            ))
          ) : (
            data.map((item: ProjectDetail) => (
              <TableRow key={item.project_id}>
                <TableCell>{item.project_name}</TableCell>
                <TableCell>{item.status}</TableCell>
                <TableCell className="text-right">
                  {item.evaluation?.length > 0 ? 
                    `${Math.round(item.evaluation.reduce((sum, e) => sum + e.overall_score, 0) / item.evaluation.length * 10)}%`
                    : 'N/A'}
                </TableCell>
                <TableCell className="truncate max-w-[200px]">
                  {item.evaluation?.[0]?.strengths || 'No feedback yet.'}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </CardContent>
  </Card>
);

export default TraineeReadinessReport;
