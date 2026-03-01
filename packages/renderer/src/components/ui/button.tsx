import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-[var(--control-radius)] border border-transparent text-sm font-medium tracking-tight transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/45 focus-visible:ring-offset-0 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground shadow-sm hover:bg-primary/92',
        destructive: 'bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90',
        outline:
          'border-input/90 bg-background/90 shadow-sm hover:bg-accent/75 hover:text-accent-foreground',
        secondary:
          'border-border/65 bg-secondary/90 text-secondary-foreground shadow-sm hover:bg-secondary',
        ghost:
          'border-transparent text-foreground/85 hover:bg-accent/70 hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-[var(--control-height)] px-[var(--control-padding-x)] py-1.5',
        sm: 'h-[calc(var(--control-height)-4px)] rounded-[calc(var(--control-radius)-2px)] px-2.5 text-xs',
        lg: 'h-[calc(var(--control-height)+6px)] rounded-[calc(var(--control-radius)+2px)] px-6',
        icon: 'h-[var(--control-height)] w-[var(--control-height)]',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild: _asChild = false, ...props }, ref) => {
    return (
      <button className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
