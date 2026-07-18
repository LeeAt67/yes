import { z } from 'zod'

export const loginSchema = z.object({
  username: z.string(),
  password: z.string(),
})

export type LoginDto = z.infer<typeof loginSchema>

export const refreshSchema = z.object({
  refreshToken: z.string(),
})

export type RefreshDto = z.infer<typeof refreshSchema>
