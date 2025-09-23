import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface RequiredLabelProps extends React.ComponentProps<typeof Label> {
  children: React.ReactNode;
}

export function RequiredLabel({ children, className, ...props }: RequiredLabelProps) {
  return (
    <Label className={cn("flex items-center gap-1", className)} {...props}>
      {children}
      <span className="text-destructive text-sm">*</span>
    </Label>
  );
}