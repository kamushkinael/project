import * as React from "react";
import { createPortal } from "react-dom";

// Dialog Context для управления открытием/закрытием
const DialogContext = React.createContext();

export function Dialog({ children, open: controlledOpen, onOpenChange }) {
  const [isOpen, setIsOpen] = React.useState(false);

  const open = controlledOpen ?? isOpen;
  const setOpen = (value) => {
    if (controlledOpen === undefined) {
      setIsOpen(value);
    }
    onOpenChange?.(value);
  };

  return (
    <DialogContext.Provider value={{ open, setOpen }}>
      {children}
    </DialogContext.Provider>
  );
}

// Кнопка-триггер для открытия диалога
export function DialogTrigger({ children }) {
  const ctx = React.useContext(DialogContext);
  if (!ctx) throw new Error("DialogTrigger must be used within a Dialog");

  return React.cloneElement(children, {
    onClick: () => ctx.setOpen(true),
  });
}

// Содержимое диалога
export function DialogContent({ children, className }) {
  const ctx = React.useContext(DialogContext);
  if (!ctx) throw new Error("DialogContent must be used within a Dialog");

  if (!ctx.open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Фон */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => ctx.setOpen(false)}
      />
      {/* Контент */}
      <div
        className={`relative z-10 w-full max-w-md rounded-lg bg-card p-6 shadow-lg ${className}`}
      >
        {children}
      </div>
    </div>,
    document.body
  );
}

// Заголовок
export function DialogHeader({ children, className }) {
  return <div className={`mb-4 ${className}`}>{children}</div>;
}

// Заголовок диалога
export function DialogTitle({ children, className }) {
  return (
    <h2 className={`text-lg font-semibold leading-tight ${className}`}>
      {children}
    </h2>
  );
}

// Описание
export function DialogDescription({ children, className }) {
  return <p className={`text-sm text-muted-foreground ${className}`}>{children}</p>;
}

// Футер с кнопками
export function DialogFooter({ children, className }) {
  return <div className={`mt-4 flex justify-end space-x-2 ${className}`}>{children}</div>;
}
