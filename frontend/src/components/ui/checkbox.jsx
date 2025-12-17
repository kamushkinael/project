import React from "react";
import { cn } from "@/lib/utils";

export const Checkbox = React.forwardRef(({ className, ...props }, ref) => (
  <input
    type="checkbox"
    ref={ref}
    className={cn(
      "h-4 w-4 rounded border-border text-primary focus:ring-2 focus:ring-ring",
      className
    )}
    {...props}
  />
));

Checkbox.displayName = "Checkbox";
