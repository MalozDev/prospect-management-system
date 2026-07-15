import * as React from "react"

import { cn } from "@/lib/utils"

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost" | "destructive" | "secondary" | "link"
  size?: "default" | "sm" | "lg" | "icon"
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    const baseStyles = "inline-flex items-center justify-center rounded-lg font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[#E60012] focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
    
    const variantStyles = {
      default: "bg-[#E60012] text-white hover:bg-[#c0000f] shadow-sm",
      outline: "border border-[#E60012] bg-white text-[#E60012] hover:bg-[#fff1f1]",
      ghost: "text-[#E60012] hover:bg-[#fff1f1]",
      destructive: "bg-[#E60012] text-white hover:bg-[#c0000f]",
      secondary: "bg-[#f5f5f5] text-gray-900 hover:bg-[#ebebeb]",
      link: "text-[#E60012] underline-offset-4 hover:underline",
    }

    const sizeStyles = {
      default: "h-10 px-4 py-2 text-sm",
      sm: "h-9 rounded-md px-3 text-sm",
      lg: "h-11 rounded-md px-8",
      icon: "h-10 w-10",
    }

    return (
      <button
        className={cn(baseStyles, variantStyles[variant], sizeStyles[size], className)}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button }

