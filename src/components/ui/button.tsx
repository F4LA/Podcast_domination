import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EF8354] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 disabled:hover:transform-none",
  {
    variants: {
      variant: {
        default:
          "bg-[#2D3142] text-white shadow hover:bg-[#1a1d26] hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0",
        destructive:
          "bg-[#dc3545] text-white shadow-sm hover:bg-[#c82333] hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0",
        outline:
          "border border-[#c5c8d4] bg-white shadow-sm hover:bg-[#ecedf1] hover:border-[#2D3142] hover:shadow-md hover:-translate-y-0.5 active:translate-y-0",
        secondary:
          "bg-[#ecedf1] text-[#2D3142] shadow-sm hover:bg-[#c5c8d4] hover:shadow-md hover:-translate-y-0.5 active:translate-y-0",
        ghost: "hover:bg-[#ecedf1] hover:text-[#2D3142]",
        link: "text-[#EF8354] underline-offset-4 hover:underline hover:text-[#d96a3f]",
        success:
          "bg-[#28a745] text-white shadow hover:bg-[#218838] hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0",
        warning:
          "bg-[#EF8354] text-white shadow hover:bg-[#d96a3f] hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0",
        accent:
          "bg-[#EF8354] text-white shadow hover:bg-[#d96a3f] hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8",
        xl: "h-12 rounded-lg px-10 text-base",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild, ...props }, ref) => {
    // asChild is destructured but not used - this component doesn't support Slot
    // It's kept in the interface for API compatibility
    void asChild;
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
