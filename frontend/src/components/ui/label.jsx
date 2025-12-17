import React from "react";

export const Label = ({ children, className, ...props }) => (
  <label className={`block text-sm font-medium text-foreground ${className}`} {...props}>
    {children}
  </label>
);
