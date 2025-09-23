interface RequiredLabelProps {
  children: React.ReactNode;
  required?: boolean;
  htmlFor?: string;
}

export function RequiredLabel({ children, required = false, htmlFor, ...props }: RequiredLabelProps & React.ComponentProps<'label'>) {
  return (
    <label htmlFor={htmlFor} {...props}>
      {children}
      {required && <span className="text-destructive ml-1">*</span>}
    </label>
  );
}