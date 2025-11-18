import { MainNav } from '@/components/navigation/MainNav';
import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { 
  ChevronsUpDown, Check, TrendingUp, Star, BookOpen, FolderOpen, 
  UserCheck, Clock, BarChart2, Percent, Award, Target, Brain,
  GraduationCap, CheckCircle, AlertCircle, User
} from "lucide-react";
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/auth-utils';
import { AccessDenied } from '@/components/common/AccessDenied';
import { UserRoleOptions } from '@/lib/enums';

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

interface InternProfile {
    user_id: string;
    first_name: string;
    last_name: string;
    email: string;
    designation: string;
    department: string;
}

interface ReadinessData {
    profile: InternProfile;
    readiness_summary: ReadinessSummary;
    completed_courses: Course[];
    pending_courses: Course[];
    assessment_details: AssessmentDetail[];
    project_details: ProjectDetail[];
}

interface Employee {
    id: string;
    first_name: string;
    last_name: string;
    department: string;
    designation: string;
    role: {
        role_name: string;
    } | null;
}

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function InternReadinessReport() {
    const { profile } = useAuth();
    const [selectedInternId, setSelectedInternId] = useState<string>('');
    const [open, setOpen] = useState(false);
    const [selectedDepartment, setSelectedDepartment] = useState<string>('All Departments');
    const [selectedRole, setSelectedRole] = useState<string>('All Roles');

    const canViewReports = ['Management', 'Human Resources', 'Team Lead'].includes(profile?.role?.role_name || '');

    // Fetch all employees for selection
    const { data: employees = [], isLoading: employeesLoading } = useQuery({
        queryKey: ['employees', profile?.department], // Re-run if department changes for Team Lead
        queryFn: async () => {
            if (!canViewReports) return [];

            let query = supabase
                .from('profiles')
                .select('id, first_name, last_name, department, designation, role:roles(role_name)');

            if (profile?.role?.role_name === 'Team Lead') {
                query = query.eq('manager_id', profile.id);
            }

            const { data, error } = await query.order('first_name');
            
            if (error) throw error;
            return data as Employee[];
        },
        enabled: canViewReports,
    });

    const departments = useMemo(() => 
        [...new Set(employees.map(e => e.department).filter(Boolean))].sort(), 
        [employees]
    );

    const filteredEmployees = useMemo(() => {
        return employees.filter(emp => 
            (selectedDepartment && selectedDepartment !== 'All Departments' ? emp.department === selectedDepartment : true) &&
            (selectedRole && selectedRole !== 'All Roles' ? emp.role?.role_name === selectedRole : true)
        );
    }, [employees, selectedDepartment, selectedRole]);

    const hasActiveFilters = useMemo(() => {
        return selectedDepartment !== 'All Departments' || selectedRole !== 'All Roles';
    }, [selectedDepartment, selectedRole]);

    const handleClearFilters = () => {
        setSelectedDepartment('All Departments');
        setSelectedRole('All Roles');
        setSelectedInternId('');
    };

    // Fetch readiness data for selected intern
    const { data: readinessData, isLoading: readinessLoading, error } = useQuery({
        queryKey: ['intern_readiness', selectedInternId],
        queryFn: async () => {
            if (!selectedInternId) return null;
            const { data, error } = await supabase.rpc('get_trainee_readiness_data', {
                p_user_id: selectedInternId
            });
            if (error) throw error;
            return data as unknown as ReadinessData;
        },
        enabled: !!selectedInternId && canViewReports,
    });

    // Prepare chart data
    const skillsData = useMemo(() => {
        if (!readinessData) return [];
        return [
            { name: 'Overall Readiness', score: readinessData.readiness_summary.overall_readiness_score },
            { name: 'Assessment Average', score: readinessData.readiness_summary.average_assessment_score },
            { name: 'Project Average', score: readinessData.readiness_summary.average_project_score * 10 }, // Convert to percentage
        ];
    }, [readinessData]);

    const courseCompletionData = useMemo(() => {
        if (!readinessData) return [];
        return [
            { name: 'Completed', value: readinessData.completed_courses.length, color: '#10b981' },
            { name: 'Pending', value: readinessData.pending_courses.length, color: '#f59e0b' },
        ];
    }, [readinessData]);

    const assessmentTrendData = useMemo(() => {
        if (!readinessData) return [];
        return readinessData.assessment_details
            .sort((a, b) => new Date(a.taken_at).getTime() - new Date(b.taken_at).getTime())
            .map((assessment, index) => ({
                name: `Assessment ${index + 1}`,
                score: assessment.score,
                date: new Date(assessment.taken_at).toLocaleDateString(),
            }));
    }, [readinessData]);

    const getReadinessLevel = (score: number) => {
        if (score >= 80) return { label: 'Excellent', color: 'bg-green-500/10 text-green-700 border-green-200', icon: Award };
        if (score >= 60) return { label: 'Good', color: 'bg-blue-500/10 text-blue-700 border-blue-200', icon: CheckCircle };
        if (score >= 40) return { label: 'Fair', color: 'bg-yellow-500/10 text-yellow-700 border-yellow-200', icon: Clock };
        return { label: 'Needs Improvement', color: 'bg-red-500/10 text-red-700 border-red-200', icon: AlertCircle };
    };

    if (!canViewReports) {
        return <AccessDenied />;
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-purple-50">
            <MainNav />
            
            <div className="container mx-auto py-8 px-4">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center justify-between mb-6">
                        <div className="space-y-1">
                            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
                                <div className="p-3 rounded-xl bg-primary/10 text-primary">
                                    <Brain className="w-8 h-8" />
                                </div>
                                Intern Readiness Report
                            </h1>
                            <p className="text-muted-foreground text-lg">
                                Comprehensive assessment of employee training progress and readiness
                            </p>
                        </div>
                    </div>

                    {/* Intern Selector */}
                    <Card className="border-0 shadow-md bg-white/70 backdrop-blur-sm">
                        <CardHeader>
                            <CardTitle className="text-lg font-semibold flex items-center gap-2">
                                <User className="w-5 h-5" />
                                Select Intern
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                {/* Department Filter */}
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" className="w-full justify-between">
                                            {selectedDepartment}
                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-full p-0">
                                        <Command>
                                            <CommandInput placeholder="Search department..." />
                                            <CommandEmpty>No department found.</CommandEmpty>
                                            <CommandGroup>
                                                <CommandItem 
                                                    value="All Departments"
                                                    onSelect={() => setSelectedDepartment('All Departments')}
                                                >
                                                    <Check
                                                        className={cn(
                                                            "mr-2 h-4 w-4",
                                                            selectedDepartment === 'All Departments' ? "opacity-100" : "opacity-0"
                                                        )}
                                                    />
                                                    All Departments
                                                </CommandItem>
                                                {departments.map((dept) => (
                                                    <CommandItem
                                                        key={dept}
                                                        value={dept}
                                                        onSelect={(currentValue) => {
                                                            setSelectedDepartment(currentValue);
                                                        }}
                                                    >
                                                        <Check
                                                            className={cn(
                                                                "mr-2 h-4 w-4",
                                                                selectedDepartment === dept ? "opacity-100" : "opacity-0"
                                                            )}
                                                        />
                                                        {dept}
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup>
                                        </Command>
                                    </PopoverContent>
                                </Popover>

                                {/* Role Filter */}
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" className="w-full justify-between">
                                            {selectedRole}
                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-full p-0">
                                        <Command>
                                            <CommandInput placeholder="Search role..." />
                                            <CommandEmpty>No role found.</CommandEmpty>
                                            <CommandGroup>
                                                <CommandItem 
                                                    value="All Roles"
                                                    onSelect={() => setSelectedRole('All Roles')}
                                                >
                                                    <Check
                                                        className={cn(
                                                            "mr-2 h-4 w-4",
                                                            selectedRole === 'All Roles' ? "opacity-100" : "opacity-0"
                                                        )}
                                                    />
                                                    All Roles
                                                </CommandItem>
                                                {UserRoleOptions.map((role) => (
                                                    <CommandItem
                                                        key={role}
                                                        value={role}
                                                        onSelect={(currentValue) => {
                                                            setSelectedRole(currentValue);
                                                        }}
                                                    >
                                                        <Check
                                                            className={cn(
                                                                "mr-2 h-4 w-4",
                                                                selectedRole === role ? "opacity-100" : "opacity-0"
                                                            )}
                                                        />
                                                        {role}
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup>
                                        </Command>
                                    </PopoverContent>
                                </Popover>

                                {/* Clear Filters Button */}
                                {hasActiveFilters && (
                                    <Button 
                                        variant="outline" 
                                        onClick={handleClearFilters}
                                        className="w-full"
                                    >
                                        Clear Filters
                                    </Button>
                                )}
                            </div>

                            <Popover open={open} onOpenChange={setOpen}>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        role="combobox"
                                        aria-expanded={open}
                                        className="w-full justify-between bg-white/50"
                                    >
                                        {selectedInternId
                                            ? filteredEmployees.find((emp) => emp.id === selectedInternId)?.first_name + ' ' +
                                              filteredEmployees.find((emp) => emp.id === selectedInternId)?.last_name
                                            : "Select intern..."}
                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-full p-0">
                                    <Command
                                        filter={(value, search) => {
                                            const employee = filteredEmployees.find((emp) => emp.id === value);
                                            if (!employee) return 0;

                                            const searchableContent = 
                                                `${employee.first_name} ${employee.last_name} ${employee.designation} ${employee.department}`.toLowerCase();
                                            
                                            return searchableContent.includes(search.toLowerCase()) ? 1 : 0;
                                        }}>
                                        <CommandInput placeholder="Search trainee..." />
                                        <CommandEmpty>No trainee found.</CommandEmpty>
                                        <CommandGroup>
                                            {filteredEmployees.map((employee) => (
                                                <CommandItem
                                                    key={employee.id}
                                                    value={employee.id}
                                                    onSelect={(currentValue) => {
                                                        setSelectedInternId(currentValue === selectedInternId ? "" : currentValue);
                                                        setOpen(false);
                                                    }}
                                                >
                                                    <Check
                                                        className={cn(
                                                            "mr-2 h-4 w-4",
                                                            selectedInternId === employee.id ? "opacity-100" : "opacity-0"
                                                        )}
                                                    />
                                                    <div>
                                                        <div className="font-medium">
                                                            {employee.first_name} {employee.last_name}
                                                        </div>
                                                        <div className="text-sm text-muted-foreground">
                                                            {employee.designation} • {employee.department}
                                                        </div>
                                                    </div>
                                                </CommandItem>
                                            ))}
                                        </CommandGroup>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                        </CardContent>
                    </Card>
                </div>

                {/* Main Content */}
                {readinessLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[...Array(6)].map((_, i) => (
                            <Card key={i} className="h-48 animate-pulse bg-muted/50" />
                        ))}
                    </div>
                ) : !selectedInternId ? (
                    <Card className="border-0 shadow-md bg-white/70 backdrop-blur-sm">
                        <CardContent className="py-12 text-center">
                            <GraduationCap className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                            <h3 className="text-lg font-medium mb-2">Select an Intern</h3>
                            <p className="text-muted-foreground">Choose an intern from the dropdown above to view their readiness report.</p>
                        </CardContent>
                    </Card>
                ) : error ? (
                    <Card className="border-0 shadow-md bg-white/70 backdrop-blur-sm">
                        <CardContent className="py-12 text-center">
                            <AlertCircle className="w-16 h-16 mx-auto mb-4 text-destructive" />
                            <h3 className="text-lg font-medium mb-2 text-destructive">Error Loading Data</h3>
                            <p className="text-muted-foreground">Failed to load readiness data. Please try again.</p>
                        </CardContent>
                    </Card>
                ) : readinessData ? (
                    <div className="space-y-8">
                        {/* Profile Summary */}
                        <Card className="border-0 shadow-md bg-white/70 backdrop-blur-sm">
                            <CardHeader>
                                <CardTitle className="text-xl font-semibold flex items-center gap-2">
                                    <User className="w-5 h-5" />
                                    Intern Profile
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                    <div className="text-center">
                                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-white font-bold text-xl mx-auto mb-3">
                                            {readinessData.profile.first_name[0]}{readinessData.profile.last_name[0]}
                                        </div>
                                        <h3 className="font-semibold text-lg">
                                            {readinessData.profile.first_name} {readinessData.profile.last_name}
                                        </h3>
                                        <p className="text-sm text-muted-foreground">{readinessData.profile.email}</p>
                                    </div>
                                    
                                    <div className="space-y-2">
                                        <h4 className="font-medium text-muted-foreground">Position</h4>
                                        <p className="font-semibold">{readinessData.profile.designation}</p>
                                    </div>
                                    
                                    <div className="space-y-2">
                                        <h4 className="font-medium text-muted-foreground">Department</h4>
                                        <p className="font-semibold">{readinessData.profile.department}</p>
                                    </div>

                                    <div className="space-y-2">
                                        <h4 className="font-medium text-muted-foreground">Readiness Level</h4>
                                        {(() => {
                                            const level = getReadinessLevel(readinessData.readiness_summary.overall_readiness_score);
                                            const LevelIcon = level.icon;
                                            return (
                                                <Badge className={`${level.color} font-medium flex items-center gap-1 w-fit`}>
                                                    <LevelIcon className="w-3 h-3" />
                                                    {level.label}
                                                </Badge>
                                            );
                                        })()}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Key Metrics */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <Card className="border-0 shadow-md bg-white/70 backdrop-blur-sm">
                                <CardContent className="p-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-medium text-muted-foreground mb-1">Overall Readiness</p>
                                            <p className="text-3xl font-bold text-foreground">
                                                {readinessData.readiness_summary.overall_readiness_score.toFixed(1)}%
                                            </p>
                                        </div>
                                        <div className="p-3 rounded-full bg-purple-500/10">
                                            <Target className="w-8 h-8 text-purple-600" />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="border-0 shadow-md bg-white/70 backdrop-blur-sm">
                                <CardContent className="p-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-medium text-muted-foreground mb-1">Assessment Avg</p>
                                            <p className="text-3xl font-bold text-blue-600">
                                                {readinessData.readiness_summary.average_assessment_score.toFixed(1)}%
                                            </p>
                                        </div>
                                        <div className="p-3 rounded-full bg-blue-500/10">
                                            <BookOpen className="w-8 h-8 text-blue-600" />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="border-0 shadow-md bg-white/70 backdrop-blur-sm">
                                <CardContent className="p-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-medium text-muted-foreground mb-1">Project Avg</p>
                                            <p className="text-3xl font-bold text-green-600">
                                                {(readinessData.readiness_summary.average_project_score * 10).toFixed(1)}%
                                            </p>
                                        </div>
                                        <div className="p-3 rounded-full bg-green-500/10">
                                            <FolderOpen className="w-8 h-8 text-green-600" />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Charts Section */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {/* Skills Radar */}
                            <Card className="border-0 shadow-md bg-white/70 backdrop-blur-sm">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <BarChart2 className="w-5 h-5" />
                                        Performance Overview
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <ResponsiveContainer width="100%" height={300}>
                                        <LineChart data={skillsData}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="name" />
                                            <YAxis domain={[0, 100]} />
                                            <Tooltip />
                                            <Line 
                                                type="monotone" 
                                                dataKey="score" 
                                                stroke="#3b82f6" 
                                                strokeWidth={3}
                                                strokeLinecap="round"
                                            />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </CardContent>
                            </Card>

                            {/* Course Completion */}
                            <Card className="border-0 shadow-md bg-white/70 backdrop-blur-sm">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <GraduationCap className="w-5 h-5" />
                                        Course Progress
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <ResponsiveContainer width="100%" height={300}>
                                        <PieChart>
                                            <Pie
                                                data={courseCompletionData}
                                                cx="50%"
                                                cy="50%"
                                                outerRadius={100}
                                                fill="#8884d8"
                                                dataKey="value"
                                                label={({ name, value }) => `${name}: ${value}`}
                                            >
                                                {courseCompletionData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                                ))}
                                            </Pie>
                                            <Tooltip />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Assessment Trend */}
                        {assessmentTrendData.length > 0 && (
                            <Card className="border-0 shadow-md bg-white/70 backdrop-blur-sm">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <TrendingUp className="w-5 h-5" />
                                        Assessment Progress Trend
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <ResponsiveContainer width="100%" height={300}>
                                        <LineChart data={assessmentTrendData}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="name" />
                                            <YAxis domain={[0, 100]} />
                                            <Tooltip />
                                            <Line 
                                                type="monotone" 
                                                dataKey="score" 
                                                stroke="#10b981" 
                                                strokeWidth={3}
                                                strokeLinecap="round"
                                            />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </CardContent>
                            </Card>
                        )}

                        {/* Detailed Tables */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {/* Course Details */}
                            <Card className="border-0 shadow-md bg-white/70 backdrop-blur-sm">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <BookOpen className="w-5 h-5" />
                                        Course History
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        <div>
                                            <h4 className="font-semibold text-success mb-2">Completed Courses</h4>
                                            {readinessData.completed_courses.length === 0 ? (
                                                <p className="text-muted-foreground text-sm">No completed courses yet</p>
                                            ) : (
                                                <div className="space-y-2">
                                                    {readinessData.completed_courses.map((course) => (
                                                        <div key={course.course_id} className="flex justify-between items-center p-2 bg-success/5 rounded">
                                                            <span className="font-medium">{course.course_name}</span>
                                                            <span className="text-sm text-muted-foreground">
                                                                {course.completion_date && new Date(course.completion_date).toLocaleDateString()}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        <Separator />

                                        <div>
                                            <h4 className="font-semibold text-warning mb-2">Pending Courses</h4>
                                            {readinessData.pending_courses.length === 0 ? (
                                                <p className="text-muted-foreground text-sm">No pending courses</p>
                                            ) : (
                                                <div className="space-y-2">
                                                    {readinessData.pending_courses.map((course) => (
                                                        <div key={course.course_id} className="flex justify-between items-center p-2 bg-warning/5 rounded">
                                                            <span className="font-medium">{course.course_name}</span>
                                                            <span className="text-sm text-muted-foreground">
                                                                Enrolled: {course.enrollment_date && new Date(course.enrollment_date).toLocaleDateString()}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Assessment Details */}
                            <Card className="border-0 shadow-md bg-white/70 backdrop-blur-sm">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Star className="w-5 h-5" />
                                        Assessment Results
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {readinessData.assessment_details.length === 0 ? (
                                        <p className="text-muted-foreground">No assessments taken yet</p>
                                    ) : (
                                        <div className="space-y-3">
                                            {readinessData.assessment_details.map((assessment) => (
                                                <div key={assessment.assessment_id} className="p-3 border rounded-lg">
                                                    <div className="flex justify-between items-start mb-2">
                                                        <div>
                                                            <h5 className="font-semibold">{assessment.assessment_title}</h5>
                                                            <p className="text-sm text-muted-foreground">{assessment.course_name}</p>
                                                        </div>
                                                        <Badge variant={assessment.passed ? "default" : "destructive"}>
                                                            {assessment.score}%
                                                        </Badge>
                                                    </div>
                                                    <p className="text-xs text-muted-foreground">
                                                        Taken on {new Date(assessment.taken_at).toLocaleDateString()}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>

                        {/* Project Evaluations */}
                        {readinessData.project_details.length > 0 && (
                            <Card className="border-0 shadow-md bg-white/70 backdrop-blur-sm">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <FolderOpen className="w-5 h-5" />
                                        Project Evaluations
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-6">
                                        {readinessData.project_details.map((project) => (
                                            <div key={project.project_id} className="border rounded-lg p-4">
                                                <h4 className="font-semibold text-lg mb-2">{project.project_name}</h4>
                                                <Badge variant="outline" className="mb-3">{project.status}</Badge>
                                                
                                                {project.evaluation?.map((evaluation, index) => (
                                                    <div key={index} className="bg-muted/30 p-3 rounded mt-3">
                                                        <div className="flex justify-between items-center mb-2">
                                                            <span className="font-medium">Evaluated by: {evaluation.evaluator}</span>
                                                            <Badge variant="secondary">{evaluation.overall_score}/10</Badge>
                                                        </div>
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                                            <div>
                                                                <h6 className="font-medium text-success mb-1">Strengths:</h6>
                                                                <p>{evaluation.strengths}</p>
                                                            </div>
                                                            <div>
                                                                <h6 className="font-medium text-warning mb-1">Areas for Improvement:</h6>
                                                                <p>{evaluation.areas_for_improvement}</p>
                                                            </div>
                                                        </div>
                                                        <p className="text-xs text-muted-foreground mt-2">
                                                            Evaluated on {new Date(evaluation.evaluation_date).toLocaleDateString()}
                                                        </p>
                                                    </div>
                                                ))}
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                ) : null}
            </div>
        </div>
    );
}