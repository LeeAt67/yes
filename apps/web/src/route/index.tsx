import { type RouteObject, Navigate } from 'react-router-dom'

/**
 * 路由定义与导航守卫
 */
import { createLogger } from '@yes/shared'

const logger = createLogger('route')

// 页面组件
import ClawPage from '@/pages/Claw'
import HomePage from '@/pages/Home'
import LoginPage from '@/pages/Login'
import RegisterPage from '@/pages/Register'
import ComponentPreviewPage from '@/pages/ComponentPreview'
import CallPage from '@/pages/Call'
import Layout from '@/components/Layout'
import AuthGuard from '@/components/AuthGuard'

/** 路由配置数组 */
const routes: RouteObject[] = [
  {
    element: <AuthGuard />,
    children: [
      {
        element: <Layout />,
        children: [
          { index: true, element: <HomePage /> },
          { path: 'claw', element: <ClawPage /> },
          { path: 'components', element: <ComponentPreviewPage /> },
        ],
      },
      // 全屏通话页（不使用 Layout）
      { path: 'call', element: <CallPage /> },
      // AuthGuard 内的兜底：已登录 → 重定向首页
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
  // 未登录时的兜底：任意未知路径 → 登录页
  { path: '*', element: <Navigate to="/login" replace /> },
  { path: 'login', element: <LoginPage /> },
  { path: 'register', element: <RegisterPage /> },
]

/** 导航守卫 �?记录路由变更 */
export const beforeRouteChange = (to: string) => {
  logger.debug('Route changing to:', to)
}

export default routes
