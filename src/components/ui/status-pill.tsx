import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const statusPillVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        green: "bg-primary text-on-primary border-transparent",
        primary: "bg-primary text-on-primary border-transparent",
        soft: "bg-canvas-soft text-ink border-transparent",
        neutral: "bg-canvas-soft text-ink border-transparent",
        merged: "bg-primary/15 text-primary border border-primary/30",
        success: "bg-primary/15 text-primary border border-primary/30",
        open: "bg-accent-yellow/20 text-ink border border-accent-yellow/40",
        warning: "bg-accent-yellow/20 text-ink border border-accent-yellow/40",
        closed: "bg-accent-tomato/15 text-accent-tomato border border-accent-tomato/30",
        destructive: "bg-accent-tomato/15 text-accent-tomato border border-accent-tomato/30",
        outline: "border border-hairline text-ink bg-transparent",
      },
      size: {
        micro: "px-2 py-0.5 text-[12px]",
        sm: "px-2.5 py-0.5 text-xs",
        md: "px-3 py-1 text-xs",
        lg: "px-3.5 py-1.5 text-sm",
      },
    },
    defaultVariants: {
      variant: "soft",
      size: "sm",
    },
  },
);

export interface StatusPillProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof statusPillVariants> {}

function StatusPill({ className, variant, size, ...props }: StatusPillProps) {
  return (
    <span
      role="status"
      className={cn(statusPillVariants({ variant, size }), className)}
      {...props}
    />
  );
}

export { StatusPill, statusPillVariants };
