import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import Counter from '@/components/Counter'
import TodoList from '@/components/TodoList'
import { ArrowRight, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function HomePage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      {/* Header */}
      <header className="mb-10 text-center space-y-3">
        <h1 className="bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-3xl font-bold text-transparent">
          React 19 + MobX + Tailwind CSS
        </h1>
        <div className="flex items-center justify-center gap-2 flex-wrap">
          <Badge>shadcn/ui</Badge>
          <Badge variant="secondary">Rspack 2</Badge>
          <Badge variant="outline">SWC</Badge>
          <Badge>Router</Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          前端脚手架 — 集成 shadcn/ui 组件库 + 路由系统
        </p>
      </header>

      {/* Demo 组件 */}
      <div className="space-y-6">
        <Counter />
        <TodoList />

        {/* 对话框示例 */}
        <div className="flex justify-center gap-3 flex-wrap">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Sparkles className="mr-1 h-4 w-4" />
                打开对话框
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>shadcn/ui 对话框</DialogTitle>
                <DialogDescription>
                  所有样式基于 CSS 变量主题，支持 dark mode。
                </DialogDescription>
              </DialogHeader>
              <div className="text-sm text-muted-foreground space-y-2">
                <p><strong className="text-foreground">构建工具：</strong>Rspack 2 + SWC</p>
                <p><strong className="text-foreground">组件库：</strong>shadcn/ui（Radix UI）</p>
                <p><strong className="text-foreground">路由：</strong>React Router v7</p>
              </div>
            </DialogContent>
          </Dialog>

          <Button asChild variant="ghost">
            <Link to="/about">
              了解更多
              <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
