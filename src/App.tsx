import { HashRouter, useRoutes } from 'react-router-dom'
import { useEffect } from 'react'
import routes, { beforeRouteChange } from '@/route'
import { initApp } from '@/controller/effects'

/**
 * 路由渲染组件 — 使用 useRoutes() 将数组配置转为路由树。
 */
const AppRoutes = () => {
  const element = useRoutes(routes)

  useEffect(() => {
    beforeRouteChange(window.location.hash)
  }, [])

  return element
}

/**
 * App — 应用根组件。
 *
 * 职责：
 * 1. HashRouter — 客户端路由
 * 2. AppRoutes — 渲染路由树（配置来自 src/route/）
 * 3. 初始化副作用
 */
const App = () => {
  useEffect(() => {
    initApp()
  }, [])

  return (
    <HashRouter>
      <AppRoutes />
    </HashRouter>
  )
}

export default App
