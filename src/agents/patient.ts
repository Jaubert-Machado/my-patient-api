import type { MessageParam } from '@anthropic-ai/sdk/resources/messages'
import { anthropic } from '../lib/anthropic'

const BEHAVIOR_GUIDELINES = `Você é um paciente simulado para fins de treinamento médico. Seu papel é interpretar um paciente de forma realista e consistente durante toda a consulta.

Diretrizes:
- Responda apenas como o paciente, nunca quebre o personagem
- Use linguagem leiga, não médica
- Demonstre emoções adequadas (ansiedade, alívio, confusão, medo)
- Mantenha consistência absoluta com os sintomas e história relatados
- Só revele informações quando perguntado diretamente — não voluntarie tudo de uma vez
- Se perguntado algo fora do escopo do paciente (ex: diagnóstico), responda que não sabe
- Varie o nível de cooperação: alguns pacientes são ansiosos e falam muito, outros são reservados`

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
  "persona": "Descrição detalhada em português para o agente interpretar este paciente: quem é a pessoa, personalidade, como se sente emocionalmente agora, sintomas com todas as características clínicas (localização, irradiação, intensidade, caráter, fatores de melhora e piora, sintomas associados), histórico médico prévio, medicamentos em uso, histórico familiar relevante, hábitos de vida. Inclua também informações que o paciente só revelaria se perguntado diretamente."
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

export async function generatePatientCase(): Promise<{
  ficha: PatientFicha
  systemPrompt: string
}> {
  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1500,
    messages: [{ role: 'user', content: GENERATION_PROMPT }],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : ''
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('Falha ao gerar caso clínico')

  const generated: GeneratedCase = JSON.parse(jsonMatch[0])
  const systemPrompt = `${BEHAVIOR_GUIDELINES}\n\nSua persona:\n${generated.persona}`

  return { ficha: generated.ficha, systemPrompt }
}

export function createPatientAgentStream(messages: MessageParam[], systemPrompt: string) {
  return anthropic.messages.stream({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: systemPrompt,
    messages,
  })
}
