import { forwardRef } from 'react'
import { cn } from '@/lib/utils'
import Chat from '@/components/Chat'

interface HomePageClassNames {
  root?: string
}

export interface HomePageProps {
  className?: string
  classNames?: HomePageClassNames
}

/**
 * 首页（`/`）。
 * 组装核心 Chat 对话组件。
 */
const HomePage = forwardRef<HTMLDivElement, HomePageProps>(
  ({ className, classNames }, ref) => (
    <div ref={ref} className={cn('h-full', classNames?.root, className)}>
      <Chat />
    </div>
  ),
)

HomePage.displayName = 'HomePage'
export default HomePage
