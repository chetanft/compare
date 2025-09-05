/**
 * Legacy Bridge Components
 * 
 * This file provides backward-compatible wrappers for shadcn components
 * that match our existing component API while gradually migrating to shadcn.
 * 
 * This allows us to migrate components incrementally without breaking existing functionality.
 */

import React from 'react'
import { Button as ShadcnButton } from './button'
import { Input as ShadcnInput } from './input'
import { Card as ShadcnCard, CardContent, CardDescription, CardHeader, CardTitle } from './card'
import { Alert, AlertDescription } from './alert'
import { Badge as ShadcnBadge } from './badge'
import { cn } from '@/lib/utils'

// Legacy Button component that maps to shadcn Button
interface LegacyButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost'
  size?: 'sm' | 'default' | 'lg'
  children: React.ReactNode
}

export const LegacyButton: React.FC<LegacyButtonProps> = ({ 
  variant = 'default', 
  size = 'default',
  className,
  children,
  ...props 
}) => {
  // Map legacy variants to shadcn variants
  const shadcnVariant = variant === 'primary' ? 'default' : 
                       variant === 'secondary' ? 'secondary' : variant

  return (
    <ShadcnButton 
      variant={shadcnVariant as any}
      size={size}
      className={className}
      {...props}
    >
      {children}
    </ShadcnButton>
  )
}

// Legacy Input component that maps to shadcn Input
interface LegacyInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean
}

export const LegacyInput: React.FC<LegacyInputProps> = ({ 
  error, 
  className, 
  ...props 
}) => {
  return (
    <ShadcnInput 
      className={cn(
        error && "border-destructive focus-visible:ring-destructive",
        className
      )}
      {...props}
    />
  )
}

// Legacy Card component that maps to shadcn Card
interface LegacyCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string
  description?: string
  children: React.ReactNode
}

export const LegacyCard: React.FC<LegacyCardProps> = ({ 
  title, 
  description, 
  children, 
  className, 
  ...props 
}) => {
  return (
    <ShadcnCard className={className} {...props}>
      {(title || description) && (
        <CardHeader>
          {title && <CardTitle>{title}</CardTitle>}
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
      )}
      <CardContent className={title || description ? "pt-0" : undefined}>
        {children}
      </CardContent>
    </ShadcnCard>
  )
}

// Legacy Alert component wrapper
interface LegacyAlertProps extends React.HTMLAttributes<HTMLDivElement> {
  type?: 'success' | 'error' | 'warning' | 'info'
  message: string
}

export const LegacyAlert: React.FC<LegacyAlertProps> = ({ 
  type = 'info', 
  message, 
  className, 
  ...props 
}) => {
  const variant = type === 'error' ? 'destructive' : 'default'
  
  return (
    <Alert variant={variant} className={className} {...props}>
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  )
}

// Legacy Badge component wrapper
interface LegacyBadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline'
  children: React.ReactNode
}

export const LegacyBadge: React.FC<LegacyBadgeProps> = ({ 
  variant = 'default', 
  children, 
  className, 
  ...props 
}) => {
  return (
    <ShadcnBadge variant={variant} className={className} {...props}>
      {children}
    </ShadcnBadge>
  )
}
