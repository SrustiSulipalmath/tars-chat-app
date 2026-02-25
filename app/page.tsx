'use client'

import { useUser } from '@clerk/nextjs'
import { useQuery, useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { SignOutButton } from '@clerk/nextjs'
import { 
  Menu, X, Send, Moon, Sun, Search, Smile, Paperclip, 
  LogOut, Settings, User, Bell, Check, CheckCheck,
  MoreVertical, Phone, Video, Info, Users, Plus, 
  MessageCircle, Edit, Copy, Reply, Trash2
} from 'lucide-react'
import { formatMessageTime } from '@/lib/utils'
import { TypingIndicator } from '@/components/chat/typing-indicator'
import { MessageBubble } from '@/components/chat/message-bubble'
import EmojiPicker from 'emoji-picker-react'

export default function HomePage() {
  const { user, isLoaded, isSignedIn } = useUser()
  const router = useRouter()
  
  // State
  const [message, setMessage] = useState('')
  const [selectedConversation, setSelectedConversation] = useState<Id<"conversations"> | null>(null)
  const [selectedUserId, setSelectedUserId] = useState<Id<"users"> | null>(null)
  const [showMobileSidebar, setShowMobileSidebar] = useState(true)
  const [isTyping, setIsTyping] = useState(false)
  const [darkMode, setDarkMode] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [showUserProfile, setShowUserProfile] = useState(false)
  const [replyingTo, setReplyingTo] = useState(null)
  const [editingMessage, setEditingMessage] = useState(null)
  const [showScrollButton, setShowScrollButton] = useState(false)
  const [isUserScrolled, setIsUserScrolled] = useState(false)
  
  // Refs
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Get current user from Convex using Clerk ID
  const currentUser = useQuery(api.users.getUserByClerkId, 
    user?.id ? { clerkId: user.id } : 'skip'
  )
  
  // Get all users
  const allUsers = useQuery(api.users.list)
  
  // Get user's conversations
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
  
  // Mutations
  const sendMessage = useMutation(api.messages.send)
  const getOrCreateConversation = useMutation(api.conversations.getOrCreateConversation)
  const createUser = useMutation(api.users.store)
  const setTyping = useMutation(api.typing.setTyping)
  const updateOnlineStatus = useMutation(api.users.updateOnlineStatus)

  // Filter users based on search - with safe checks
  const filteredUsers = allUsers?.filter(u => {
    if (!user || !u) return false;
    return u.clerkId !== user.id && 
           u.name?.toLowerCase().includes(searchQuery.toLowerCase());
  }) || [];

  // Debug mutations
  useEffect(() => {
    console.log("🟡 Available mutations:", {
      sendMessage: !!sendMessage,
      getOrCreateConversation: !!getOrCreateConversation,
      setTyping: !!setTyping,
      updateOnlineStatus: !!updateOnlineStatus
    });
  }, [sendMessage, getOrCreateConversation, setTyping, updateOnlineStatus]);

  // Auto-scroll logic
  useEffect(() => {
    if (!isUserScrolled) {
      scrollToBottom()
    } else {
      setShowScrollButton(true)
    }
  }, [messages])

  // Create user in Convex when they sign in
  useEffect(() => {
    if (user) {
      createUser({
        clerkId: user.id,
        email: user.emailAddresses[0]?.emailAddress || '',
        name: user.fullName || user.emailAddresses[0]?.emailAddress?.split('@')[0] || 'User',
      })
    }
  }, [user, createUser])

  // Update online status
  useEffect(() => {
    if (currentUser?._id) {
      updateOnlineStatus({ userId: currentUser._id, isOnline: true })
      
      const handleBeforeUnload = () => {
        updateOnlineStatus({ userId: currentUser._id, isOnline: false })
      }
      
      window.addEventListener('beforeunload', handleBeforeUnload)
      
      return () => {
        updateOnlineStatus({ userId: currentUser._id, isOnline: false })
        window.removeEventListener('beforeunload', handleBeforeUnload)
      }
    }
  }, [currentUser, updateOnlineStatus])

  // Toggle dark mode
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [darkMode])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    setShowScrollButton(false)
  }

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 100
    setIsUserScrolled(!isAtBottom)
  }

  const handleUserSelect = async (otherUserId: Id<"users">) => {
    if (!currentUser) return
    setSelectedUserId(otherUserId)
    const conversationId = await getOrCreateConversation({
      currentUserId: currentUser._id,
      otherUserId: otherUserId,
    })
    setSelectedConversation(conversationId)
    setShowMobileSidebar(false)
    setSearchQuery('')
    setReplyingTo(null)
    setEditingMessage(null)
  }

  const handleTyping = () => {
    if (!selectedConversation || !currentUser) return
    
    if (!isTyping) {
      setIsTyping(true)
      setTyping({ conversationId: selectedConversation, userId: currentUser._id, isTyping: true })
    }
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }
    
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false)
      setTyping({ conversationId: selectedConversation, userId: currentUser._id, isTyping: false })
    }, 2000)
  }

  const handleEmojiClick = (emojiData) => {
    setMessage(prev => prev + emojiData.emoji)
    setShowEmojiPicker(false)
    handleTyping()
  }

  const handleSendMessage = () => {
    console.log("Send button clicked", { 
      message: message.trim(), 
      selectedConversation, 
      currentUser: currentUser?._id 
    });
    
    if (!message.trim()) {
      console.log("Message is empty");
      return;
    }
    
    if (!selectedConversation) {
      console.log("No conversation selected");
      return;
    }
    
    if (!currentUser) {
      console.log("No current user");
      return;
    }
    
    sendMessage({
      conversationId: selectedConversation,
      content: message.trim(),
    }).then(() => {
      console.log("Message sent successfully");
      setMessage('');
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      setTyping({ 
        conversationId: selectedConversation, 
        userId: currentUser._id, 
        isTyping: false 
      });
      setIsTyping(false);
      setReplyingTo(null);
      setEditingMessage(null);
    }).catch((error) => {
      console.error("Error sending message:", error);
    });
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.currentTarget.files?.[0];
    if (!file || !selectedConversation || !currentUser) return;
    
    sendMessage({
      conversationId: selectedConversation,
      content: `📎 Sent a file: ${file.name}`,
    });
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  if (!isLoaded || !currentUser) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading your chats...</p>
        </div>
      </div>
    )
  }

  if (!isSignedIn) {
    router.push('/sign-in')
    return null
  }

  return (
    <div className={`flex h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 ${darkMode ? 'dark' : ''}`}>
      {/* Sidebar */}
      <div className={`${
        showMobileSidebar ? 'translate-x-0' : '-translate-x-full'
      } fixed md:relative md:translate-x-0 w-full md:w-96 bg-white dark:bg-gray-800 border-r dark:border-gray-700 h-full transition-transform duration-300 z-30 shadow-xl overflow-y-auto`}>
        {/* Sidebar Header - Fixed at top */}
        <div className="sticky top-0 z-10 p-4 border-b dark:border-gray-700 bg-gradient-to-r from-blue-500 to-blue-600">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur flex items-center justify-center text-white font-bold text-xl border-2 border-white">
                  {user.fullName?.charAt(0).toUpperCase() || user.emailAddresses[0]?.emailAddress?.charAt(0).toUpperCase()}
                </div>
                <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></span>
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white">Chats</h2>
                <p className="text-sm text-blue-100 truncate max-w-[150px] md:max-w-[200px]">
                  {user.fullName || user.emailAddresses[0]?.emailAddress}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 md:gap-2">
              <button
                onClick={() => setDarkMode(!darkMode)}
                className="p-1.5 md:p-2 hover:bg-white/20 rounded-full transition text-white"
              >
                {darkMode ? <Sun size={16} className="md:hidden" /> : <Moon size={16} className="md:hidden" />}
                {darkMode ? <Sun size={18} className="hidden md:block" /> : <Moon size={18} className="hidden md:block" />}
              </button>
              <button
                onClick={() => setShowUserProfile(!showUserProfile)}
                className="p-1.5 md:p-2 hover:bg-white/20 rounded-full transition text-white"
              >
                <Settings size={16} className="md:hidden" />
                <Settings size={18} className="hidden md:block" />
              </button>
              <SignOutButton>
                <button className="p-1.5 md:p-2 hover:bg-white/20 rounded-full transition text-white">
                  <LogOut size={16} className="md:hidden" />
                  <LogOut size={18} className="hidden md:block" />
                </button>
              </SignOutButton>
              <button 
                className="md:hidden p-1.5 hover:bg-white/20 rounded-full transition text-white"
                onClick={() => setShowMobileSidebar(false)}
              >
                <X size={18} />
              </button>
            </div>
          </div>
          
          {/* Search Bar */}
          <div className="mt-4 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/70 h-4 w-4" />
            <input
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.currentTarget.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white/10 backdrop-blur rounded-xl text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-white/50 border border-white/20 text-sm md:text-base"
            />
          </div>
        </div>
        
        {/* User Profile Panel - Floating */}
        {showUserProfile && (
          <div className="absolute top-20 left-4 right-4 md:left-4 md:w-64 bg-white dark:bg-gray-800 rounded-lg shadow-xl border dark:border-gray-700 z-50">
            <div className="p-4 border-b dark:border-gray-700">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold dark:text-white">Profile Settings</h3>
                <button 
                  onClick={() => setShowUserProfile(false)}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
            <div className="p-3 space-y-2">
              <div className="flex items-center gap-3 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg cursor-pointer">
                <User size={18} className="text-gray-600 dark:text-gray-400" />
                <span className="text-sm dark:text-gray-300">My Profile</span>
              </div>
              <div className="flex items-center gap-3 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg cursor-pointer">
                <Bell size={18} className="text-gray-600 dark:text-gray-400" />
                <span className="text-sm dark:text-gray-300">Notifications</span>
              </div>
              <div className="flex items-center gap-3 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg cursor-pointer">
                <Users size={18} className="text-gray-600 dark:text-gray-400" />
                <span className="text-sm dark:text-gray-300">Create Group</span>
              </div>
            </div>
          </div>
        )}
        
        {/* Users List */}
        <div className="overflow-y-auto pb-4">
          {filteredUsers.length === 0 ? (
            <div className="p-8 text-center">
              <div className="bg-gray-100 dark:bg-gray-700 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <Users size={24} className="text-gray-500 dark:text-gray-400" />
              </div>
              <p className="text-gray-500 dark:text-gray-400 mb-2 text-sm md:text-base">
                {searchQuery ? 'No users found' : 'No other users yet'}
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500">
                {searchQuery ? 'Try a different search term' : 'Share this app with friends to start chatting!'}
              </p>
            </div>
          ) : (
            filteredUsers.map((u) => {
              const conv = conversations?.find(c => 
                c.participants.includes(u._id)
              )
              const lastMessage = conv?.lastMessage
              
              // Debug unread count
              console.log(`User ${u.name} unread count:`, conv?.unreadCount);
              
              return (
                <div
                  key={u._id}
                  onClick={() => handleUserSelect(u._id)}
                  className={`p-3 md:p-4 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition border-b dark:border-gray-700 ${
                    selectedUserId === u._id ? 'bg-blue-50 dark:bg-gray-700' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-lg md:text-xl shadow-md">
                        {u.name.charAt(0).toUpperCase()}
                      </div>
                      <span className={`absolute bottom-0 right-0 w-3 h-3 md:w-3.5 md:h-3.5 rounded-full border-2 border-white dark:border-gray-800 ${
                        u.isOnline ? 'bg-green-500' : 'bg-gray-400'
                      }`}></span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center">
                        <div className="font-medium dark:text-white truncate text-sm md:text-base">{u.name}</div>
                        {conv?.lastMessageTime && (
                          <div className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                            {formatMessageTime(conv.lastMessageTime)}
                          </div>
                        )}
                      </div>
                      <div className="flex justify-between items-center mt-1">
                        <div className="text-xs md:text-sm text-gray-500 dark:text-gray-400 truncate max-w-[120px] md:max-w-[150px]">
                          {lastMessage?.content || 'No messages yet'}
                        </div>
                        {conv?.unreadCount > 0 && (
                          <span className="bg-blue-500 text-white text-xs rounded-full min-w-5 h-5 flex items-center justify-center px-1.5 ml-2">
                            {conv.unreadCount}
                          </span>
                        )}
                      </div>
                      {typingUsers?.some(tu => tu._id === u._id) && (
                        <div className="text-xs text-green-500 mt-1 flex items-center gap-1">
                          <span className="w-1 h-1 bg-green-500 rounded-full animate-pulse"></span>
                          typing...
                        </div>
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
      <div className={`flex-1 flex flex-col bg-white dark:bg-gray-900 ${darkMode ? 'dark' : ''}`}>
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="border-b dark:border-gray-700 p-3 md:p-4 flex items-center justify-between bg-white dark:bg-gray-900 shadow-sm">
              <div className="flex items-center gap-2 md:gap-3">
                {selectedUserId && (
                  <>
                    <div className="relative">
                      <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-base md:text-lg shadow-md">
                        {allUsers?.find(u => u._id === selectedUserId)?.name.charAt(0).toUpperCase()}
                      </div>
                      <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 md:w-3 md:h-3 rounded-full border-2 border-white dark:border-gray-900 ${
                        allUsers?.find(u => u._id === selectedUserId)?.isOnline ? 'bg-green-500' : 'bg-gray-400'
                      }`}></span>
                    </div>
                    <div>
                      <h3 className="font-semibold dark:text-white text-base md:text-lg">
                        {allUsers?.find(u => u._id === selectedUserId)?.name}
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                        <span className={`w-2 h-2 rounded-full ${
                          allUsers?.find(u => u._id === selectedUserId)?.isOnline ? 'bg-green-500' : 'bg-gray-400'
                        }`}></span>
                        {allUsers?.find(u => u._id === selectedUserId)?.isOnline ? 'Online' : 'Offline'}
                      </p>
                    </div>
                  </>
                )}
              </div>
              <div className="flex items-center gap-1 md:gap-2">
                <button className="p-1.5 md:p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition">
                  <Phone size={16} className="md:hidden" />
                  <Phone size={18} className="hidden md:block" />
                </button>
                <button className="p-1.5 md:p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition">
                  <Video size={16} className="md:hidden" />
                  <Video size={18} className="hidden md:block" />
                </button>
                <button className="p-1.5 md:p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition">
                  <Info size={16} className="md:hidden" />
                  <Info size={18} className="hidden md:block" />
                </button>
                <button className="p-1.5 md:p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition">
                  <MoreVertical size={16} className="md:hidden" />
                  <MoreVertical size={18} className="hidden md:block" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div 
              className="flex-1 overflow-y-auto p-3 md:p-4 space-y-4 bg-gray-50 dark:bg-gray-800"
              onScroll={handleScroll}
            >
              {messages?.length === 0 ? (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center px-4">
                    <div className="bg-gray-200 dark:bg-gray-700 rounded-full w-16 h-16 md:w-20 md:h-20 flex items-center justify-center mx-auto mb-4">
                      <Send size={24} className="md:hidden text-gray-500 dark:text-gray-400" />
                      <Send size={32} className="hidden md:block text-gray-500 dark:text-gray-400" />
                    </div>
                    <h4 className="text-base md:text-lg font-medium dark:text-white mb-2">No messages yet</h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                      Send a message to start the conversation
                    </p>
                    <div className="flex flex-wrap gap-2 justify-center">
                      <span className="px-2 py-1 md:px-3 md:py-1 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 rounded-full text-xs md:text-sm">
                        👋 Say hello
                      </span>
                      <span className="px-2 py-1 md:px-3 md:py-1 bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-300 rounded-full text-xs md:text-sm">
                        😊 Send emoji
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                messages?.map((msg, index) => (
                  <MessageBubble
                    key={msg._id}
                    message={msg}
                    isOwnMessage={msg.senderId === currentUser._id}
                    onDelete={() => {}}
                    onEdit={() => setEditingMessage(msg)}
                    onReply={() => setReplyingTo(msg)}
                  />
                ))
              )}
              
              <TypingIndicator users={typingUsers || []} />
              <div ref={messagesEndRef} />
            </div>

            {/* Scroll to bottom button */}
            {showScrollButton && (
              <button
                onClick={scrollToBottom}
                className="absolute bottom-24 right-4 md:bottom-28 md:right-8 bg-blue-500 text-white rounded-full px-3 py-1.5 md:px-4 md:py-2 text-sm md:text-base shadow-lg hover:bg-blue-600 transition flex items-center gap-2 z-10"
              >
                <span>↓</span>
                New messages
              </button>
            )}

            {/* Reply/Edit indicator */}
            {(replyingTo || editingMessage) && (
              <div className="border-t dark:border-gray-700 p-2 bg-gray-50 dark:bg-gray-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {replyingTo ? (
                      <>
                        <Reply size={14} className="text-blue-500" />
                        <span className="text-xs text-gray-600 dark:text-gray-400">
                          Replying to: {replyingTo.content.substring(0, 20)}...
                        </span>
                      </>
                    ) : (
                      <>
                        <Edit size={14} className="text-green-500" />
                        <span className="text-xs text-gray-600 dark:text-gray-400">
                          Editing message...
                        </span>
                      </>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      setReplyingTo(null)
                      setEditingMessage(null)
                    }}
                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            )}

            {/* Message Input */}
            <div className="border-t dark:border-gray-700 p-2 md:p-4 bg-white dark:bg-gray-900">
              <div className="flex gap-1 md:gap-2 items-center">
                {/* Emoji Picker Button */}
                <button
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="p-1.5 md:p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition"
                >
                  <Smile size={18} className="md:hidden" />
                  <Smile size={20} className="hidden md:block" />
                </button>

                {/* File Upload Button */}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageUpload}
                  className="hidden"
                  accept="image/*"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="p-1.5 md:p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition"
                >
                  <Paperclip size={18} className="md:hidden" />
                  <Paperclip size={20} className="hidden md:block" />
                </button>

                {/* Emoji Picker Popup */}
                {showEmojiPicker && (
                  <div className="absolute bottom-20 left-2 md:left-4 z-50">
                    <div className="scale-90 md:scale-100 origin-bottom-left">
                      <EmojiPicker onEmojiClick={handleEmojiClick} />
                    </div>
                  </div>
                )}

                <input
                  type="text"
                  value={message}
                  onChange={(e) => {
                    setMessage(e.currentTarget.value)
                    handleTyping()
                  }}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleSendMessage()
                    }
                  }}
                  placeholder={replyingTo ? "Type your reply..." : "Type a message..."}
                  className="flex-1 p-2 md:p-3 text-sm md:text-base border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                />
                
                {/* Send button */}
                <button
                  onClick={handleSendMessage}
                  disabled={!message.trim()}
                  className={`px-3 md:px-6 py-2 md:py-3 rounded-xl transition flex items-center gap-1 md:gap-2 ${
                    message.trim() 
                      ? 'bg-blue-500 text-white hover:bg-blue-600' 
                      : 'bg-gray-200 text-gray-400 dark:bg-gray-700 dark:text-gray-500 cursor-not-allowed'
                  }`}
                >
                  <Send size={16} className="md:hidden" />
                  <Send size={18} className="hidden md:block" />
                  <span className="hidden md:inline">Send</span>
                </button>
              </div>

              {/* Typing status */}
              {typingUsers && typingUsers.length > 0 && (
                <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 px-1">
                  {typingUsers.map(u => u.name.split(' ')[0]).join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="h-full flex items-center justify-center bg-gray-50 dark:bg-gray-800">
            <div className="text-center max-w-md px-4 md:p-8">
              <div className="bg-gradient-to-r from-blue-500 to-purple-500 rounded-full w-20 h-20 md:w-24 md:h-24 flex items-center justify-center mx-auto mb-4 md:mb-6 shadow-lg">
                <MessageCircle size={30} className="md:hidden text-white" />
                <MessageCircle size={40} className="hidden md:block text-white" />
              </div>
              <h2 className="text-xl md:text-2xl font-bold dark:text-white mb-2 md:mb-3">
                Welcome to Tars Chat!
              </h2>
              <p className="text-sm md:text-base text-gray-600 dark:text-gray-400 mb-4 md:mb-6">
                Select a user from the sidebar to start messaging. Experience real-time chat with typing indicators, online status, and more!
              </p>
              <div className="grid grid-cols-2 gap-2 md:gap-3">
                <div className="p-2 md:p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="w-6 h-6 md:w-8 md:h-8 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-1 md:mb-2">
                    <CheckCheck size={12} className="md:hidden text-white" />
                    <CheckCheck size={16} className="hidden md:block text-white" />
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Read Receipts</p>
                </div>
                <div className="p-2 md:p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <div className="w-6 h-6 md:w-8 md:h-8 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-1 md:mb-2">
                    <Users size={12} className="md:hidden text-white" />
                    <Users size={16} className="hidden md:block text-white" />
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Online Status</p>
                </div>
                <div className="p-2 md:p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <div className="w-6 h-6 md:w-8 md:h-8 bg-purple-500 rounded-full flex items-center justify-center mx-auto mb-1 md:mb-2">
                    <Smile size={12} className="md:hidden text-white" />
                    <Smile size={16} className="hidden md:block text-white" />
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Emoji Reactions</p>
                </div>
                <div className="p-2 md:p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                  <div className="w-6 h-6 md:w-8 md:h-8 bg-orange-500 rounded-full flex items-center justify-center mx-auto mb-1 md:mb-2">
                    <Edit size={12} className="md:hidden text-white" />
                    <Edit size={16} className="hidden md:block text-white" />
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Edit Messages</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Mobile menu button */}
      {!showMobileSidebar && (
        <button
          className="md:hidden fixed bottom-4 left-4 bg-blue-500 text-white p-3 rounded-full shadow-lg z-20 hover:bg-blue-600 transition"
          onClick={() => setShowMobileSidebar(true)}
        >
          <Menu size={24} />
        </button>
      )}
    </div>
  )
}
