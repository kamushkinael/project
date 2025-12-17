import React from "react";

export const CardBody = ({ children, className, ...props }) => (
  <div className={`mb-2 ${className}`} {...props}>
    {children}
  </div>
);
