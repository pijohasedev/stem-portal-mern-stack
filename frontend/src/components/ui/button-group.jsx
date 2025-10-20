import { cn } from "@/lib/utils"
import * as React from "react"

const ButtonGroup = React.forwardRef(({ className, ...props }, ref) => (
    <div
        ref={ref}
        className={cn(
            "inline-flex items-center justify-center rounded-md border bg-card text-sm font-medium",
            className
        )}
        {...props}
    />
))
ButtonGroup.displayName = "ButtonGroup"

const ButtonGroupSeparator = React.forwardRef(({ className, ...props }, ref) => (
    <div
        ref={ref}
        className={cn("-mx-px h-6 w-px bg-border", className)}
        {...props}
    />
))
ButtonGroupSeparator.displayName = "ButtonGroupSeparator"

export { ButtonGroup, ButtonGroupSeparator }
