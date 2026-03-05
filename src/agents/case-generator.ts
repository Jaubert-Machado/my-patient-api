import { anthropic } from '../lib/anthropic'
import { prisma } from '../lib/prisma'

const GENERATION_PROMPT = `Crie um caso clínico aleatório e realista para treinamento médico. Seja muito criativo e varie ao máximo — diferentes idades (18-80), gêneros, profissões, classes sociais, queixas (não só dor no peito), gravidades e contextos. Evite casos genéricos ou repetitivos.

Retorne APENAS um JSON válido com esta estrutura exata, sem markdown, sem explicações:

{
  "ficha": {
    "nome": "nome completo",
    "idade": número,
    "profissao": "profissão",
    "queixa_principal": "frase curta, máx 6 palavras",
    "tempo_sintomas": "ex: 2 horas, desde ontem, há 3 dias",
    "contexto": "1-2 frases de triagem que o médico veria ao entrar na sala"
  },
  "persona": "Escreva em primeira pessoa como SE VOCÊ FOSSE o paciente. Comece com 'Meu nome é [nome]...'. Descreva: sua personalidade e como você está se sentindo agora emocionalmente, seus sintomas exatos com todas as características (localização, irradiação, intensidade, caráter, fatores de melhora e piora, sintomas associados), seu histórico médico prévio, medicamentos que usa, histórico familiar relevante, hábitos de vida. Inclua segredos ou informações que você só revelaria se o médico perguntasse diretamente."
}`

export interface PatientFicha {
  nome: string
  idade: number
  profissao: string
  queixa_principal: string
  tempo_sintomas: string
  contexto: string
}

interface GeneratedCase {
  ficha: PatientFicha
  persona: string
}

export async function generatePatientCase(userId: string): Promise<{
  caseId: string
  ficha: PatientFicha
}> {
  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1500,
    messages: [{ role: 'user', content: GENERATION_PROMPT }],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : ''
  const jsonMatch = text.match(/\{[\s\S]*}/)
  if (!jsonMatch) throw new Error('Falha ao gerar caso clínico')

  const generated: GeneratedCase = JSON.parse(jsonMatch[0])

  const patientCase = await prisma.patientCase.create({
    data: {
      userId,
      ficha: generated.ficha as object,
      persona: generated.persona,
    },
  })

  return { caseId: patientCase.id, ficha: generated.ficha }
}
