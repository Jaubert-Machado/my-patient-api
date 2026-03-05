import type { MessageParam } from '@anthropic-ai/sdk/resources/messages'
import { anthropic } from '../lib/anthropic'
import { prisma } from '../lib/prisma'
import type { PatientFicha } from './case-generator'

const BASE_PROMPT = `Você é um sistema de exame físico simulado para fins de treinamento médico.

Retorne APENAS uma lista de achados, um por linha, usando exatamente este formato:
- Manobra/Sinal: achado encontrado

Regras:
- Nunca retorne resultados alterados que não reflitam o caso proposto
- Caso o exame solicitado seja laboratorial (hemograma, troponina, glicemia etc.), retorne apenas: "Exame laboratorial não é realizado por este sistema"
- O paciente deve ser clinicamente capaz de realizar a manobra solicitada (ex: paciente inconsciente não coopera com manobras que exijam resposta ativa)
- Cada achado em uma linha separada, começando com "- "
- Sem cabeçalhos, sem datas, sem comentários, sem diagnósticos
- Os achados devem ser coerentes com o quadro clínico do paciente descrito abaixo
- Se a manobra não for relevante para o caso, retorne achado dentro da normalidade
- Seja objetivo e técnico como um registro de exame físico real
- Inclua valores numéricos quando aplicável (ex: PA, FC, FR, SpO2, temperatura)`

export async function getPhysicalSystemPrompt(caseId: string, userId: string): Promise<string> {
  const patientCase = await prisma.patientCase.findFirst({
    where: { id: caseId, userId },
    select: { ficha: true },
  })

  if (!patientCase) throw new Error('Caso clínico não encontrado')

  const ficha = patientCase.ficha as unknown as PatientFicha
  const context = `\n\nContexto do paciente:\nNome: ${ficha.nome}, ${ficha.idade} anos, ${ficha.profissao}\nQueixa: ${ficha.queixa_principal} (${ficha.tempo_sintomas})\n${ficha.contexto}`

  return BASE_PROMPT + context
}

export function createPhysicalAgentStream(messages: MessageParam[], systemPrompt: string) {
  return anthropic.messages.stream({
    model: 'claude-sonnet-4-6',
    max_tokens: 600,
    system: systemPrompt,
    messages,
  })
}
