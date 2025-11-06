-- Add parent_module_id column to support hierarchical modules
ALTER TABLE public.course_modules
ADD COLUMN parent_module_id UUID REFERENCES public.course_modules(id) ON DELETE CASCADE;

-- Add index for better query performance
CREATE INDEX idx_course_modules_parent_id ON public.course_modules(parent_module_id);

-- Add comment
COMMENT ON COLUMN public.course_modules.parent_module_id IS 'References parent module for sub-modules. NULL for top-level modules.';