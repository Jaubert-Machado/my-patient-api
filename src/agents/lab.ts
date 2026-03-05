import type { MessageParam } from '@anthropic-ai/sdk/resources/messages'
import { anthropic } from '../lib/anthropic'
import { prisma } from '../lib/prisma'
import type { PatientFicha } from './case-generator'

const BASE_PROMPT = `Você é um sistema de laboratório clínico simulado para fins de treinamento médico.

Retorne APENAS uma lista de resultados, um por linha, usando exatamente este formato:
- Nome do Exame: valor encontrado (referência: valor de referência)

Regras:
- Nunca retorne resultados alterados que não reflitam o caso proposto
- Caso o exame solicitado seja físico (ausculta, palpação, percussão, inspeção etc.), retorne apenas: "Exame físico não é realizado por este sistema"
- O paciente deve ser biologicamente capaz de realizar o exame solicitado (ex: mulher não realiza espermograma)
- Cada resultado em uma linha separada, começando com "- "
- Sem cabeçalhos, sem datas, sem comentários, sem diagnósticos
- Os resultados devem ser coerentes com o quadro clínico do paciente descrito abaixo
- Se o exame não for relevante para o caso, retorne resultado dentro da normalidade
- Seja objetivo e técnico como um laudo laboratorial real`

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
    max_tokens: 600,
    system: systemPrompt,
    messages,
  })
}
