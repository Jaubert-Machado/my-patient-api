import type { FastifyInstance, FastifyReply } from 'fastify'
import type { MessageParam } from '@anthropic-ai/sdk/resources/messages'
import type { JwtPayload } from '../../types'
import { generatePatientCase } from '../../agents/case-generator'
import { createPatientAgentStream, getPatientSystemPrompt } from '../../agents/patient'
import { createLabAgentStream, getLabSystemPrompt } from '../../agents/lab'
import { createPhysicalAgentStream, getPhysicalSystemPrompt } from '../../agents/physical'
import { createEvaluatorAgentStream } from '../../agents/evaluator'
import { prisma } from '../../lib/prisma'

interface PatientChatBody {
  caseId: string
  messages: MessageParam[]
}

interface EvaluateBody {
  patientMessages: MessageParam[]
  labMessages: MessageParam[]
  evaluatorMessages?: MessageParam[]
}

function setupSSE(reply: FastifyReply, corsOrigin: string) {
  reply.hijack()
  reply.raw.statusCode = 200
  reply.raw.setHeader('Content-Type', 'text/event-stream')
  reply.raw.setHeader('Cache-Control', 'no-cache')
  reply.raw.setHeader('Connection', 'keep-alive')
  reply.raw.setHeader('Access-Control-Allow-Origin', corsOrigin)
  reply.raw.setHeader('Access-Control-Allow-Credentials', 'true')
  return (data: object) => reply.raw.write(`data: ${JSON.stringify(data)}\n\n`)
}

type AgentStream = ReturnType<typeof createPatientAgentStream>

async function streamAgent(
  stream: AgentStream,
  send: (data: object) => void,
  app: FastifyInstance,
  reply: FastifyReply,
): Promise<string> {
  let fullText = ''
  try {
    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        fullText += event.delta.text
        send({ type: 'text', text: event.delta.text })
      }
      if (event.type === 'message_stop') {
        send({ type: 'done' })
      }
    }
  } catch (err) {
    app.log.error(err, 'agent stream error')
    send({ type: 'error', message: 'Falha no agente' })
  } finally {
    reply.raw.end()
  }
  return fullText
}

