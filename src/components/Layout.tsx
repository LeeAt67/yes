import { Link, Outlet, useLocation } from 'react-router-dom'
import { Home, Info, Sun, Moon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useState, useEffect } from 'react'

const navLinks = [
  { to: '/', label: '首页', icon: Home },
  { to: '/about', label: '关于', icon: Info },
]

export default function Layout() {
  const location = useLocation()
  const [dark, setDark] = useState(() => {
    return document.documentElement.classList.contains('dark')
  })

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
  }, [dark])

  return (
    <div className="min-h-screen flex flex-col">
      {/* 导航栏 */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 font-semibold text-lg">
            <Badge className="text-xs">R19</Badge>
            <span className="bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
              React Scaffold
            </span>
          </Link>

          {/* 导航链接 */}
          <nav className="flex items-center gap-1">
            {navLinks.map(({ to, label, icon: Icon }) => {
              const isActive = location.pathname === to
              return (
                <Button
                  key={to}
                  variant={isActive ? 'secondary' : 'ghost'}
                  size="sm"
                  asChild
                >
                  <Link to={to}>
                    <Icon className="mr-1 h-4 w-4" />
                    {label}
                  </Link>
                </Button>
              )
            })}

            {/* 主题切换 */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setDark(!dark)}
              className="ml-2"
              title={dark ? '切换亮色模式' : '切换暗色模式'}
            >
              {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
          </nav>
        </div>
      </header>

      {/* 页面内容 */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* 页脚 */}
      <footer className="border-t py-6 text-center text-xs text-muted-foreground">
        <p>
          React 19 · MobX 6 · shadcn/ui · Tailwind CSS · Rspack 2 · React Router
        </p>
      </footer>
    </div>
  )
}
