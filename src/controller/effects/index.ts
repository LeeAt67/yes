/**
 * Controller 层副作用（骨架）。
 */

import { createLogger } from '@/utils/logger'

const logger = createLogger('controller:effects')

/** 初始化应用副作用 */
export const initApp = () => {
  logger.info('App initialized')
}
