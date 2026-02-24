import { v } from 'convex/values'
import { mutation, query } from './_generated/server'

export const send = mutation({
  args: {
    conversationId: v.id('conversations'),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    console.log("Send message mutation called");
    
    const identity = await ctx.auth.getUserIdentity()
    console.log("Identity:", identity ? "Found" : "Not found");
    
    if (!identity) {
      throw new Error('Not authenticated')
    }

    // Get the sender from the database using Clerk ID
    const sender = await ctx.db
      .query('users')
      .withIndex('by_clerkId', (q) => q.eq('clerkId', identity.subject))
      .first()

    if (!sender) {
      throw new Error('Sender not found')
    }

    const messageId = await ctx.db.insert('messages', {
      conversationId: args.conversationId,
      senderId: sender._id,
      content: args.content,
      type: 'text',
      createdAt: Date.now(),
    })

    // Update conversation's last message
    await ctx.db.patch(args.conversationId, {
      lastMessageId: messageId,
      lastMessageTime: Date.now(),
    })

    return messageId
  },
})

export const list = query({
  args: { conversationId: v.id('conversations') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) return []

    const messages = await ctx.db
      .query('messages')
      .withIndex('by_conversation', (q) => q.eq('conversationId', args.conversationId))
      .order('desc')
      .collect()

    // Get sender details for each message
    const messagesWithSender = await Promise.all(
      messages.map(async (msg) => {
        const sender = await ctx.db.get(msg.senderId)
        return {
          ...msg,
          sender,
        }
      })
    )

    return messagesWithSender.reverse()
  },
})

export const deleteMessage = mutation({
  args: {
    messageId: v.id('messages'),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      throw new Error('Not authenticated')
    }

    const message = await ctx.db.get(args.messageId)
    
    if (!message) {
      throw new Error('Message not found')
    }

    // Get the sender from the database
    const sender = await ctx.db
      .query('users')
      .withIndex('by_clerkId', (q) => q.eq('clerkId', identity.subject))
      .first()

    if (!sender || message.senderId !== sender._id) {
      throw new Error('Cannot delete this message')
    }

    await ctx.db.patch(args.messageId, {
      content: 'This message was deleted',
      type: 'deleted',
      updatedAt: Date.now(),
    })
  },
})

export const addReaction = mutation({
  args: {
    messageId: v.id('messages'),
    emoji: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      throw new Error('Not authenticated')
    }

    const message = await ctx.db.get(args.messageId)
    if (!message) return

    const sender = await ctx.db
      .query('users')
      .withIndex('by_clerkId', (q) => q.eq('clerkId', identity.subject))
      .first()

    if (!sender) return

    const reactions = message.reactions || []
    const existingReaction = reactions.find(
      (r) => r.userId === sender._id && r.emoji === args.emoji
    )

    if (existingReaction) {
      // Remove reaction
      await ctx.db.patch(args.messageId, {
        reactions: reactions.filter(
          (r) => !(r.userId === sender._id && r.emoji === args.emoji)
        ),
      })
    } else {
      // Add reaction
      await ctx.db.patch(args.messageId, {
        reactions: [...reactions, { userId: sender._id, emoji: args.emoji }],
      })
    }
  },
})