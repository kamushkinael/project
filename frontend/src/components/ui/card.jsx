// src/components/ui/card.jsx
import React from "react";
import clsx from "clsx";

// Основной контейнер карточки
export const Card = ({ className, children, ...props }) => {
  return (
    <div
      className={clsx(
        "rounded-lg border border-border bg-card text-card-foreground shadow-sm",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

// Секция контента внутри карточки
export const CardContent = ({ className, children, ...props }) => {
  return (
    <div className={clsx("p-4", className)} {...props}>
      {children}
    </div>
  );
};

// Заголовок карточки (верхняя часть)
export const CardHeader = ({ className, children, ...props }) => {
  return (
    <div className={clsx("p-4 border-b border-border", className)} {...props}>
      {children}
    </div>
  );
};

// Заголовок текста карточки
export const CardTitle = ({ className, children, ...props }) => {
  return (
    <h3 className={clsx("text-lg font-semibold leading-none", className)} {...props}>
      {children}
    </h3>
  );
};

// Дополнительное описание/подзаголовок
export const CardDescription = ({ className, children, ...props }) => {
  return (
    <p className={clsx("text-sm text-muted-foreground", className)} {...props}>
      {children}
    </p>
  );
};
