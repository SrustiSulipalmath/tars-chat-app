"use client";

import { Doc } from "@/convex/_generated/dataModel";
import { MoreVertical, Trash2, Edit, Copy, Reply, Smile } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { formatMessageTime } from "@/lib/utils";
import { useState } from "react";
import EmojiPicker from "emoji-picker-react";

interface MessageBubbleProps {
  message: Doc<"messages"> & { sender: Doc<"users"> };
  isOwnMessage: boolean;
  onDelete?: () => void;
  onEdit?: () => void;
  onReply?: () => void;
}

export function MessageBubble({ 
  message, 
  isOwnMessage, 
  onDelete,
  onEdit,
  onReply 
}: MessageBubbleProps) {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const deleteMessage = useMutation(api.messages.deleteMessage);
  const addReaction = useMutation(api.messages.addReaction);

  const handleDelete = async () => {
    await deleteMessage({ messageId: message._id });
    onDelete?.();
  };

  const handleReaction = async (emojiData: any) => {
    await addReaction({ 
      messageId: message._id, 
      emoji: emojiData.emoji 
    });
    setShowEmojiPicker(false);
  };

  // Group reactions by emoji
  const reactionCounts = message.reactions?.reduce((acc: any, reaction) => {
    acc[reaction.emoji] = (acc[reaction.emoji] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className={cn(
      "flex gap-2 mb-4 message-animation group",
      isOwnMessage ? "justify-end" : "justify-start"
    )}>
      {!isOwnMessage && (
        <div className="relative flex-shrink-0">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-medium shadow-md">
            {message.sender.name.charAt(0).toUpperCase()}
          </div>
          {/* REMOVED the online indicator from here */}
        </div>
      )}
      
      <div className={cn(
        "max-w-[70%]",
        isOwnMessage ? "items-end" : "items-start"
      )}>
        {!isOwnMessage && (
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-1 ml-1">
            {message.sender.name}
          </div>
        )}
        
        <div className="relative">
          <div className={cn(
            "message-bubble",
            isOwnMessage 
              ? "bg-blue-500 text-white rounded-2xl rounded-br-none px-4 py-2" 
              : message.type === "deleted"
                ? "bg-gray-100 text-gray-500 italic dark:bg-gray-800 dark:text-gray-400 rounded-2xl px-4 py-2"
                : "bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100 rounded-2xl rounded-bl-none px-4 py-2"
          )}>
            {message.content}
          </div>
          
          {/* Reactions display */}
          {reactionCounts && Object.keys(reactionCounts).length > 0 && (
            <div className="flex gap-1 mt-1 absolute -bottom-4 left-0">
              {Object.entries(reactionCounts).map(([emoji, count]) => (
                <span 
                  key={emoji} 
                  className="bg-white dark:bg-gray-800 rounded-full px-1.5 py-0.5 text-xs shadow-sm border dark:border-gray-700"
                >
                  {emoji} {count as number}
                </span>
              ))}
            </div>
          )}
          
          {/* Message actions menu */}
          {isOwnMessage && message.type !== "deleted" && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="absolute -right-8 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
                  <MoreVertical className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => setShowEmojiPicker(true)}>
                  <Smile className="h-4 w-4 mr-2" />
                  Add Reaction
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onReply}>
                  <Reply className="h-4 w-4 mr-2" />
                  Reply
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onEdit}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigator.clipboard.writeText(message.content)}>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleDelete} className="text-red-600 dark:text-red-400">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Emoji picker popup */}
          {showEmojiPicker && (
            <div className="absolute bottom-8 left-0 z-50">
              <EmojiPicker onEmojiClick={handleReaction} />
            </div>
          )}
        </div>
        
        <div className="text-xs text-gray-400 dark:text-gray-500 mt-1 ml-1">
          {formatMessageTime(message.createdAt)}
          {message.type === "deleted" && " • Deleted"}
          {message.updatedAt && " • Edited"}
        </div>
      </div>

      {isOwnMessage && (
        <div className="relative flex-shrink-0">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-white font-medium shadow-md">
            {message.sender.name.charAt(0).toUpperCase()}
          </div>
        </div>
      )}
    </div>
  );
}