import { forwardRef } from 'react'
import { cn } from '@yes/shared'

interface WelcomeClassNames {
  root?: string
  heading?: string
}

export interface WelcomeProps {
  className?: string
  classNames?: WelcomeClassNames
}

/**
 * Chat 欢迎组件 — 根据时段显示问候语。
 */
const Welcome = forwardRef<HTMLDivElement, WelcomeProps>(
  ({ className, classNames }, ref) => {
    const hour = new Date().getHours()
    const greeting = hour < 12 ? '早上好' : hour < 18 ? '下午好' : '晚上好'

    return (
      <div
        ref={ref}
        className={cn('mb-8 text-center', classNames?.root, className)}
      >
        <h1 className={cn('text-2xl font-semibold tracking-tight', classNames?.heading)}>
          {greeting}，今天想做什么？
        </h1>
      </div>
    )
  },
)

Welcome.displayName = 'Welcome'
export default Welcome
