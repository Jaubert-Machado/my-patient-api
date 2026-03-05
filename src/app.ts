import Fastify from 'fastify'
import { corsPlugin } from './plugins/cors'
import { cookiePlugin } from './plugins/cookie'
import { jwtPlugin } from './plugins/jwt'
import { healthRoutes } from './routes/health'
import { authRoutes } from './routes/auth'
import { agentRoutes } from './routes/agents'

export async function buildApp() {
  const app = Fastify({
    logger: {
      transport: process.env.NODE_ENV === 'development' ? { target: 'pino-pretty' } : undefined,
    },
  })

  await app.register(corsPlugin)
  await app.register(cookiePlugin)
  await app.register(jwtPlugin)

  await app.register(healthRoutes)
  await app.register(authRoutes, { prefix: '/auth' })
  await app.register(agentRoutes, { prefix: '/agents' })

  return app
}
