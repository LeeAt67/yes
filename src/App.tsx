import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { StoreContext, rootStore } from '@/stores'
import Layout from '@/components/Layout'
import HomePage from '@/pages/HomePage'
import AboutPage from '@/pages/AboutPage'

/**
 * App — 应用根组件
 *
 * 职责：
 * 1. StoreContext.Provider — 注入 MobX 全局状态
 * 2. BrowserRouter — 启用客户端路由
 * 3. Layout — 导航栏 + 页脚的公共布局壳
 * 4. Routes  — 定义页面路由映射
 */
function App() {
  return (
    <StoreContext.Provider value={rootStore}>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<HomePage />} />
            <Route path="about" element={<AboutPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </StoreContext.Provider>
  )
}

export default App
