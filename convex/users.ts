import { v } from 'convex/values'
import { mutation, query } from './_generated/server'

export const list = query({
  handler: async (ctx) => {
    return await ctx.db.query('users').collect()
  },
})

export const store = mutation({
  args: {
    clerkId: v.string(),
    email: v.string(),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    console.log("🟢 [users.store] Called with clerkId:", args.clerkId);
    
    const existing = await ctx.db
      .query('users')
      .withIndex('by_clerkId', (q) => q.eq('clerkId', args.clerkId))
      .first()

    if (!existing) {
      console.log("🟢 [users.store] Creating new user");
      await ctx.db.insert('users', {
        clerkId: args.clerkId,
        email: args.email,
        name: args.name,
        isOnline: true,
        lastSeen: Date.now(),
      })
    } else {
      console.log("🟢 [users.store] Updating existing user");
      await ctx.db.patch(existing._id, {
        lastSeen: Date.now(),
        isOnline: true,
      })
    }
  },
})

export const getUserByClerkId = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('users')
      .withIndex('by_clerkId', (q) => q.eq('clerkId', args.clerkId))
      .first()
  },
})