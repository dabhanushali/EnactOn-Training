// Application-level enums for LMS system
// These are used instead of database enums for flexibility

export const EmployeeStatus = {
  PRE_JOINING: 'Pre-Joining',
  ACTIVE: 'Active',
  ON_LEAVE: 'On-Leave',
  TERMINATED: 'Terminated',
  RESIGNED: 'Resigned'
} as const;

export type EmployeeStatusType = typeof EmployeeStatus[keyof typeof EmployeeStatus];

export const UserRoles = {
  MANAGEMENT: 'Management',
  HUMAN_RESOURCES: 'Human Resources',
  TEAM_LEAD: 'Team Lead',
  INTERN: 'Intern'
} as const;

// Display names for user roles (for UI only)
export const UserRoleDisplayNames: Record<UserRoleType, string> = {
  [UserRoles.MANAGEMENT]: 'Management',
  [UserRoles.HUMAN_RESOURCES]: 'Human Resources',
  [UserRoles.TEAM_LEAD]: 'Team Lead',
  [UserRoles.INTERN]: 'Intern'
} as const;

export type UserRoleType = typeof UserRoles[keyof typeof UserRoles];

export const CourseType = {
  PRE_JOINING: 'Pre-Joining',
  ONBOARDING: 'Onboarding',
  TECHNICAL: 'Technical',
  SOFT_SKILLS: 'Soft Skills',
  COMPLIANCE: 'Compliance',
  LEADERSHIP: 'Leadership'
} as const;

export type CourseTypeType = typeof CourseType[keyof typeof CourseType];

export const DifficultyLevel = {
  BEGINNER: 'Beginner',
  INTERMEDIATE: 'Intermediate', 
  ADVANCED: 'Advanced',
  EXPERT: 'Expert'
} as const;

export type DifficultyLevelType = typeof DifficultyLevel[keyof typeof DifficultyLevel];

export const LessonType = {
  VIDEO: 'Video',
  DOCUMENT: 'Document',
  YOUTUBE: 'YouTube',
  ONLINE_COURSE: 'Online Course',
  ASSIGNMENT: 'Assignment',
  QUIZ: 'Quiz',
  PROJECT: 'Project'
} as const;

export type LessonTypeType = typeof LessonType[keyof typeof LessonType];

export const QuestionType = {
  MULTIPLE_CHOICE: 'Multiple Choice',
  TRUE_FALSE: 'True/False',
  ESSAY: 'Essay',
  SHORT_ANSWER: 'Short Answer',
  FILL_IN_BLANK: 'Fill in Blank'
} as const;

export type QuestionTypeType = typeof QuestionType[keyof typeof QuestionType];

export const ProgressStatus = {
  NOT_STARTED: 'Not Started',
  IN_PROGRESS: 'In Progress', 
  COMPLETED: 'Completed',
  OVERDUE: 'Overdue',
  CANCELLED: 'Cancelled'
} as const;

export type ProgressStatusType = typeof ProgressStatus[keyof typeof ProgressStatus];

export const AssessmentType = {
  LESSON_QUIZ: 'Lesson Quiz',
  MODULE_TEST: 'Module Test',
  COURSE_FINAL: 'Course Final',
  PROJECT_EVALUATION: 'Project Evaluation',
  PRACTICAL_TEST: 'Practical Test'
} as const;

export type AssessmentTypeType = typeof AssessmentType[keyof typeof AssessmentType];

export const AssessmentStatus = {
  PENDING: 'Pending',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
  GRADED: 'Graded',
  FAILED: 'Failed'
} as const;

export type AssessmentStatusType = typeof AssessmentStatus[keyof typeof AssessmentStatus];

export const ProjectType = {
  INDIVIDUAL: 'Individual',
  TEAM: 'Team',
  CAPSTONE: 'Capstone',
  REAL_WORLD: 'Real World',
  SIMULATION: 'Simulation'
} as const;

export type ProjectTypeType = typeof ProjectType[keyof typeof ProjectType];

