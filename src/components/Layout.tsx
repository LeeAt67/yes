import { Link, Outlet, useLocation } from 'react-router-dom'
import { Home, Info, Puzzle, Sun, Moon, ChevronLeft, ChevronRight } from 'lucide-react'
import { useState, useEffect } from 'react'

const navLinks = [
  { to: '/', label: '首页', icon: Home },
  { to: '/about', label: '关于', icon: Info },
  { to: '/kui', label: 'KUI', icon: Puzzle },
]

export default function Layout() {
  const location = useLocation()
  const [dark, setDark] = useState(() =>
    document.documentElement.classList.contains('dark'),
  )
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
  }, [dark])

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* ===== Claude 风格左侧边栏 ===== */}
      <aside
        className={`flex shrink-0 flex-col border-r bg-muted/30 transition-all duration-200 ${
          collapsed ? 'w-14' : 'w-56'
        }`}
      >
        {/* Logo */}
        <div className="flex h-14 items-center gap-3 border-b px-3">
          <Link
            to="/"
            className="flex shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground h-7 w-7 text-xs font-bold"
          >
            R
          </Link>
          {!collapsed && (
            <Link to="/" className="font-semibold text-sm">
              React Scaffold
            </Link>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className={`ml-auto shrink-0 rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors ${
              collapsed ? 'ml-0' : ''
            }`}
            title={collapsed ? '展开侧栏' : '收起侧栏'}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </button>
        </div>

        {/* 导航菜单 */}
        <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {navLinks.map(({ to, label, icon: Icon }) => {
            const isActive = location.pathname === to
            return (
              <Link
                key={to}
                to={to}
                title={collapsed ? label : undefined}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                  isActive
                    ? 'bg-accent text-foreground font-medium'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                } ${collapsed ? 'justify-center px-0' : ''}`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {!collapsed && <span>{label}</span>}
              </Link>
            )
          })}
        </nav>

        {/* 底部：主题切换 */}
        <div className="border-t p-2">
          <button
            onClick={() => setDark(!dark)}
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors ${
              collapsed ? 'justify-center px-0' : ''
            }`}
            title={dark ? '切换亮色' : '切换暗色'}
          >
            {dark ? <Sun className="h-4 w-4 shrink-0" /> : <Moon className="h-4 w-4 shrink-0" />}
            {!collapsed && <span>{dark ? '亮色模式' : '暗色模式'}</span>}
          </button>
        </div>
      </aside>

      {/* ===== 右侧内容区 ===== */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  )
}
