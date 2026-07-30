import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const contributorBadgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold shadow-xs transition-colors border",
  {
    variants: {
      tier: {
        bronze:
          "text-[#cd7f32] bg-[rgba(205,127,50,0.15)] border-[#cd7f32] dark:bg-[rgba(205,127,50,0.22)] uppercase tracking-wider text-[11px] font-bold rounded-sm px-2 py-0.5",
        silver:
          "text-[#c0c0c0] bg-[rgba(192,192,192,0.15)] border-[#c0c0c0] dark:bg-[rgba(192,192,192,0.22)] uppercase tracking-wider text-[11px] font-bold rounded-sm px-2 py-0.5",
        gold:
          "text-[#ffd700] bg-[rgba(255,215,0,0.15)] border-[#ffd700] dark:bg-[rgba(255,215,0,0.22)] uppercase tracking-wider text-[11px] font-bold rounded-sm px-2 py-0.5",
        platinum:
          "text-[#e5e4e2] bg-[rgba(229,228,226,0.15)] border-[#e5e4e2] dark:bg-[rgba(229,228,226,0.22)] uppercase tracking-wider text-[11px] font-bold rounded-sm px-2 py-0.5",
        diamond:
          "text-[#00e1d9] bg-[rgba(0,225,217,0.15)] border-[#00e1d9] dark:bg-[rgba(0,225,217,0.22)] uppercase tracking-wider text-[11px] font-bold rounded-sm px-2 py-0.5",
        none: "",
      },
      program: {
        gsoc: "bg-gradient-to-r from-[#34A853] to-[#4285F4] text-white border-transparent shadow-xs",
        gssoc: "bg-gradient-to-r from-[#FF9900] to-[#FF5E36] text-white border-transparent shadow-xs",
        hacktoberfest: "bg-gradient-to-r from-[#FF2201] to-[#FF007A] text-white border-transparent shadow-xs",
        elusoc: "bg-gradient-to-r from-[#6b01c2] to-[#00d2ff] text-white border-transparent shadow-xs",
        swoc: "bg-gradient-to-r from-[#644fc1] to-[#c7007e] text-white border-transparent shadow-xs",
        default: "bg-gradient-to-r from-[#707070] to-[#9a9a9a] text-white border-transparent shadow-xs",
        none: "",
      },
      size: {
        sm: "px-2 py-0.5 text-xs",
        md: "px-2.5 py-1 text-xs",
        lg: "px-3.5 py-1.5 text-sm",
      },
    },
    defaultVariants: {
      tier: "none",
      program: "none",
      size: "md",
    },
  },
);

export interface ContributorBadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof contributorBadgeVariants> {}

function ContributorBadge({
  className,
  tier,
  program,
  size,
  ...props
}: ContributorBadgeProps) {
  return (
    <div
      className={cn(contributorBadgeVariants({ tier, program, size }), className)}
      {...props}
    />
  );
}

export { ContributorBadge, contributorBadgeVariants };
