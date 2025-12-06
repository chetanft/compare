import React from 'react'
import { motion } from 'framer-motion'
import { GlassCard } from '@/components/ui/GlassCard'
import { CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface StatCardProps {
    label: string
    value: string | number
    subValue?: string
    icon?: React.ElementType
    trend?: 'up' | 'down' | 'neutral'
    color?: string
    delay?: number
}

const StatCard: React.FC<StatCardProps> = ({
    label,
    value,
    subValue,
    icon: Icon,
    color = "text-primary",
    delay = 0
}) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay }}
        >
            <GlassCard className="h-full overflow-hidden relative group">
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                    {Icon && <Icon className="w-16 h-16" />}
                </div>
                <CardContent className="p-6 flex flex-col items-center justify-center text-center h-full relative z-10">
                    <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-2">{label}</p>
                    <div className={cn("text-4xl font-bold tracking-tight mb-1", color)}>
                        {value}
                    </div>
                    {subValue && (
                        <p className="text-xs text-muted-foreground/80 font-medium">{subValue}</p>
                    )}
                </CardContent>
            </GlassCard>
        </motion.div>
    )
}

interface SummaryStatsProps {
    figmaCount: number
    webCount: number
    matches: number
    deviations: number
    matchPercentage: number
}

export const SummaryStats: React.FC<SummaryStatsProps> = ({
    figmaCount,
    webCount,
    matches,
    deviations,
    matchPercentage
}) => {
    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <StatCard
                label="Figma Nodes"
                value={figmaCount}
                subValue="Design Elements"
                color="text-blue-500"
                delay={0.1}
            />
            <StatCard
                label="Web Elements"
                value={webCount}
                subValue="DOM Nodes"
                color="text-indigo-500"
                delay={0.2}
            />
            <StatCard
                label="Match Rate"
                value={`${matchPercentage}%`}
                subValue={`${matches} Matched`}
                color={matchPercentage > 80 ? "text-emerald-500" : matchPercentage > 50 ? "text-amber-500" : "text-rose-500"}
                delay={0.3}
            />
            <StatCard
                label="Deviations"
                value={deviations}
                subValue="Issues Found"
                color="text-rose-500"
                delay={0.4}
            />
        </div>
    )
}
