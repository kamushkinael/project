import React from "react";

export const CardHeader = ({ children, className, ...props }) => (
  <div className={`mb-2 font-semibold text-lg ${className}`} {...props}>
    {children}
  </div>
);
