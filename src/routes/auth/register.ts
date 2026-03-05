import bcrypt from 'bcryptjs'
import type { FastifyInstance } from 'fastify'
import type { RegisterRequest } from '../../types'
import { prisma } from '../../lib/prisma'

export async function registerRoute(app: FastifyInstance) {
  app.post<{ Body: RegisterRequest }>('/register', async (request, reply) => {
    const { email, password, name } = request.body

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return reply.status(409).send({ message: 'Email já está em uso' })
    }

    const hashed = await bcrypt.hash(password, 10)
    const user = await prisma.user.create({
      data: { email, password: hashed, name },
    })

    const token = app.jwt.sign({ sub: user.id, email: user.email, role: user.role })

    reply.setCookie('auth_token', token, {
      httpOnly: true,
      path: '/',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    })

    return reply.status(201).send({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    })
  })
}
