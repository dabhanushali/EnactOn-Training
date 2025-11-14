-- Revert the role name change from "Intern" back to "Trainee"
-- This restores the original role name in the database

UPDATE public.roles
SET role_name = 'Trainee',
    role_description = 'Employees participating in training programs'
WHERE role_name = 'Intern';

-- Update any references in related tables if needed
-- Note: This assumes the role name was changed in the roles table
