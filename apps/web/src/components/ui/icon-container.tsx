import * as React from "react"
import { cn } from "@/lib/utils"

interface IconContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "md" | "lg"
  variant?: "default" | "primary" | "secondary" | "destructive"
}

const sizeClasses = {
  sm: "h-8 w-8",
  md: "h-10 w-10",
  lg: "h-12 w-12",
}

const variantClasses = {
  default: "bg-muted text-foreground",
  primary: "bg-primary text-primary-foreground",
  secondary: "bg-secondary text-secondary-foreground",
  destructive: "bg-destructive text-destructive-foreground",
}

export const IconContainer = React.forwardRef<
  HTMLDivElement,
  IconContainerProps
>(({ className, size = "md", variant = "default", ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "inline-flex items-center justify-center rounded-lg",
      sizeClasses[size],
      variantClasses[variant],
      className
    )}
    {...props}
  />
))
IconContainer.displayName = "IconContainer"

export default IconContainer
