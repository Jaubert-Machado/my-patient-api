import type { FastifyInstance, FastifyReply } from 'fastify'
import type { MessageParam } from '@anthropic-ai/sdk/resources/messages'
import { createPatientAgentStream, generatePatientCase } from '../../agents/patient'
import { createLabAgentStream } from '../../agents/lab'
import { createEvaluatorAgentStream } from '../../agents/evaluator'

interface ChatBody {
  messages: MessageParam[]
  systemPrompt?: string
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
) {
  try {
    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
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
}

export async function agentRoutes(app: FastifyInstance) {
  const corsOrigin = process.env.CORS_ORIGIN ?? 'http://localhost:3000'

  app.post('/patient/init', async (request, reply) => {
    try {
      await request.jwtVerify()
    } catch {
      return reply.status(401).send({ message: 'Não autenticado' })
    }

    try {
      const result = await generatePatientCase()
      return reply.send(result)
    } catch (err) {
      app.log.error(err, 'patient init error')
      return reply.status(500).send({ message: 'Falha ao gerar caso clínico' })
    }
  })

  app.post<{ Body: ChatBody }>('/patient', async (request, reply) => {
    try {
      await request.jwtVerify()
    } catch {
      return reply.status(401).send({ message: 'Não autenticado' })
    }
    const { messages, systemPrompt } = request.body
    if (!systemPrompt) {
      return reply.status(400).send({ message: 'systemPrompt é obrigatório' })
    }
    const send = setupSSE(reply, corsOrigin)
    await streamAgent(createPatientAgentStream(messages, systemPrompt), send, app, reply)
  })

  app.post<{ Body: ChatBody }>('/lab', async (request, reply) => {
    try {
      await request.jwtVerify()
    } catch {
      return reply.status(401).send({ message: 'Não autenticado' })
    }
    const send = setupSSE(reply, corsOrigin)
    await streamAgent(createLabAgentStream(request.body.messages), send, app, reply)
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
