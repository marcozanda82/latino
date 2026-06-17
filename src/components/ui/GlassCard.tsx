import type { ReactNode } from 'react'

interface GlassCardProps {
  children: ReactNode
  className?: string
  as?: 'div' | 'section' | 'article'
}

export function GlassCard({
  children,
  className = '',
  as: Component = 'div',
}: GlassCardProps) {
  return (
    <Component className={`glass-card ${className}`.trim()}>{children}</Component>
  )
}
