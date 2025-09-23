-- Phase 4: Implement True Cascading Deletes for Data Integrity

-- First, let's add proper foreign key constraints with CASCADE deletes
-- This will ensure that when a course is deleted, all related data is cleaned up

-- Add foreign key constraints for course-related tables with CASCADE deletes
ALTER TABLE course_modules DROP CONSTRAINT IF EXISTS course_modules_course_id_fkey;
ALTER TABLE course_modules ADD CONSTRAINT course_modules_course_id_fkey 
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE;

ALTER TABLE assessment_templates DROP CONSTRAINT IF EXISTS assessment_templates_course_id_fkey;
ALTER TABLE assessment_templates ADD CONSTRAINT assessment_templates_course_id_fkey 
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE;

ALTER TABLE assessment_questions DROP CONSTRAINT IF EXISTS assessment_questions_assessment_template_id_fkey;
ALTER TABLE assessment_questions ADD CONSTRAINT assessment_questions_assessment_template_id_fkey 
  FOREIGN KEY (assessment_template_id) REFERENCES assessment_templates(id) ON DELETE CASCADE;

ALTER TABLE question_options DROP CONSTRAINT IF EXISTS question_options_question_id_fkey;
ALTER TABLE question_options ADD CONSTRAINT question_options_question_id_fkey 
  FOREIGN KEY (question_id) REFERENCES assessment_questions(id) ON DELETE CASCADE;

ALTER TABLE course_enrollments DROP CONSTRAINT IF EXISTS course_enrollments_course_id_fkey;
ALTER TABLE course_enrollments ADD CONSTRAINT course_enrollments_course_id_fkey 
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE;

ALTER TABLE course_assessments DROP CONSTRAINT IF EXISTS course_assessments_course_id_fkey;
ALTER TABLE course_assessments ADD CONSTRAINT course_assessments_course_id_fkey 
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE;

ALTER TABLE course_assessments DROP CONSTRAINT IF EXISTS course_assessments_assessment_template_id_fkey;
ALTER TABLE course_assessments ADD CONSTRAINT course_assessments_assessment_template_id_fkey 
  FOREIGN KEY (assessment_template_id) REFERENCES assessment_templates(id) ON DELETE CASCADE;

