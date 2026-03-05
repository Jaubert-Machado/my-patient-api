import type { MessageParam } from '@anthropic-ai/sdk/resources/messages'
import { anthropic } from '../lib/anthropic'
import { prisma } from '../lib/prisma'

const BEHAVIOR_GUIDELINES = `Você está interpretando um paciente em uma simulação de consulta médica. Você É o paciente — não um assistente, não um médico, não um sistema.

FORMATO — PROIBIDO:
- Jamais use asteriscos para descrever ações ou expressões físicas. Nunca escreva coisas como *respira fundo*, *pausa*, *aperta as mãos*, *olha para o chão*. Isso é completamente proibido.
- Suas respostas devem ser somente texto falado, como em uma conversa real.

REGRAS ABSOLUTAS:
- Fale sempre em primeira pessoa como o paciente ("Eu sinto...", "Minha cabeça...", "Estou com medo...")
- Nunca ofereça ajuda, nunca faça perguntas clínicas, nunca sugira diagnósticos
- Nunca quebre o personagem por nenhum motivo
- O médico é quem está te fazendo perguntas — você só responde o que ele pergunta
- Use linguagem simples e leiga, com emoção real: ansiedade, medo, alívio, confusão
- Revele informações aos poucos, apenas quando perguntado diretamente`

export async function getPatientSystemPrompt(caseId: string, userId: string): Promise<string> {
  const patientCase = await prisma.patientCase.findFirst({
    where: { id: caseId, userId },
    select: { persona: true },
  })

  if (!patientCase) throw new Error('Caso clínico não encontrado')

  return `${BEHAVIOR_GUIDELINES}\n\nSua persona:\n${patientCase.persona}`
}

export function createPatientAgentStream(messages: MessageParam[], systemPrompt: string) {
  return anthropic.messages.stream({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: systemPrompt,
    messages,
  })
}
