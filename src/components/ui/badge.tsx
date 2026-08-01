import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { StatusPill, statusPillVariants } from './status-pill';
import {
  ContributorBadge,
  contributorBadgeVariants,
} from './contributor-badge';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-primary text-on-primary hover:bg-primary-deep',
        primary:
          'border-transparent bg-primary text-on-primary hover:bg-primary-deep',
        secondary:
          'border-transparent bg-canvas-soft text-ink hover:bg-canvas-soft/80',
        soft: 'border-transparent bg-canvas-soft text-ink hover:bg-canvas-soft/80',
        destructive:
          'border-transparent bg-accent-tomato text-on-dark hover:bg-accent-tomato/90',
        outline: 'border-hairline text-ink bg-transparent',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

export interface BadgeProps
  extends
    React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export {
  Badge,
  badgeVariants,
  StatusPill,
  statusPillVariants,
  ContributorBadge,
  contributorBadgeVariants,
};
