
'use client'

import { useUser } from '@clerk/nextjs'
import { useQuery, useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Send } from 'lucide-react'
import { Id } from '@/convex/_generated/dataModel'

export default function ConversationPage() {
  const { user, isLoaded, isSignedIn } = useUser()
  const params = useParams()
  const router = useRouter()
  const [message, setMessage] = useState('')
  const messagesEndRef = useRef(null)
  
  // FIXED: Now on one line
  const conversationId = params.id as Id<"conversations">
  
  // Get current user from Convex
  const currentUser = useQuery(api.users.getUserByClerkId, 
    user?.id ? { clerkId: user.id } : 'skip'
  )
  
  // Get messages for this conversation
  const messages = useQuery(api.messages.list, { conversationId })
  
  // Send message mutation
  const sendMessage = useMutation(api.messages.send)
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSendMessage = () => {
    if (!message.trim() || !currentUser) return
    
    sendMessage({
      conversationId,
      content: message.trim(),
    })
    setMessage('')
  }

  if (!isLoaded || !currentUser) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (!isSignedIn) {
    router.push('/sign-in')
    return null
  }

  return (
    <div className="flex flex-col h-screen bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="border-b dark:border-gray-700 p-4 flex items-center gap-4 bg-white dark:bg-gray-900">
        <button 
          onClick={() => router.back()}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition"
        >
          <ArrowLeft size={20} className="dark:text-white" />
        </button>
        <h2 className="font-semibold dark:text-white">Conversation</h2>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-800">
        {messages?.length === 0 ? (
          <div className="text-center text-gray-500 dark:text-gray-400 mt-10">
            No messages yet. Say hello!
          </div>
        ) : (
          messages?.map((msg) => {
            const isOwnMessage = msg.senderId === currentUser._id
            return (
              <div
                key={msg._id}
                className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[70%] rounded-lg p-3 ${
                    isOwnMessage
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-900 dark:bg-gray-700 dark:text-gray-100'
                  }`}
                >
                  <div>{msg.content}</div>
                  <div className={`text-xs mt-1 ${
                    isOwnMessage ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'
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
      <div className="border-t dark:border-gray-700 p-4 bg-white dark:bg-gray-900">
        <div className="flex gap-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && message.trim()) {
                handleSendMessage()
              }
            }}
            placeholder="Type a message..."
            className="flex-1 p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
          />
          <button
            onClick={handleSendMessage}
            disabled={!message.trim()}
            className={`px-6 py-3 rounded-lg transition flex items-center gap-2 ${
              message.trim() 
                ? 'bg-blue-500 text-white hover:bg-blue-600' 
                : 'bg-gray-200 text-gray-400 dark:bg-gray-700 dark:text-gray-500 cursor-not-allowed'
            }`}
          >
            <Send size={18} />
            <span>Send</span>
          </button>
        </div>
      </div>
    </div>
  )
}
