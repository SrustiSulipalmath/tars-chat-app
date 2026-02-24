import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const getOrCreateConversation = mutation({
  args: {
    currentUserId: v.id("users"),
    otherUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const conversations = await ctx.db.query("conversations").collect();
    
    const existingConversation = conversations.find((conv) => {
      if (conv.isGroup) return false;
      return conv.participants.includes(args.currentUserId) && 
             conv.participants.includes(args.otherUserId);
    });

    if (existingConversation) {
      return existingConversation._id;
    }

    const conversationId = await ctx.db.insert("conversations", {
      participants: [args.currentUserId, args.otherUserId],
      isGroup: false,
      createdAt: Date.now(),
    });

    return conversationId;
  },
});

export const getUserConversations = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const conversations = await ctx.db.query("conversations").collect();
    
    const userConversations = conversations.filter((conv) =>
      conv.participants.includes(args.userId)
    );

    const conversationsWithDetails = await Promise.all(
      userConversations.map(async (conv) => {
        const lastMessage = conv.lastMessageId
          ? await ctx.db.get(conv.lastMessageId)
          : null;

        const otherParticipantId = conv.participants.find(
          (id) => id !== args.userId
        );
        
        const otherUser = otherParticipantId
          ? await ctx.db.get(otherParticipantId)
          : null;

        const messages = await ctx.db
          .query("messages")
          .withIndex("by_conversation", (q) => q.eq("conversationId", conv._id))
          .collect();

        const unreadCount = messages.filter((msg) => 
          msg.senderId !== args.userId && 
          msg.createdAt > (otherUser?.lastSeen || 0)
        ).length;

        return {
          ...conv,
          otherUser,
          lastMessage,
          unreadCount,
        };
      })
    );

    return conversationsWithDetails.sort(
      (a, b) => (b.lastMessage?.createdAt || 0) - (a.lastMessage?.createdAt || 0)
    );
  },
});