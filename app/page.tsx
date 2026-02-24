'use client'

import { useUser } from '@clerk/nextjs'
import { useQuery, useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { SignOutButton } from '@clerk/nextjs'

export default function HomePage() {
  const { user, isLoaded, isSignedIn } = useUser()
  const router = useRouter()
  const [message, setMessage] = useState('')
  const [selectedConversation, setSelectedConversation] = useState(null)
  const [selectedUserId, setSelectedUserId] = useState(null)

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
  
  // Send message mutation
  const sendMessage = useMutation(api.messages.send)
  
  // Create/get conversation mutation
  const getOrCreateConversation = useMutation(api.conversations.getOrCreateConversation)
  
  // Store user in Convex when they sign in
  const createUser = useMutation(api.users.store)

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
      <div className="w-80 bg-white border-r">
        <div className="p-4 border-b">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Chats</h2>
            <SignOutButton>
              <button className="text-sm text-red-600 hover:text-red-800">
                Sign Out
              </button>
            </SignOutButton>
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
            allUsers?.filter(u => u.clerkId !== user.id).map((u) => (
              <div
                key={u._id}
                onClick={() => handleUserSelect(u._id)}
                className={`p-4 border-b hover:bg-gray-50 cursor-pointer transition ${
                  selectedUserId === u._id ? 'bg-blue-50' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-lg">
                    {u.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">{u.name}</div>
                    <div className="text-sm text-gray-500">{u.email}</div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col bg-white">
        {selectedConversation ? (
          <>
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
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
                          {new Date(msg.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            {/* Message Input */}
            <div className="border-t p-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && message.trim()) {
                      sendMessage({
                        conversationId: selectedConversation,
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
                        conversationId: selectedConversation,
                        content: message.trim(),
                      })
                      setMessage('')
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
    </div>
  )
}