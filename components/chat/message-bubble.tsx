"use client";

import { Doc } from "@/convex/_generated/dataModel";
import { MoreVertical, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { formatMessageTime } from "@/lib/utils";

interface MessageBubbleProps {
  message: Doc<"messages"> & { sender: Doc<"users"> };
  isOwnMessage: boolean;
  onDelete?: () => void;
}

export function MessageBubble({ message, isOwnMessage, onDelete }: MessageBubbleProps) {
  const deleteMessage = useMutation(api.messages.deleteMessage);

  const handleDelete = async () => {
    await deleteMessage({ messageId: message._id, userId: message.senderId });
    onDelete?.();
  };

  return (
    <div className={cn(
      "flex gap-2 mb-4",
      isOwnMessage ? "justify-end" : "justify-start"
    )}>
      {!isOwnMessage && (
        <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white flex-shrink-0">
          {message.sender.name.charAt(0).toUpperCase()}
        </div>
      )}
      
      <div className={cn(
        "max-w-[70%] group",
        isOwnMessage ? "items-end" : "items-start"
      )}>
        {!isOwnMessage && (
          <div className="text-sm text-gray-500 mb-1">
            {message.sender.name}
          </div>
        )}
        
        <div className="relative">
          <div className={cn(
            "rounded-2xl px-4 py-2",
            isOwnMessage 
              ? "bg-blue-500 text-white" 
              : message.type === "deleted"
                ? "bg-gray-100 text-gray-500 italic"
                : "bg-gray-100"
          )}>
            {message.content}
          </div>
          
          {isOwnMessage && message.type !== "deleted" && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="absolute -right-8 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <MoreVertical className="h-4 w-4 text-gray-500" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={handleDelete} className="text-red-600">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
        
        <div className="text-xs text-gray-400 mt-1">
          {formatMessageTime(message.createdAt)}
        </div>
      </div>
    </div>
  );
}