export const ProjectStatus = {
  NOT_STARTED: 'Not Started',
  PLANNING: 'Planning',
  IN_PROGRESS: 'In Progress',
  REVIEW: 'Review',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled'
} as const;

export type ProjectStatusType = typeof ProjectStatus[keyof typeof ProjectStatus];

export const MilestoneStatus = {
  PENDING: 'Pending',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
  OVERDUE: 'Overdue',
  CANCELLED: 'Cancelled'
} as const;

export type MilestoneStatusType = typeof MilestoneStatus[keyof typeof MilestoneStatus];

export const SessionType = {
  ORIENTATION: 'Orientation',
  TRAINING: 'Training',
  WORKSHOP: 'Workshop',
  WEBINAR: 'Webinar',
  ASSESSMENT: 'Assessment',
  ONE_ON_ONE: 'One-on-One'
} as const;

export type SessionTypeType = typeof SessionType[keyof typeof SessionType];

export const SessionStatus = {
  SCHEDULED: 'Scheduled',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  POSTPONED: 'Postponed'
} as const;

export type SessionStatusType = typeof SessionStatus[keyof typeof SessionStatus];

export const MeetingPlatform = {
  GOOGLE_MEET: 'Google Meet',
  ZOOM: 'Zoom',
  MICROSOFT_TEAMS: 'Microsoft Teams',
  WEBEX: 'Webex',
  IN_PERSON: 'In Person'
} as const;

export type MeetingPlatformType = typeof MeetingPlatform[keyof typeof MeetingPlatform];

export const DocumentType = {
  ID_PROOF: 'ID Proof',
  EDUCATION_CERTIFICATE: 'Education Certificate',
  EXPERIENCE_LETTER: 'Experience Letter',
  RESUME: 'Resume',
  CONTRACT: 'Contract',
  POLICY_DOCUMENT: 'Policy Document',
  OTHER: 'Other'
} as const;

export type DocumentTypeType = typeof DocumentType[keyof typeof DocumentType];

export const Grade = {
  A_PLUS: 'A+',
  A: 'A',
  B_PLUS: 'B+', 
  B: 'B',
  C_PLUS: 'C+',
  C: 'C',
  D: 'D',
  F: 'F'
} as const;

export type GradeType = typeof Grade[keyof typeof Grade];

// Helper functions for validation and display
export const isValidEmployeeStatus = (status: string): status is EmployeeStatusType => {
  return Object.values(EmployeeStatus).includes(status as EmployeeStatusType);
};

export const isValidUserRole = (role: string): role is UserRoleType => {
  return Object.values(UserRoles).includes(role as UserRoleType);
};

export const isValidProgressStatus = (status: string): status is ProgressStatusType => {
  return Object.values(ProgressStatus).includes(status as ProgressStatusType);
};

// Get display name for user role
export const getUserRoleDisplayName = (role: UserRoleType): string => {
  return UserRoleDisplayNames[role] || role;
};

// Export all enum values as arrays for dropdowns
export const EmployeeStatusOptions = Object.values(EmployeeStatus);
export const UserRoleOptions = Object.values(UserRoles);
export const CourseTypeOptions = Object.values(CourseType);
export const DifficultyLevelOptions = Object.values(DifficultyLevel);
export const LessonTypeOptions = Object.values(LessonType);
export const QuestionTypeOptions = Object.values(QuestionType);
export const ProgressStatusOptions = Object.values(ProgressStatus);
export const AssessmentTypeOptions = Object.values(AssessmentType);
export const AssessmentStatusOptions = Object.values(AssessmentStatus);
export const ProjectTypeOptions = Object.values(ProjectType);
export const ProjectStatusOptions = Object.values(ProjectStatus);
export const MilestoneStatusOptions = Object.values(MilestoneStatus);
export const SessionTypeOptions = Object.values(SessionType);
export const SessionStatusOptions = Object.values(SessionStatus);
export const MeetingPlatformOptions = Object.values(MeetingPlatform);
export const DocumentTypeOptions = Object.values(DocumentType);
export const GradeOptions = Object.values(Grade);