export async function agentRoutes(app: FastifyInstance) {
  const corsOrigin = process.env.CORS_ORIGIN ?? 'http://localhost:3000'

  app.post('/patient/init', async (request, reply) => {
    try {
      await request.jwtVerify()
    } catch {
      return reply.status(401).send({ message: 'Não autenticado' })
    }

    const { sub: userId } = request.user as JwtPayload

    try {
      const existing = await prisma.patientCase.findFirst({
        where: { userId, status: 'IN_PROGRESS' },
        orderBy: { createdAt: 'desc' },
      })

      if (existing) {
        return reply.send({
          caseId: existing.id,
          ficha: existing.ficha,
          patientMessages: existing.patientMessages,
          labMessages: existing.labMessages,
          physicalMessages: existing.physicalMessages,
          isResuming: true,
        })
      }

      const result = await generatePatientCase(userId)
      return reply.send({ ...result, patientMessages: [], isResuming: false })
    } catch (err) {
      app.log.error(err, 'patient init error')
      return reply.status(500).send({ message: 'Falha ao gerar caso clínico' })
    }
  })

  app.post<{ Body: { caseId: string } }>('/patient/complete', async (request, reply) => {
    try {
      await request.jwtVerify()
    } catch {
      return reply.status(401).send({ message: 'Não autenticado' })
    }

    const { sub: userId } = request.user as JwtPayload
    const { caseId } = request.body

    try {
      await prisma.patientCase.updateMany({
        where: { id: caseId, userId },
        data: { status: 'COMPLETED', completedAt: new Date() },
      })
      return reply.send({ ok: true })
    } catch (err) {
      app.log.error(err, 'patient complete error')
      return reply.status(500).send({ message: 'Falha ao finalizar caso' })
    }
  })

  app.post<{ Body: PatientChatBody }>('/patient', async (request, reply) => {
    try {
      await request.jwtVerify()
    } catch {
      return reply.status(401).send({ message: 'Não autenticado' })
    }

    const { sub: userId } = request.user as JwtPayload
    const { caseId, messages } = request.body

    let systemPrompt: string
    try {
      systemPrompt = await getPatientSystemPrompt(caseId, userId)
    } catch {
      return reply.status(404).send({ message: 'Caso clínico não encontrado' })
    }

    const send = setupSSE(reply, corsOrigin)
    const assistantText = await streamAgent(createPatientAgentStream(messages, systemPrompt), send, app, reply)

    try {
      const fullMessages = [...messages, { role: 'assistant', content: assistantText }]
      await prisma.patientCase.updateMany({
        where: { id: caseId, userId },
        data: { patientMessages: fullMessages as object[] },
      })
    } catch (err) {
      app.log.error(err, 'patient messages save error')
    }
  })

  app.post<{ Body: { caseId: string; messages: MessageParam[] } }>('/lab', async (request, reply) => {
    try {
      await request.jwtVerify()
    } catch {
      return reply.status(401).send({ message: 'Não autenticado' })
    }

    const { sub: userId } = request.user as JwtPayload
    const { caseId, messages } = request.body

    let systemPrompt: string
    try {
      systemPrompt = await getLabSystemPrompt(caseId, userId)
    } catch {
      return reply.status(404).send({ message: 'Caso clínico não encontrado' })
    }

    const send = setupSSE(reply, corsOrigin)
    const assistantText = await streamAgent(createLabAgentStream(messages, systemPrompt), send, app, reply)

    try {
      const fullMessages = [...messages, { role: 'assistant', content: assistantText }]
      await prisma.patientCase.updateMany({
        where: { id: caseId, userId },
        data: { labMessages: fullMessages as object[] },
      })
    } catch (err) {
      app.log.error(err, 'lab messages save error')
    }
  })

  app.post<{ Body: { caseId: string; messages: MessageParam[] } }>('/physical', async (request, reply) => {
    try {
      await request.jwtVerify()
    } catch {
      return reply.status(401).send({ message: 'Não autenticado' })
    }

    const { sub: userId } = request.user as JwtPayload
    const { caseId, messages } = request.body

    let systemPrompt: string
    try {
      systemPrompt = await getPhysicalSystemPrompt(caseId, userId)
    } catch {
      return reply.status(404).send({ message: 'Caso clínico não encontrado' })
    }

    const send = setupSSE(reply, corsOrigin)
    const assistantText = await streamAgent(createPhysicalAgentStream(messages, systemPrompt), send, app, reply)

    try {
      const fullMessages = [...messages, { role: 'assistant', content: assistantText }]
      await prisma.patientCase.updateMany({
        where: { id: caseId, userId },
        data: { physicalMessages: fullMessages as object[] },
      })
    } catch (err) {
      app.log.error(err, 'physical messages save error')
    }
  })

  app.post<{ Body: EvaluateBody }>('/evaluate', async (request, reply) => {
    try {
      await request.jwtVerify()
    } catch {
      return reply.status(401).send({ message: 'Não autenticado' })
    }

    const { patientMessages, labMessages, evaluatorMessages = [] } = request.body

    const contextMessage: MessageParam = {
      role: 'user',
      content: `Histórico da consulta:\n\n## Chat com o Paciente\n${JSON.stringify(patientMessages, null, 2)}\n\n## Exames Solicitados ao Laboratório\n${JSON.stringify(labMessages, null, 2)}`,
    }

    const messages: MessageParam[] =
      evaluatorMessages.length > 0 ? evaluatorMessages : [contextMessage]

    const send = setupSSE(reply, corsOrigin)
    await streamAgent(createEvaluatorAgentStream(messages), send, app, reply)
  })
}
