import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

const techStack = [
  { name: 'React 19', desc: '最新 React 版本，支持 Server Components' },
  { name: 'MobX 6', desc: '响应式状态管理，简洁高效' },
  { name: 'Tailwind CSS 3', desc: '原子化 CSS 框架，快速构建 UI' },
  { name: 'shadcn/ui', desc: '基于 Radix UI 的组件库，可复制可定制' },
  { name: 'Rspack 2', desc: 'Rust 驱动的 Web 打包工具，极速构建' },
  { name: 'React Router 7', desc: '声明式路由，支持嵌套 Layout' },
]

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <header className="mb-10 text-center space-y-3">
        <h1 className="text-3xl font-bold">关于此项目</h1>
        <p className="text-muted-foreground">
          这是一个现代化的 React 前端脚手架，集成常用技术栈
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        {techStack.map(({ name, desc }) => (
          <Card key={name}>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Badge variant="secondary">{name.split(' ')[0]}</Badge>
                {name}
              </CardTitle>
              <CardDescription>{desc}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="text-lg">项目结构</CardTitle>
          <CardDescription>采用的目录组织方式</CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="text-xs bg-muted p-4 rounded-lg overflow-x-auto">
{`src/
├── components/    # 组件（Layout, Counter, TodoList, ui/）
├── pages/         # 页面（HomePage, AboutPage）
├── stores/        # MobX 状态管理
├── lib/           # 工具函数
├── types/         # TypeScript 类型
├── App.tsx        # 根组件（Router + Provider）
├── main.tsx       # 入口文件
└── index.css      # 全局样式 + CSS 变量`}
          </pre>
        </CardContent>
      </Card>
    </div>
  )
}
