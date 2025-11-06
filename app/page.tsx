'use client'

import { useState, useRef, useEffect } from 'react'
import { MessageCircle, Send, X, Minimize2, MessageSquare, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

interface Message {
  id: string
  type: 'customer' | 'agent' | 'system'
  content: string
  timestamp: Date
  sources?: Array<{ page_title: string; url: string; relevance: number }>
  escalated?: boolean
}

interface QuickAction {
  label: string
  query: string
}

const QUICK_ACTIONS: QuickAction[] = [
  { label: 'Return policy', query: 'What is your return policy?' },
  { label: 'Technical support', query: 'I need technical support' },
  { label: 'Account reset', query: 'How do I reset my password?' },
  { label: 'Billing question', query: 'How do I manage my billing?' },
  { label: 'Product info', query: 'Tell me about your products' },
]

function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '0',
      type: 'agent',
      content: 'Hi there! How can I help you today?',
      timestamp: new Date(),
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [hasUnread, setHasUnread] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [agentId, setAgentId] = useState<string>('')

  // Get agent ID from env
  useEffect(() => {
    const fetchAgentId = async () => {
      // In a real app, you'd fetch this from an API or use environment variables
      // For now, we'll set a placeholder that should be replaced with actual agent ID
      setAgentId('68fd263d71c6b27d6c8eb80f')
    }
    fetchAgentId()
  }, [])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleQuickAction = (query: string) => {
    handleSendMessage(query)
  }

  const handleSendMessage = async (messageContent?: string) => {
    const textToSend = messageContent || input.trim()
    if (!textToSend) return

    // Add customer message
    const customerId = `msg-${Date.now()}`
    const newCustomerMessage: Message = {
      id: customerId,
      type: 'customer',
      content: textToSend,
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, newCustomerMessage])
    setInput('')
    setLoading(true)

    try {
      // Call the AI agent via secure API route
      const response = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToSend,
          agent_id: agentId,
          conversation_id: 'support-chat-' + Date.now(),
        }),
      })

      const data = await response.json()

      if (data.success) {
        // Extract agent response
        const agentResponse = data.response?.response || data.response || 'Unable to process your request'
        const sources = data.response?.sources || []
        const status = data.response?.status || 'answered'

        // Determine if escalated
        const isEscalated = status === 'escalated'

        const agentMessage: Message = {
          id: `msg-${Date.now()}-agent`,
          type: isEscalated ? 'system' : 'agent',
          content: isEscalated
            ? "I don't have enough information to answer this accurately. I've escalated your query to our support team at vidur@lyzr.ai. You'll receive a response within 24 hours."
            : agentResponse,
          timestamp: new Date(),
          sources: sources.length > 0 ? sources : undefined,
          escalated: isEscalated,
        }

        setMessages((prev) => [...prev, agentMessage])
      } else {
        const errorMessage: Message = {
          id: `msg-${Date.now()}-error`,
          type: 'agent',
          content: 'Sorry, I encountered an error processing your request. Please try again.',
          timestamp: new Date(),
        }
        setMessages((prev) => [...prev, errorMessage])
      }
    } catch (error) {
      console.error('Error calling agent:', error)
      const errorMessage: Message = {
        id: `msg-${Date.now()}-error`,
        type: 'agent',
        content: 'Sorry, I encountered an error. Please try again later.',
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setLoading(false)
    }
  }

  const handleOpen = () => {
    setIsOpen(true)
    setHasUnread(false)
  }

  const handleClose = () => {
    setIsOpen(false)
  }

  const handleMinimize = () => {
    setIsOpen(false)
    setHasUnread(true)
  }

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={handleOpen}
          className={`fixed bottom-6 right-6 w-16 h-16 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 z-40 ${
            hasUnread
              ? 'bg-blue-600 hover:bg-blue-700 animate-pulse'
              : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          <MessageCircle className="text-white" size={28} />
          {hasUnread && (
            <div className="absolute top-0 right-0 w-4 h-4 bg-red-500 rounded-full border-2 border-white"></div>
          )}
        </button>
      )}

      {/* Chat Panel */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 w-[420px] h-[650px] rounded-lg shadow-2xl bg-white flex flex-col z-50 overflow-hidden border border-gray-200">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-2.5 h-2.5 bg-green-400 rounded-full"></div>
              <div>
                <h2 className="text-white font-semibold text-base">Customer Support</h2>
                <p className="text-blue-100 text-xs">We typically respond in minutes</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleMinimize}
                className="text-white hover:bg-blue-600 p-2 rounded-md transition-colors"
                title="Minimize"
              >
                <Minimize2 size={18} />
              </button>
              <button
                onClick={handleClose}
                className="text-white hover:bg-blue-600 p-2 rounded-md transition-colors"
                title="Close"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto px-4 py-4 bg-gray-50">
            <div className="space-y-4">
              {messages.map((message) => (
                <div key={message.id}>
                  {message.type === 'customer' && (
                    <div className="flex justify-end">
                      <div className="bg-blue-600 text-white rounded-lg rounded-tr-none px-4 py-2.5 max-w-xs break-words">
                        <p className="text-sm">{message.content}</p>
                        <p className="text-xs mt-1 text-blue-100 opacity-75">
                          {message.timestamp.toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>
                  )}

                  {message.type === 'agent' && (
                    <div className="flex justify-start">
                      <div className="bg-white border border-gray-200 rounded-lg rounded-tl-none px-4 py-2.5 max-w-xs shadow-sm">
                        <p className="text-gray-900 text-sm">{message.content}</p>
                        <p className="text-xs mt-1 text-gray-500">
                          {message.timestamp.toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>

                        {/* Sources */}
                        {message.sources && message.sources.length > 0 && (
                          <div className="mt-3 space-y-2">
                            {message.sources.map((source, idx) => (
                              <a
                                key={idx}
                                href={source.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-start gap-2 p-2 bg-gray-100 rounded text-xs hover:bg-gray-200 transition-colors"
                              >
                                <MessageSquare size={14} className="text-gray-500 flex-shrink-0 mt-0.5" />
                                <span className="text-gray-700 hover:text-blue-600">
                                  Source: {source.page_title}
                                </span>
                              </a>
                            ))}
                          </div>
                        )}

                        {/* Escalation Badge */}
                        {message.escalated && (
                          <div className="mt-3 p-2.5 bg-amber-50 border border-amber-200 rounded flex items-start gap-2">
                            <ChevronDown size={14} className="text-amber-600 flex-shrink-0 mt-0.5" />
                            <p className="text-xs text-amber-900">
                              Your query has been escalated to our support team. You will receive a response within 24 hours.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {message.type === 'system' && (
                    <div className="flex justify-start">
                      <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 max-w-xs">
                        <p className="text-amber-900 text-sm font-medium">Escalation Initiated</p>
                        <p className="text-amber-800 text-sm mt-1">{message.content}</p>
                        <p className="text-xs mt-2 text-amber-700">
                          Ticket ID: {message.id.slice(-8).toUpperCase()}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {loading && (
                <div className="flex justify-start">
                  <div className="bg-white border border-gray-200 rounded-lg rounded-tl-none px-4 py-2.5 shadow-sm">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200"></div>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Quick Actions - Show on initial load when only greeting is present */}
          {messages.length === 1 && !loading && (
            <div className="px-4 py-3 border-t border-gray-200 bg-white">
              <p className="text-xs text-gray-600 mb-2 font-medium">Quick actions:</p>
              <div className="flex flex-wrap gap-2">
                {QUICK_ACTIONS.map((action, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleQuickAction(action.query)}
                    disabled={loading}
                    className="px-3 py-1.5 text-xs bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input Area */}
          <div className="border-t border-gray-200 bg-white px-4 py-3 flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSendMessage()
                }
              }}
              placeholder="Type your question..."
              className="flex-1 border-gray-300 text-sm"
              disabled={loading}
            />
            <Button
              onClick={() => handleSendMessage()}
              disabled={loading || !input.trim()}
              className="bg-blue-600 hover:bg-blue-700 text-white px-3 h-10"
            >
              <Send size={18} />
            </Button>
          </div>

          {/* Powered by Badge */}
          <div className="bg-gray-50 px-4 py-2 border-t border-gray-200 text-center">
            <p className="text-xs text-gray-500">Powered by Lyzr</p>
          </div>
        </div>
      )}
    </>
  )
}

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
      <div className="text-center max-w-2xl px-6">
        <h1 className="text-5xl font-bold text-white mb-4">Customer Support Agent</h1>
        <p className="text-slate-300 text-lg mb-8">
          Experience AI-powered support with instant answers from our knowledge base. Click the chat button to get started.
        </p>

        <div className="grid grid-cols-2 gap-4 mt-12 mb-12">
          <Card className="bg-slate-800 border-slate-700 p-6">
            <MessageCircle className="text-blue-400 mb-3" size={32} />
            <h3 className="text-white font-semibold mb-2">Instant Responses</h3>
            <p className="text-slate-400 text-sm">Get answers to your questions 24/7</p>
          </Card>
          <Card className="bg-slate-800 border-slate-700 p-6">
            <MessageSquare className="text-blue-400 mb-3" size={32} />
            <h3 className="text-white font-semibold mb-2">Smart Escalation</h3>
            <p className="text-slate-400 text-sm">Complex issues automatically routed to experts</p>
          </Card>
        </div>
      </div>

      {/* Chat Widget */}
      <ChatWidget />
    </div>
  )
}
