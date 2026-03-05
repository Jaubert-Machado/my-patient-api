import type { MessageParam } from '@anthropic-ai/sdk/resources/messages'
import { anthropic } from '../lib/anthropic'
import { prisma } from '../lib/prisma'
import type { PatientFicha } from './case-generator'

const BASE_PROMPT = `Você é um sistema de laboratório clínico simulado para fins de treinamento médico.

Retorne APENAS uma lista de resultados, um por linha, usando exatamente este formato:
- Nome do Exame: valor encontrado (referência: valor de referência)

Regras:
- Cada exame em uma linha separada, começando com "- "
- Sem cabeçalhos, sem datas, sem comentários, sem diagnósticos
- Os resultados devem ser coerentes com o quadro clínico do paciente descrito abaixo
- Se o exame não for relevante, retorne resultado dentro da normalidade
- Seja objetivo e técnico como um laudo real`

export async function getLabSystemPrompt(caseId: string, userId: string): Promise<string> {
  const patientCase = await prisma.patientCase.findFirst({
    where: { id: caseId, userId },
    select: { ficha: true },
  })

  if (!patientCase) throw new Error('Caso clínico não encontrado')

  const ficha = patientCase.ficha as unknown as PatientFicha
  const context = `\n\nContexto do paciente:\nNome: ${ficha.nome}, ${ficha.idade} anos, ${ficha.profissao}\nQueixa: ${ficha.queixa_principal} (${ficha.tempo_sintomas})\n${ficha.contexto}`

  return BASE_PROMPT + context
}

export function createLabAgentStream(messages: MessageParam[], systemPrompt: string) {
  return anthropic.messages.stream({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    system: systemPrompt,
    messages,
  })
}
