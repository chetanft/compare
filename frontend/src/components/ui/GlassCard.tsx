import { cn } from "@/lib/utils"
import React from "react"

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode
    variant?: "default" | "dark" | "flat"
    hoverEffect?: boolean
}

const GlassCard = React.forwardRef<HTMLDivElement, GlassCardProps>(
    ({ className, children, variant = "default", hoverEffect = true, ...props }, ref) => {
        return (
            <div
                ref={ref}
                className={cn(
                    "rounded-xl border transition-all duration-300",
                    {
                        "bg-card/50 backdrop-blur-md border-border shadow-sm": variant === "default",
                        "bg-card/80 backdrop-blur-xl border-border shadow-md": variant === "dark",
                        "bg-card border-border shadow-none": variant === "flat",
                        "hover:shadow-md hover:bg-card/80 hover:border-foreground/20": hoverEffect,
                        "shadow-sm": !hoverEffect,
                    },
                    className
                )}
                {...props}
            >
                {children}
            </div>
        )
    }
)
GlassCard.displayName = "GlassCard"

export { GlassCard }

export function GlassHeader({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div className={cn("p-6 border-b border-border/40", className)} {...props}>
            {children}
        </div>
    )
}

export function GlassContent({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div className={cn("p-6", className)} {...props}>
            {children}
        </div>
    )
}

export function GlassFooter({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div className={cn("p-6 border-t border-border/40 bg-muted/20", className)} {...props}>
            {children}
        </div>
    )
}