-- Add foreign key constraints for employee-related tables with appropriate CASCADE behavior
-- Employee deletion should clean up their personal data but preserve projects they created
ALTER TABLE project_assignments DROP CONSTRAINT IF EXISTS project_assignments_assignee_id_fkey;
ALTER TABLE project_assignments ADD CONSTRAINT project_assignments_assignee_id_fkey 
  FOREIGN KEY (assignee_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE project_assignments DROP CONSTRAINT IF EXISTS project_assignments_assigned_by_fkey;
ALTER TABLE project_assignments ADD CONSTRAINT project_assignments_assigned_by_fkey 
  FOREIGN KEY (assigned_by) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE project_milestone_submissions DROP CONSTRAINT IF EXISTS project_milestone_submissions_submitted_by_fkey;
ALTER TABLE project_milestone_submissions ADD CONSTRAINT project_milestone_submissions_submitted_by_fkey 
  FOREIGN KEY (submitted_by) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE project_evaluations DROP CONSTRAINT IF EXISTS project_evaluations_employee_id_fkey;
ALTER TABLE project_evaluations ADD CONSTRAINT project_evaluations_employee_id_fkey 
  FOREIGN KEY (employee_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE project_evaluations DROP CONSTRAINT IF EXISTS project_evaluations_evaluator_id_fkey;
ALTER TABLE project_evaluations ADD CONSTRAINT project_evaluations_evaluator_id_fkey 
  FOREIGN KEY (evaluator_id) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE course_assessments DROP CONSTRAINT IF EXISTS course_assessments_employee_id_fkey;
ALTER TABLE course_assessments ADD CONSTRAINT course_assessments_employee_id_fkey 
  FOREIGN KEY (employee_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE course_assessments DROP CONSTRAINT IF EXISTS course_assessments_assessor_id_fkey;
ALTER TABLE course_assessments ADD CONSTRAINT course_assessments_assessor_id_fkey 
  FOREIGN KEY (assessor_id) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE course_enrollments DROP CONSTRAINT IF EXISTS course_enrollments_employee_id_fkey;
ALTER TABLE course_enrollments ADD CONSTRAINT course_enrollments_employee_id_fkey 
  FOREIGN KEY (employee_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- Projects created by a team lead should NOT be deleted when the team lead is deleted
-- This preserves team work - projects will remain with created_by set to NULL
ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_created_by_fkey;
ALTER TABLE projects ADD CONSTRAINT projects_created_by_fkey 
  FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;

-- Training sessions should preserve trainer info when trainer is deleted
ALTER TABLE training_sessions DROP CONSTRAINT IF EXISTS training_sessions_trainer_id_fkey;
ALTER TABLE training_sessions ADD CONSTRAINT training_sessions_trainer_id_fkey 
  FOREIGN KEY (trainer_id) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE training_sessions DROP CONSTRAINT IF EXISTS training_sessions_created_by_fkey;
ALTER TABLE training_sessions ADD CONSTRAINT training_sessions_created_by_fkey 
  FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;

-- Employee documents should be deleted when employee is deleted
ALTER TABLE employee_documents DROP CONSTRAINT IF EXISTS employee_documents_employee_id_fkey;
ALTER TABLE employee_documents ADD CONSTRAINT employee_documents_employee_id_fkey 
  FOREIGN KEY (employee_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE employee_documents DROP CONSTRAINT IF EXISTS employee_documents_uploaded_by_fkey;
ALTER TABLE employee_documents ADD CONSTRAINT employee_documents_uploaded_by_fkey 
  FOREIGN KEY (uploaded_by) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE employee_documents DROP CONSTRAINT IF EXISTS employee_documents_verified_by_fkey;  
ALTER TABLE employee_documents ADD CONSTRAINT employee_documents_verified_by_fkey 
  FOREIGN KEY (verified_by) REFERENCES profiles(id) ON DELETE SET NULL;

-- Manager relationships should be cleaned up when manager is deleted
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_manager_id_fkey;
ALTER TABLE profiles ADD CONSTRAINT profiles_manager_id_fkey 
  FOREIGN KEY (manager_id) REFERENCES profiles(id) ON DELETE SET NULL;

-- Role relationships should be preserved (roles should not be deleted)
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_id_fkey;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_id_fkey 
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE RESTRICT;

-- Project assignment relationships
ALTER TABLE project_assignments DROP CONSTRAINT IF EXISTS project_assignments_project_id_fkey;
ALTER TABLE project_assignments ADD CONSTRAINT project_assignments_project_id_fkey 
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;

ALTER TABLE project_milestone_submissions DROP CONSTRAINT IF EXISTS project_milestone_submissions_assignment_id_fkey;
ALTER TABLE project_milestone_submissions ADD CONSTRAINT project_milestone_submissions_assignment_id_fkey 
  FOREIGN KEY (assignment_id) REFERENCES project_assignments(id) ON DELETE CASCADE;

ALTER TABLE project_evaluations DROP CONSTRAINT IF EXISTS project_evaluations_project_id_fkey;
ALTER TABLE project_evaluations ADD CONSTRAINT project_evaluations_project_id_fkey 
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;

ALTER TABLE project_evaluations DROP CONSTRAINT IF EXISTS project_evaluations_submission_id_fkey;
ALTER TABLE project_evaluations ADD CONSTRAINT project_evaluations_submission_id_fkey 
  FOREIGN KEY (submission_id) REFERENCES project_milestone_submissions(id) ON DELETE SET NULL;

-- Training session course relationships
ALTER TABLE training_sessions DROP CONSTRAINT IF EXISTS training_sessions_course_id_fkey;
ALTER TABLE training_sessions ADD CONSTRAINT training_sessions_course_id_fkey 
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE SET NULL;