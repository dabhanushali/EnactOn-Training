// Master Data Configuration - Single Source of Truth for all dropdown values

export const MASTER_DATA = {
  // Course Types
  courseTypes: [
    'Technical',
    'Soft skills',
    'Informative',
    'AI'
  ],

  // Target Roles
  targetRoles: [
    'Developer',
    'Manager', 
    'Devops',
    'AI',
    'Software',
    'Product Manager',
    'BDE',
    'HR',
    'Other'
  ],

  // Designations
designations: [
  'HR Manager',
  'PHP Laravel Developer',
  'Senior PHP Laravel Developer',
  'Social Media Content Creator',
  'Junior Backend Developer (AWS, Cloud, Python)',
  'Junior React JS/MERN Developer',
  'Senior React JS/MERN Developer',
  'Full Stack Developer',
  'Quality Assurance',
  'Junior Developer',
  'Senior Developer',
  'Technical Business Development',
  'Web Designer',
  'Frontend - WordPress, Figma',
  'DevOps',
  'Internship',
  'HR & Admin Executive',
  'Executive',
  'Team Lead',
  'Developer',
  'Senior',
  'Engineer',
  'Manager',
  'CEO',
  'CTO',
  'Students',
  'Project Manager',
  'Junior Executive - E-commerce',
  'Project Coordinator',
  'AI/DevOps Engineer',
  'Content Strategist',
  'Business Development / Operations',
  'Product & Project Management',
  'Project Management'
],

  // Departments
 departments: [
  'Frontend',
  'Human Resources',
  'Marketing',
  'Backend (Node JS, AWS, Python)',
  'QA',
  'Frontend- UI/UX',
  'Digital Sales & Marketing',
  'Business Development',
  'Project Management',
  'Full Stack',
  'Mobile Apps',
  'React Native Developer',
  'Flutter Developer',
  'PHP Laravel Developer',
  'MERN-Full stack',
  'Digital Marketing',
  'E-commerce Sales & Marketing',
  'Devops',
  'React JS Developer',
  'Accountant',
  'Others',
  'Management',
  'Content Writer',
  'Web designer',
  'Business Analyst',
  'Block-chain Developer',
   'AI Prompt Engineer'
],

  // Session Types
  sessionTypes: [
    'Monthly Review',
    'Workshop',
    'Informative',
    'One on One',
    'Welcome',
    'Project Brief',
    'Product KT',
    'Other'
  ],

  // Status Values
  statusValues: {
    general: ['Active', 'Inactive', 'Pending'],
    employee: ['Pre-Joining', 'Active', 'On Leave', 'Inactive'],
    course: ['Draft', 'Published', 'Archived'],
    project: ['Not Started', 'In Progress', 'Completed', 'On Hold'],
    assessment: ['Pending', 'In Progress', 'Completed', 'Failed']
  },

  // Assessment Types (excluding 'project' as requested)
  assessmentTypes: [
    'Quiz'
  ],

  // Content Types for Course Modules
  contentTypes: [
    'Text',
    'Video', 
    'PDF',
    'External Link',
    'Mixed Content'
  ],

  // Project Types
  projectTypes: [
    'Internal',
    'Client',
    'Training',
    'Research'
  ],

  // Document Types
  documentTypes: [
    'ID Card',
    'Offer Letter',
    'Contract',
    'Resume',
    'Passport',
    'Address Proof',
    'Educational Certificate',
    'Experience Letter',
    'Other'
  ],

  // Course Completion Rules
  completionRules: [
    'pass_all_assessments',
    'pass_minimum_percentage', 
    'pass_mandatory_only'
  ],

  // Difficulty Levels
  difficultyLevels: [
    'Beginner',
    'Intermediate', 
    'Advanced',
    'Expert'
  ]
};

// Utility function to get dropdown options
export const getDropdownOptions = (dataKey: keyof typeof MASTER_DATA) => {
  return MASTER_DATA[dataKey];
};

// Utility function to get nested dropdown options
export const getNestedDropdownOptions = (dataKey: string, subKey?: string) => {
  const keys = dataKey.split('.');
  let data: any = MASTER_DATA;
  
  for (const key of keys) {
    data = data[key];
    if (!data) return [];
  }
  
  if (subKey) {
    return data[subKey] || [];
  }
  
  return data || [];
};

// Named exports for compatibility
export const COURSE_TYPES = MASTER_DATA.courseTypes;
export const TARGET_ROLES = MASTER_DATA.targetRoles;
export const DEPARTMENTS = MASTER_DATA.departments;