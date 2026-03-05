import cors from '@fastify/cors'
import fp from 'fastify-plugin'
import type { FastifyInstance } from 'fastify'

export const corsPlugin = fp(async function (app: FastifyInstance) {
  await app.register(cors, {
    origin: process.env.CORS_ORIGIN?.split(',').map(o => o.trim()) ?? ['http://localhost:3000'],
    credentials: true,
  })
})
