'use client'

import { useUser } from '@clerk/nextjs'
import { useQuery, useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Send } from 'lucide-react'

export default function ConversationPage() {
  const { user, isLoaded, isSignedIn } = useUser()
  const params = useParams()
  const router = useRouter()
  const [message, setMessage] = useState('')
  const messagesEndRef = useRef(null)
  
  const conversationId = params.id as string
  
  const messages = useQuery(api.messages.list, { conversationId })
  const sendMessage = useMutation(api.messages.send)
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  if (!isLoaded) {
    return <div className="flex min-h-screen items-center justify-center">Loading...</div>
  }

  if (!isSignedIn) {
    router.push('/sign-in')
    return null
  }

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Header */}
      <div className="border-b p-4 flex items-center gap-4">
        <button 
          onClick={() => router.back()}
          className="p-2 hover:bg-gray-100 rounded-full"
        >
          <ArrowLeft size={20} />
        </button>
        <h2 className="font-semibold">Conversation</h2>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages?.length === 0 ? (
          <div className="text-center text-gray-500 mt-10">
            No messages yet. Say hello!
          </div>
        ) : (
          messages?.map((msg) => {
            const isOwnMessage = msg.senderId === user?.id
            return (
              <div
                key={msg._id}
                className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[70%] rounded-lg p-3 ${
                    isOwnMessage
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  <div>{msg.content}</div>
                  <div className={`text-xs mt-1 ${
                    isOwnMessage ? 'text-blue-100' : 'text-gray-500'
                  }`}>
                    {new Date(msg.createdAt).toLocaleTimeString()}
                  </div>
                </div>
              </div>
            )
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t p-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && message.trim()) {
                sendMessage({
                  conversationId,
                  content: message.trim(),
                })
                setMessage('')
              }
            }}
            placeholder="Type a message..."
            className="flex-1 p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={() => {
              if (message.trim()) {
                sendMessage({
                  conversationId,
                  content: message.trim(),
                })
                setMessage('')
              }
            }}
            className="bg-blue-500 text-white p-3 rounded-lg hover:bg-blue-600"
          >
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  )
}