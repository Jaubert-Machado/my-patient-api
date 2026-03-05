import type { MessageParam } from '@anthropic-ai/sdk/resources/messages'
import { anthropic } from '../lib/anthropic'

const SYSTEM_PROMPT =
  'Você é um assistente clínico especializado em saúde. Responda de forma clara, objetiva e em português.'

export function createGeneralAgentStream(messages: MessageParam[], system?: string) {
  return anthropic.messages.stream({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    system: system ?? SYSTEM_PROMPT,
    messages,
  })
}
