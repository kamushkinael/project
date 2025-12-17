import React from "react";

export const CardFooter = ({ children, className, ...props }) => (
  <div className={`mt-2 text-right ${className}`} {...props}>
    {children}
  </div>
);
