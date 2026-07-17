import { type RouteObject } from 'react-router-dom'

/**
 * 路由定义与导航守卫
 */
import { createLogger } from '@/utils/logger'

const logger = createLogger('route')

// 页面组件
import ClawPage from '@/pages/Claw'
import HomePage from '@/pages/Home'
import ComponentPreviewPage from '@/pages/ComponentPreview'
import Layout from '@/components/Layout'

/** 路由配置数组 */
const routes: RouteObject[] = [
  {
    element: <Layout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'claw', element: <ClawPage /> },
      { path: 'components', element: <ComponentPreviewPage /> },
    ],
  },
]

/** 导航守卫 — 记录路由变更 */
export const beforeRouteChange = (to: string) => {
  logger.debug('Route changing to:', to)
}

export default routes
