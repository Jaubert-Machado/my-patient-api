import fastifyCookie from '@fastify/cookie'
import fp from 'fastify-plugin'
import type { FastifyInstance } from 'fastify'

export const cookiePlugin = fp(async function (app: FastifyInstance) {
  await app.register(fastifyCookie)
})
