"use client";

import * as React from "react";
import { cn } from "../lib/utils";
import { Label } from "./label";

interface FormProps extends React.FormHTMLAttributes<HTMLFormElement> {}

const Form = React.forwardRef<HTMLFormElement, FormProps>(
  ({ className, ...props }, ref) => (
    <form ref={ref} className={cn("space-y-6", className)} {...props} />
  )
);
Form.displayName = "Form";

interface FormFieldContextValue {
  id: string;
  error?: string;
}

const FormFieldContext = React.createContext<FormFieldContextValue | undefined>(
  undefined
);

interface FormFieldProps {
  children: React.ReactNode;
  className?: string;
  error?: string;
  name: string;
}

const FormField = ({ children, className, error, name }: FormFieldProps) => {
  const id = React.useId();
  const fieldId = `${name}-${id}`;

  return (
    <FormFieldContext.Provider value={{ id: fieldId, error }}>
      <div className={cn("space-y-2", className)}>{children}</div>
    </FormFieldContext.Provider>
  );
};
FormField.displayName = "FormField";

const useFormField = () => {
  const context = React.useContext(FormFieldContext);
  if (!context) {
    throw new Error("useFormField must be used within a FormField");
  }
  return context;
};

interface FormLabelProps
  extends React.ComponentPropsWithoutRef<typeof Label> {}

const FormLabel = React.forwardRef<
  React.ElementRef<typeof Label>,
  FormLabelProps
>(({ className, ...props }, ref) => {
  const { id, error } = useFormField();

  return (
    <Label
      ref={ref}
      className={cn(error && "text-destructive", className)}
      htmlFor={id}
      {...props}
    />
  );
});
FormLabel.displayName = "FormLabel";

interface FormControlProps extends React.HTMLAttributes<HTMLDivElement> {}

const FormControl = React.forwardRef<HTMLDivElement, FormControlProps>(
  ({ className, children, ...props }, ref) => {
    const { id, error } = useFormField();

    return (
      <div ref={ref} className={className} {...props}>
        {React.Children.map(children, (child) => {
          if (React.isValidElement(child)) {
            return React.cloneElement(child as React.ReactElement<{ id?: string; 'aria-invalid'?: boolean; 'aria-describedby'?: string }>, {
              id,
              'aria-invalid': !!error,
              'aria-describedby': error ? `${id}-error` : undefined,
            });
          }
          return child;
        })}
      </div>
    );
  }
);
FormControl.displayName = "FormControl";

interface FormDescriptionProps
  extends React.HTMLAttributes<HTMLParagraphElement> {}

const FormDescription = React.forwardRef<
  HTMLParagraphElement,
  FormDescriptionProps
>(({ className, ...props }, ref) => {
  const { id } = useFormField();

  return (
    <p
      ref={ref}
      id={`${id}-description`}
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  );
});
FormDescription.displayName = "FormDescription";

interface FormMessageProps extends React.HTMLAttributes<HTMLParagraphElement> {
  children?: React.ReactNode;
}

const FormMessage = React.forwardRef<HTMLParagraphElement, FormMessageProps>(
  ({ className, children, ...props }, ref) => {
    const { id, error } = useFormField();
    const message = error || children;

    if (!message) {
      return null;
    }

    return (
      <p
        ref={ref}
        id={`${id}-error`}
        className={cn("text-sm font-medium text-destructive", className)}
        {...props}
      >
        {message}
      </p>
    );
  }
);
FormMessage.displayName = "FormMessage";

export {
  Form,
  FormField,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
  useFormField,
};
