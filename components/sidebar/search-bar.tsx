"use client";

import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useUser } from "@clerk/nextjs";
import { Id } from "@/convex/_generated/dataModel";

interface SearchBarProps {
  onSelectUser: (userId: Id<"users">) => void;
}

export function SearchBar({ onSelectUser }: SearchBarProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [showResults, setShowResults] = useState(false);
  const { user } = useUser();
  
  const currentUser = useQuery(api.users.getUserByClerkId, 
    user?.id ? { clerkId: user.id } : "skip"
  );

  const users = useQuery(api.users.searchUsers, 
    searchTerm && currentUser?._id ? { searchTerm, currentUserId: currentUser._id } : "skip"
  );

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input
          placeholder="Search users..."
          className="pl-10"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setShowResults(true);
          }}
          onFocus={() => setShowResults(true)}
        />
      </div>
      
      {showResults && searchTerm && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-lg border max-h-64 overflow-y-auto z-50">
          {users?.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              No users found
            </div>
          ) : (
            users?.map((user) => (
              <button
                key={user._id}
                className="w-full p-3 hover:bg-gray-50 flex items-center gap-3"
                onClick={() => {
                  onSelectUser(user._id);
                  setShowResults(false);
                  setSearchTerm("");
                }}
              >
                <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div className="text-left">
                  <div className="font-medium">{user.name}</div>
                  <div className="text-sm text-gray-500">{user.email}</div>
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}