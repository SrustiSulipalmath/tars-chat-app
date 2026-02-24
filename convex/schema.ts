
import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

export default defineSchema({
  users: defineTable({
    clerkId: v.string(),
    email: v.string(),
    name: v.string(),
    isOnline: v.boolean(),
    lastSeen: v.number(),
  }).index('by_clerkId', ['clerkId']),

  conversations: defineTable({
    participants: v.array(v.id('users')),
    isGroup: v.boolean(),
    groupName: v.optional(v.string()),
    groupAvatar: v.optional(v.string()),
    lastMessageId: v.optional(v.id('messages')),
    lastMessageTime: v.optional(v.number()),
    createdAt: v.number(),
  }).index('by_participants', ['participants']),

  messages: defineTable({
    conversationId: v.id('conversations'),
    senderId: v.id('users'),
    content: v.string(),
    type: v.union(v.literal('text'), v.literal('deleted')),
    reactions: v.optional(
      v.array(
        v.object({
          emoji: v.string(),
          userId: v.id('users'),
        })
      )
    ),
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
  })
    .index('by_conversation', ['conversationId'])
    .index('by_sender', ['senderId']),

  typingIndicators: defineTable({
    conversationId: v.id('conversations'),
    userId: v.id('users'),
    isTyping: v.boolean(),
    updatedAt: v.number(),
  })
    .index('by_conversation', ['conversationId'])
    .index('by_user', ['userId']),

  presence: defineTable({
    userId: v.id('users'),
    status: v.union(v.literal('online'), v.literal('offline')),
    updatedAt: v.number(),
  }).index('by_user', ['userId']),
})
