'use client'

import { FormEvent, useMemo, useState } from 'react'

type Message = {
  role: 'user' | 'assistant'
  content: string
}

const suggestedQuestions = [
  'Quais são as habilidades mais fortes de backend do Fabio?',
  'Que tipo de trabalho de arquitetura o Fabio já liderou?',
  'Que experiência em cloud e plataforma o Fabio tem?',
  'Que tipo de posição o Fabio está buscando agora?',
  'Quais são algumas conquistas de carreira de destaque do Fabio?',
]

const fallbackAnswers: Record<string, string> = {
  'quais são as habilidades mais fortes de backend do fabio?':
    'Fabio é mais forte em Node.js, TypeScript, NestJS, design de sistemas distribuídos e arquitetura backend, com boas práticas de testes e manutenibilidade.',
  'que tipo de trabalho de arquitetura o fabio já liderou?':
    'Ele liderou transições de monólito para microservices, estratégias de staging multiambiente, arquitetura de storage orientada a compliance e iniciativas de modernização de plataforma.',
  'que experiência em cloud e plataforma o fabio tem?':
    'Fabio tem experiência prática com GCP, AWS, Cloudflare R2, pipelines de CI/CD, workloads containerizados e habilitação de plataforma entre times.',
  'que tipo de posição o fabio está buscando agora?':
    'Ele está focado em oportunidades de nível Senior/Staff em Engenharia de Plataforma, Arquitetura em Nuvem e Sistemas Distribuídos.',
  'quais são algumas conquistas de carreira de destaque do fabio?':
    'Entre os destaques estão trabalhos de backend com impacto em onboarding e engajamento, modernização de infraestrutura e melhorias escaláveis de plataforma em múltiplos domínios.',
}

function getLocalAnswer(question: string) {
  const normalized = question.trim().toLowerCase()
  return (
    fallbackAnswers[normalized] ||
    'Ótima pergunta. Este chat está pronto para seu endpoint de AI. Por enquanto, consigo responder perguntas gerais sobre carreira, backend, cloud, plataforma e arquitetura do Fabio.'
  )
}

export default function CareerChatWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content:
        'Olá, sou o assistente de carreira do Fabio. Faça perguntas profissionais sobre trajetória, arquitetura, experiência em cloud e foco de carreira.',
    },
  ])

  const hasMessages = useMemo(() => messages.length > 0, [messages.length])

  const ask = async (question: string) => {
    const safeQuestion = question.trim()
    if (!safeQuestion || isLoading) return

    setMessages((prev) => [...prev, { role: 'user', content: safeQuestion }])
    setInput('')
    setIsLoading(true)

    const delayMs = 1000 + Math.floor(Math.random() * 2000)
    await new Promise((resolve) => setTimeout(resolve, delayMs))

    try {
      const response = await fetch('/api/ai/answer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ question: safeQuestion }),
      })

      const data = await response.json()
      const assistantAnswer =
        response.ok && data?.answer ? data.answer : getLocalAnswer(safeQuestion)

      setMessages((prev) => [...prev, { role: 'assistant', content: assistantAnswer }])
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', content: getLocalAnswer(safeQuestion) }])
    }
    setIsLoading(false)
  }

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    ask(input)
  }

  return (
    <>
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="bg-primary-700 hover:bg-primary-600 border-primary-400/40 fixed right-6 bottom-6 z-[120] inline-flex items-center gap-2 rounded-full border px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-black/30"
      >
        <span aria-hidden>⚡</span>
        {isOpen ? 'Fechar Chat' : 'Perguntar ao Fabio AI'}
      </button>

      {isOpen && (
        <div className="fixed right-6 bottom-24 z-[120] flex h-[32rem] w-[22rem] flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900">
          <div className="from-primary-100 to-primary-50 dark:from-primary-500/20 dark:to-primary-600/5 border-b border-gray-200 bg-gradient-to-br px-4 py-3 dark:border-gray-700">
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Chat de Carreira
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Curiosidades profissionais e pessoais sobre carreira
            </p>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
            {hasMessages &&
              messages.map((message, index) => (
                <div
                  key={`${message.role}-${index}`}
                  className={
                    message.role === 'user'
                      ? 'ml-8 rounded-xl bg-gray-100 px-3 py-2 text-sm text-gray-900 dark:bg-gray-800 dark:text-gray-100'
                      : 'bg-primary-50 mr-8 rounded-xl px-3 py-2 text-sm text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                  }
                >
                  {message.content}
                </div>
              ))}
            {isLoading && (
              <div className="border-primary-300/40 bg-primary-50 mr-8 rounded-xl border px-3 py-2 text-sm text-gray-700 dark:bg-gray-800 dark:text-gray-200">
                <span className="inline-flex items-center gap-1">
                  <span className="bg-primary-500 h-1.5 w-1.5 animate-pulse rounded-full" />
                  <span className="bg-primary-500 h-1.5 w-1.5 animate-pulse rounded-full [animation-delay:120ms]" />
                  <span className="bg-primary-500 h-1.5 w-1.5 animate-pulse rounded-full [animation-delay:240ms]" />
                  Pensando...
                </span>
              </div>
            )}

            <div className="border-primary-200/70 bg-primary-50/40 dark:border-primary-700/40 dark:bg-primary-900/10 rounded-xl border p-3 pt-2">
              <p className="mb-2 text-xs font-semibold tracking-wide text-gray-500 uppercase dark:text-gray-400">
                Perguntas sugeridas
              </p>
              <div className="flex flex-wrap gap-2">
                {suggestedQuestions.map((question) => (
                  <button
                    key={question}
                    type="button"
                    onClick={() => ask(question)}
                    className="hover:bg-primary-100 border-primary-300/70 dark:border-primary-600/60 rounded-full border bg-white px-3 py-1 text-xs text-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
                  >
                    {question}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <form
            onSubmit={onSubmit}
            className="border-primary-200 bg-primary-50/50 dark:border-primary-800/40 border-t p-3 dark:bg-gray-900"
          >
            <div className="flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Pergunte sobre o Fabio..."
                className="focus:ring-primary-500 border-primary-300 dark:border-primary-700/60 flex-1 rounded-lg border bg-white px-3 py-2 text-sm text-gray-900 focus:border-transparent focus:ring-2 focus:outline-none dark:bg-gray-950 dark:text-gray-100"
              />
              <button
                type="submit"
                disabled={isLoading}
                className="bg-primary-700 hover:bg-primary-600 rounded-lg px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {isLoading ? '...' : 'Enviar'}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  )
}
