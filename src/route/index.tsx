import { type RouteObject } from 'react-router-dom'

/**
 * 路由定义与导航守卫
 */
import { createLogger } from '@/utils/logger'

const logger = createLogger('route')

// 页面组件
import Layout from '@/components/Layout'
import HomePage from '@/pages/HomePage'
import AboutPage from '@/pages/AboutPage'
import ChatInputDemo from '@/pages/ChatInputDemo'

/** 路由配置数组 */
const routes: RouteObject[] = [
  {
    element: <Layout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'about', element: <AboutPage /> },
      { path: 'kui', element: <ChatInputDemo /> },
    ],
  },
]

/** 导航守卫 — 记录路由变更 */
export const beforeRouteChange = (to: string) => {
  logger.debug('Route changing to:', to)
}

export default routes
