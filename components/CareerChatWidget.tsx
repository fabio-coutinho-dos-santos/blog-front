'use client'

import { FormEvent, useMemo, useState } from 'react'

type Message = {
  role: 'user' | 'assistant'
  content: string
}

const suggestedQuestions = [
  'What are Fabio’s strongest backend skills?',
  'What kind of architecture work has Fabio led?',
  'What cloud and platform experience does Fabio have?',
  'What type of role is Fabio looking for now?',
  'What are some notable career achievements from Fabio?',
]

const fallbackAnswers: Record<string, string> = {
  'what are fabio’s strongest backend skills?':
    'Fabio is strongest in Node.js, TypeScript, NestJS, distributed systems design, and backend architecture with strong testing and maintainability practices.',
  'what kind of architecture work has fabio led?':
    'He has led monolith-to-microservices transitions, multi-environment staging strategies, compliance-oriented storage architecture, and platform modernization initiatives.',
  'what cloud and platform experience does fabio have?':
    'Fabio has hands-on experience with GCP, AWS, Cloudflare R2, CI/CD pipelines, containerized workloads, and cross-team platform enablement.',
  'what type of role is fabio looking for now?':
    'He is focused on Senior/Staff-level opportunities in Platform Engineering, Cloud Architecture, and Distributed Systems.',
  'what are some notable career achievements from fabio?':
    'Highlights include impactful onboarding and engagement backend work, infrastructure modernization, and scalable platform improvements across multiple domains.',
}

function getLocalAnswer(question: string) {
  const normalized = question.trim().toLowerCase()
  return (
    fallbackAnswers[normalized] ||
    'Great question. This chat is ready for your AI endpoint. For now, I can answer general career-focused questions about Fabio’s backend, cloud, platform, and architecture experience.'
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
        "Hi, I'm Fabio's career assistant. Ask me professional questions about his background, architecture work, cloud experience, and career focus.",
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
        {isOpen ? 'Close Chat' : 'Ask Fabio AI'}
      </button>

      {isOpen && (
        <div className="fixed right-6 bottom-24 z-[120] flex h-[32rem] w-[22rem] flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900">
          <div className="from-primary-100 to-primary-50 dark:from-primary-500/20 dark:to-primary-600/5 border-b border-gray-200 bg-gradient-to-br px-4 py-3 dark:border-gray-700">
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Career Chat</p>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Professional and personal career curiosity
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
                  Thinking...
                </span>
              </div>
            )}

            <div className="border-primary-200/70 bg-primary-50/40 dark:border-primary-700/40 dark:bg-primary-900/10 rounded-xl border p-3 pt-2">
              <p className="mb-2 text-xs font-semibold tracking-wide text-gray-500 uppercase dark:text-gray-400">
                Suggested questions
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
                placeholder="Ask about Fabio..."
                className="focus:ring-primary-500 border-primary-300 dark:border-primary-700/60 flex-1 rounded-lg border bg-white px-3 py-2 text-sm text-gray-900 focus:border-transparent focus:ring-2 focus:outline-none dark:bg-gray-950 dark:text-gray-100"
              />
              <button
                type="submit"
                disabled={isLoading}
                className="bg-primary-700 hover:bg-primary-600 rounded-lg px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {isLoading ? '...' : 'Send'}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  )
}
