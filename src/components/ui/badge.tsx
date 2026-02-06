import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#EF8354] focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-[#2D3142] text-white hover:bg-[#1a1d26]",
        secondary:
          "border-transparent bg-[#ecedf1] text-[#2D3142] hover:bg-[#c5c8d4]",
        destructive:
          "border-transparent bg-[#dc3545] text-white hover:bg-[#c82333]",
        outline: "text-[#2D3142] border-[#c5c8d4] hover:bg-[#ecedf1] hover:border-[#2D3142]",
        success:
          "border-transparent bg-[#28a745] text-white hover:bg-[#218838]",
        warning:
          "border-transparent bg-[#ffc107] text-[#2D3142] hover:bg-[#e0a800]",
        info:
          "border-transparent bg-[#EF8354] text-white hover:bg-[#d96a3f]",
        accent:
          "border-transparent bg-[#EF8354] text-white hover:bg-[#d96a3f]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
