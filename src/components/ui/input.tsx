import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-9 w-full rounded-md border border-[#c5c8d4] bg-white px-3 py-1 text-sm shadow-sm transition-all duration-200 file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-[#5d637e]/50 hover:border-[#EF8354] focus:outline-none focus:ring-2 focus:ring-[#EF8354]/20 focus:border-[#EF8354] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-[#c5c8d4]",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
