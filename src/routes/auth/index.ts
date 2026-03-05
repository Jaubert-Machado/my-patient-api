import type { FastifyInstance } from 'fastify'
import { registerRoute } from './register'
import { loginRoute } from './login'

export async function authRoutes(app: FastifyInstance) {
  await app.register(registerRoute)
  await app.register(loginRoute)
}
