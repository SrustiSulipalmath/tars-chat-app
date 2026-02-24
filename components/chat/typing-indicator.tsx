"use client";

interface TypingIndicatorProps {
  users: Array<{ name: string }>;
}

export function TypingIndicator({ users }: TypingIndicatorProps) {
  if (users.length === 0) return null;

  const names = users.map((u) => u.name.split(" ")[0]).join(" and ");
  const text = users.length === 1 
    ? `${names} is typing`
    : `${names} are typing`;

  return (
    <div className="flex items-center gap-2 text-sm text-gray-500 py-2">
      <div className="flex gap-1">
        <span className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
        <span className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
        <span className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
      </div>
      <span>{text}</span>
    </div>
  );
}