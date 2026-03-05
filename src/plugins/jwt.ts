import fastifyJwt from '@fastify/jwt'
import fp from 'fastify-plugin'
import type { FastifyInstance } from 'fastify'

export const jwtPlugin = fp(async function (app: FastifyInstance) {
  const secret = process.env.JWT_SECRET
  if (!secret) throw new Error('JWT_SECRET environment variable is required')

  await app.register(fastifyJwt, {
    secret,
    cookie: { cookieName: 'auth_token', signed: false },
  })
})
