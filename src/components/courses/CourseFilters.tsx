import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, Filter, RotateCcw } from 'lucide-react';
import { COURSE_TYPES, TARGET_ROLES } from '@/lib/masterData';

export interface CourseFilters {
  courseType: string;
  targetRole: string;
  isMandatory: string;
  difficultyLevel: string;
}

interface CourseFiltersProps {
  filters: CourseFilters;
  onFiltersChange: (filters: CourseFilters) => void;
  onReset: () => void;
}

const DIFFICULTY_LEVELS = ['Beginner', 'Intermediate', 'Advanced'];
const MANDATORY_OPTIONS = [
  { value: 'all', label: 'All Courses' },
  { value: 'true', label: 'Mandatory Only' },
  { value: 'false', label: 'Optional Only' }
];

export const CourseFiltersComponent = ({ filters, onFiltersChange, onReset }: CourseFiltersProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const updateFilter = (key: keyof CourseFilters, value: string) => {
    onFiltersChange({
      ...filters,
      [key]: value
    });
  };

  const getActiveFiltersCount = () => {
    return Object.values(filters).filter(value => value !== '' && value !== 'all').length;
  };

  const getActiveFiltersList = () => {
    const activeFilters = [];
    if (filters.courseType && filters.courseType !== 'all') {
      activeFilters.push({ key: 'courseType', label: 'Course Type', value: filters.courseType });
    }
    if (filters.targetRole && filters.targetRole !== 'all') {
      activeFilters.push({ key: 'targetRole', label: 'Target Role', value: filters.targetRole });
    }
    if (filters.isMandatory && filters.isMandatory !== 'all') {
      const mandatoryLabel = filters.isMandatory === 'true' ? 'Mandatory' : 'Optional';
      activeFilters.push({ key: 'isMandatory', label: 'Type', value: mandatoryLabel });
    }
    if (filters.difficultyLevel && filters.difficultyLevel !== 'all') {
      activeFilters.push({ key: 'difficultyLevel', label: 'Difficulty', value: filters.difficultyLevel });
    }
    return activeFilters;
  };

  const activeFiltersCount = getActiveFiltersCount();
  const activeFiltersList = getActiveFiltersList();

  return (
    <div className="space-y-4">
      {/* Filter Toggle Button */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2"
        >
          <Filter className="h-4 w-4" />
          Filters
          {activeFiltersCount > 0 && (
            <Badge variant="secondary" className="ml-2">
              {activeFiltersCount}
            </Badge>
          )}
        </Button>
        
        {activeFiltersCount > 0 && (
          <Button variant="ghost" size="sm" onClick={onReset} className="flex items-center gap-2">
            <RotateCcw className="h-3 w-3" />
            Reset
          </Button>
        )}
      </div>

      {/* Active Filters Display */}
      {activeFiltersList.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {activeFiltersList.map((filter) => (
            <Badge key={filter.key} variant="secondary" className="flex items-center gap-1 px-3 py-1">
              <span className="text-xs font-medium">{filter.label}: {filter.value}</span>
              <X
                className="h-3 w-3 cursor-pointer hover:text-destructive"
                onClick={() => updateFilter(filter.key as keyof CourseFilters, 'all')}
              />
            </Badge>
          ))}
        </div>
      )}

      {/* Expandable Filter Controls */}
      {isExpanded && (
        <Card className="animate-fade-in">
          <CardHeader>
            <CardTitle className="text-lg">Filter Courses</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* Course Type Filter */}
            <div className="space-y-2">
              <Label htmlFor="course-type">Course Type</Label>
              <Select
                value={filters.courseType || 'all'}
                onValueChange={(value) => updateFilter('courseType', value)}
              >
                <SelectTrigger id="course-type">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {COURSE_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Target Role Filter */}
            <div className="space-y-2">
              <Label htmlFor="target-role">Target Role</Label>
              <Select
                value={filters.targetRole || 'all'}
                onValueChange={(value) => updateFilter('targetRole', value)}
              >
                <SelectTrigger id="target-role">
                  <SelectValue placeholder="All Roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  {TARGET_ROLES.map((role) => (
                    <SelectItem key={role} value={role}>
                      {role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Mandatory/Optional Filter */}
            <div className="space-y-2">
              <Label htmlFor="mandatory">Course Status</Label>
              <Select
                value={filters.isMandatory || 'all'}
                onValueChange={(value) => updateFilter('isMandatory', value)}
              >
                <SelectTrigger id="mandatory">
                  <SelectValue placeholder="All Courses" />
                </SelectTrigger>
                <SelectContent>
                  {MANDATORY_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Difficulty Level Filter */}
            <div className="space-y-2">
              <Label htmlFor="difficulty">Difficulty Level</Label>
              <Select
                value={filters.difficultyLevel || 'all'}
                onValueChange={(value) => updateFilter('difficultyLevel', value)}
              >
                <SelectTrigger id="difficulty">
                  <SelectValue placeholder="All Levels" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  {DIFFICULTY_LEVELS.map((level) => (
                    <SelectItem key={level} value={level}>
                      {level}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};