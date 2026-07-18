/// <reference types="react" />

declare module '*.css' {
  const content: Record<string, string>
  export default content
}

declare module '*.svg' {
  import type { FC, SVGProps } from 'react'
  const Component: FC<SVGProps<SVGSVGElement>>
  export default Component
}

declare module '*.png' {
  const content: string
  export default content
}

declare module '*.jpg' {
  const content: string
  export default content
}
