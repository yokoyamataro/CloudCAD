import React from 'react';
import { cn } from '../../lib/utils';

interface DialogContextValue {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DialogContext = React.createContext<DialogContextValue | undefined>(undefined);

interface DialogProps {
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const Dialog: React.FC<DialogProps> = ({ 
  children, 
  open = false, 
  onOpenChange = () => {} 
}) => {
  const [internalOpen, setInternalOpen] = React.useState(false);
  const isControlled = open !== undefined && onOpenChange !== undefined;
  const isOpen = isControlled ? open : internalOpen;
  const setOpen = isControlled ? onOpenChange : setInternalOpen;

  return (
    <DialogContext.Provider value={{ open: isOpen, onOpenChange: setOpen }}>
      {children}
    </DialogContext.Provider>
  );
};

interface DialogTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
}

export const DialogTrigger = React.forwardRef<HTMLButtonElement, DialogTriggerProps>(
  ({ className, children, asChild, ...props }, ref) => {
    const context = React.useContext(DialogContext);
    if (!context) throw new Error('DialogTrigger must be used within Dialog');

    if (asChild && React.isValidElement(children)) {
      return React.cloneElement(children as React.ReactElement, {
        onClick: (e: React.MouseEvent) => {
          context.onOpenChange(true);
          if (children.props.onClick) children.props.onClick(e);
        },
      });
    }

    return (
      <button
        ref={ref}
        className={className}
        onClick={() => context.onOpenChange(true)}
        {...props}
      >
        {children}
      </button>
    );
  }
);
DialogTrigger.displayName = 'DialogTrigger';

interface DialogContentProps extends React.HTMLAttributes<HTMLDivElement> {}

export const DialogContent = React.forwardRef<HTMLDivElement, DialogContentProps>(
  ({ className, children, ...props }, ref) => {
    const context = React.useContext(DialogContext);
    if (!context) throw new Error('DialogContent must be used within Dialog');

    if (!context.open) return null;

    return (
      <>
        <div 
          className="fixed inset-0 z-50 bg-black/50"
          onClick={() => context.onOpenChange(false)}
        />
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            ref={ref}
            className={cn(
              'relative z-50 grid w-full max-w-lg gap-4 border border-gray-200 bg-white p-6 shadow-lg duration-200 rounded-lg',
              className
            )}
            {...props}
          >
            {children}
            <button
              className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-white transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              onClick={() => context.onOpenChange(false)}
            >
              ×
            </button>
          </div>
        </div>
      </>
    );
  }
);
DialogContent.displayName = 'DialogContent';

interface DialogHeaderProps extends React.HTMLAttributes<HTMLDivElement> {}

export const DialogHeader = React.forwardRef<HTMLDivElement, DialogHeaderProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'flex flex-col space-y-1.5 text-center sm:text-left',
        className
      )}
      {...props}
    />
  )
);
DialogHeader.displayName = 'DialogHeader';

interface DialogTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {}

export const DialogTitle = React.forwardRef<HTMLHeadingElement, DialogTitleProps>(
  ({ className, ...props }, ref) => (
    <h2
      ref={ref}
      className={cn(
        'text-lg font-semibold leading-none tracking-tight',
        className
      )}
      {...props}
    />
  )
);
DialogTitle.displayName = 'DialogTitle';