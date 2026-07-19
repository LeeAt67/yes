import React, { useEffect, useRef } from 'react'
import { cn, createLogger } from '@yes/shared'

const logger = createLogger('call:audio-visualizer')

/**
 * AudioVisualizer — 音频波形动画组件。
 *
 * 使用 Canvas 绘制模拟声波动画，增加通话氛围感。
 * 无需真实音频数据，纯 CSS 动画实现。
 */
export interface AudioVisualizerProps {
  barCount?: number
  className?: string
}

const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
  barCount = 5,
  className,
}) => {
  return (
    <div className={cn('flex items-center justify-center gap-1', className)}>
      {Array.from({ length: barCount }).map((_, i) => (
        <div
          key={i}
          className={cn(
            'h-6 w-1 rounded-full bg-blue-400',
          )}
          style={{
            animation: `audio-wave ${0.8 + i * 0.15}s ease-in-out infinite`,
            animationDelay: `${i * 0.12}s`,
          }}
        />
      ))}
      {/* 内联关键帧动画 */}
      <style>{`
        @keyframes audio-wave {
          0%, 100% { height: 0.25rem; opacity: 0.4; }
          50% { height: 1.5rem; opacity: 1; }
        }
      `}</style>
    </div>
  )
}

AudioVisualizer.displayName = 'AudioVisualizer'
export default AudioVisualizer
