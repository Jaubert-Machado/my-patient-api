import bcrypt from 'bcryptjs'
import type { FastifyInstance } from 'fastify'
import type { LoginRequest } from '../../types'
import { prisma } from '../../lib/prisma'

export async function loginRoute(app: FastifyInstance) {
  app.post<{ Body: LoginRequest }>('/login', async (request, reply) => {
    const { email, password } = request.body

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      return reply.status(401).send({ message: 'Credenciais inválidas' })
    }

    const valid = await bcrypt.compare(password, user.password)
    if (!valid) {
      return reply.status(401).send({ message: 'Credenciais inválidas' })
    }

    const token = app.jwt.sign({ sub: user.id, email: user.email, role: user.role })

    return reply.status(200).send({
      token,
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
