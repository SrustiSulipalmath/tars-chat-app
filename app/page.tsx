'use client'

import { useUser } from '@clerk/nextjs'
import { useQuery, useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { SignOutButton } from '@clerk/nextjs'
import { Menu, X } from 'lucide-react'
import { formatMessageTime } from '@/lib/utils'
import { TypingIndicator } from '@/components/chat/typing-indicator'

export default function HomePage() {
  const { user, isLoaded, isSignedIn } = useUser()
  const router = useRouter()
  const [message, setMessage] = useState('')
  const [selectedConversation, setSelectedConversation] = useState(null)
  const [selectedUserId, setSelectedUserId] = useState(null)
  const [showMobileSidebar, setShowMobileSidebar] = useState(true)
  const [isTyping, setIsTyping] = useState(false)
  const typingTimeoutRef = useRef(null)
  const messagesEndRef = useRef(null)
  const [showScrollButton, setShowScrollButton] = useState(false)
  const [isUserScrolled, setIsUserScrolled] = useState(false)

  // Get current user from Convex using Clerk ID
  const currentUser = useQuery(api.users.getUserByClerkId, 
    user?.id ? { clerkId: user.id } : 'skip'
  )
  
  // Get all users
  const allUsers = useQuery(api.users.list)
  
  // Get user's conversations (only if we have the current user)
  const conversations = useQuery(api.conversations.getUserConversations, 
    currentUser?._id ? { userId: currentUser._id } : 'skip'
  )
  
  // Get messages for selected conversation
  const messages = useQuery(api.messages.list, 
    selectedConversation ? { conversationId: selectedConversation } : 'skip'
  )
  
  // Get typing users
  const typingUsers = useQuery(api.typing.getTypingUsers, 
    selectedConversation && currentUser?._id ? { 
      conversationId: selectedConversation, 
      currentUserId: currentUser._id 
    } : 'skip'
  )
  
  // Send message mutation
  const sendMessage = useMutation(api.messages.send)
  
  // Create/get conversation mutation
  const getOrCreateConversation = useMutation(api.conversations.getOrCreateConversation)
  
  // Store user in Convex when they sign in
  const createUser = useMutation(api.users.store)
  
  // Set typing mutation
  const setTyping = useMutation(api.typing.setTyping)

  // Auto-scroll logic
  useEffect(() => {
    if (!isUserScrolled) {
      scrollToBottom()
    } else {
      setShowScrollButton(true)
    }
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    setShowScrollButton(false)
  }

  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 100
    setIsUserScrolled(!isAtBottom)
  }

  useEffect(() => {
    if (user) {
      createUser({
        clerkId: user.id,
        email: user.emailAddresses[0]?.emailAddress || '',
        name: user.fullName || user.emailAddresses[0]?.emailAddress?.split('@')[0] || 'User',
      })
    }
  }, [user, createUser])

  const handleUserSelect = async (otherUserId) => {
    if (!currentUser) return
    setSelectedUserId(otherUserId)
    // Get or create conversation between current user and selected user
    const conversationId = await getOrCreateConversation({
      currentUserId: currentUser._id,
      otherUserId: otherUserId,
    })
    setSelectedConversation(conversationId)
    setShowMobileSidebar(false)
  }

  const handleTyping = () => {
    if (!selectedConversation || !currentUser) return
    
    if (!isTyping) {
      setIsTyping(true)
      setTyping({ conversationId: selectedConversation, userId: currentUser._id, isTyping: true })
    }
    
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }
    
    // Set new timeout
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false)
      setTyping({ conversationId: selectedConversation, userId: currentUser._id, isTyping: false })
    }, 2000)
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
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar - Users List */}
      <div className={`${
        showMobileSidebar ? 'translate-x-0' : '-translate-x-full'
      } fixed md:relative md:translate-x-0 w-80 bg-white border-r h-full transition-transform duration-300 z-30`}>
        <div className="p-4 border-b">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Chats</h2>
            <div className="flex items-center gap-2">
              <SignOutButton>
                <button className="text-sm text-red-600 hover:text-red-800">
                  Sign Out
                </button>
              </SignOutButton>
              <button 
                className="md:hidden"
                onClick={() => setShowMobileSidebar(false)}
              >
                <X size={20} />
              </button>
            </div>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Logged in as: {user.fullName || user.emailAddresses[0]?.emailAddress}
          </p>
        </div>
        
        <div className="overflow-y-auto h-[calc(100vh-80px)]">
          {allUsers?.filter(u => u.clerkId !== user.id).length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              No other users found. Share this app with friends to start chatting!
            </div>
          ) : (
            allUsers?.filter(u => u.clerkId !== user.id).map((u) => {
              // Find conversation with this user to get unread count
              const conv = conversations?.find(c => 
                c.participants.includes(u._id)
              )
              
              return (
                <div
                  key={u._id}
                  onClick={() => handleUserSelect(u._id)}
                  className={`p-4 border-b hover:bg-gray-50 cursor-pointer transition ${
                    selectedUserId === u._id ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-lg">
                        {u.name.charAt(0).toUpperCase()}
                      </div>
                      {/* Online/Offline Indicator */}
                      <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${
                        u.isOnline ? 'bg-green-500' : 'bg-gray-400'
                      }`}></span>
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-center">
                        <div className="font-medium">{u.name}</div>
                        {/* Unread Message Badge */}
                        {conv?.unreadCount > 0 && (
                          <span className="bg-blue-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                            {conv.unreadCount}
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-500">{u.email}</div>
                      {/* Typing Indicator in sidebar */}
                      {typingUsers?.some(tu => tu._id === u._id) && (
                        <div className="text-xs text-green-500 mt-1">typing...</div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col bg-white">
        {selectedConversation ? (
          <>
            {/* Messages */}
            <div 
              className="flex-1 overflow-y-auto p-4 space-y-4"
              onScroll={handleScroll}
            >
              {messages?.length === 0 ? (
                <div className="text-center text-gray-500 mt-10">
                  No messages yet. Start the conversation!
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
                            : 'bg-gray-100 text-gray-900'
                        }`}
                      >
                        <div>{msg.content}</div>
                        <div
                          className={`text-xs mt-1 ${
                            isOwnMessage ? 'text-blue-100' : 'text-gray-500'
                          }`}
                        >
                          {formatMessageTime(msg.createdAt)}
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
              
              {/* Typing Indicator in Chat */}
              <TypingIndicator users={typingUsers || []} />
              <div ref={messagesEndRef} />
            </div>

            {/* Scroll to bottom button */}
            {showScrollButton && (
              <button
                onClick={scrollToBottom}
                className="absolute bottom-24 right-8 bg-blue-500 text-white rounded-full p-2 shadow-lg hover:bg-blue-600"
              >
                ↓ New messages
              </button>
            )}

            {/* Message Input */}
            <div className="border-t p-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={message}
                  onChange={(e) => {
                    setMessage(e.target.value)
                    handleTyping()
                  }}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && message.trim()) {
                      sendMessage({
                        conversationId: selectedConversation,
                        content: message.trim(),
                      })
                      setMessage('')
                      // Stop typing when message sent
                      if (typingTimeoutRef.current) {
                        clearTimeout(typingTimeoutRef.current)
                      }
                      setTyping({ 
                        conversationId: selectedConversation, 
                        userId: currentUser._id, 
                        isTyping: false 
                      })
                      setIsTyping(false)
                    }
                  }}
                  placeholder="Type a message..."
                  className="flex-1 p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={() => {
                    if (message.trim()) {
                      sendMessage({
                        conversationId: selectedConversation,
                        content: message.trim(),
                      })
                      setMessage('')
                      // Stop typing when message sent
                      if (typingTimeoutRef.current) {
                        clearTimeout(typingTimeoutRef.current)
                      }
                      setTyping({ 
                        conversationId: selectedConversation, 
                        userId: currentUser._id, 
                        isTyping: false 
                      })
                      setIsTyping(false)
                    }
                  }}
                  className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition"
                >
                  Send
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <h3 className="text-xl font-medium mb-2">Welcome to Tars Chat!</h3>
              <p>Select a user from the sidebar to start messaging</p>
            </div>
          </div>
        )}
      </div>

      {/* Mobile menu button */}
      {!showMobileSidebar && (
        <button
          className="md:hidden fixed bottom-4 left-4 bg-blue-500 text-white p-3 rounded-full shadow-lg z-20"
          onClick={() => setShowMobileSidebar(true)}
        >
          <Menu size={24} />
        </button>
      )}
    </div>
  )
}