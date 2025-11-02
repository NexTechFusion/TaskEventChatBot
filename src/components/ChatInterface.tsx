import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Loader2, AlertCircle, Wifi, WifiOff, Sparkles, ChevronUp } from "lucide-react";
import { TaskPreview } from "@/components/TaskPreview";
import { EventPreview } from "@/components/EventPreview";
import { StreamingProgress } from "@/components/StreamingProgress";
import { useChat, ChatMessage } from "@/hooks/useChat";
import { useStreamingChat } from "@/hooks/useStreamingChat";
import { useToast } from "@/hooks/use-toast";
import { ConnectionStatus, createConnectionMonitor } from "@/lib/connection-status";
import ReactMarkdown from "react-markdown";
import { motion, AnimatePresence } from "framer-motion";
import { MatrixAvatar } from "./MatrixAvatar";

interface Message extends ChatMessage {
  tasks?: Array<{
    id: string;
    title: string;
    description?: string;
    status: "pending" | "in_progress" | "completed" | "cancelled";
    priority: "low" | "medium" | "high" | "urgent";
    dueDate?: Date | string;
    tags?: string[];
    createdAt?: Date | string;
    updatedAt?: Date | string;
    metadata?: Record<string, any>;
  }>;
  events?: Array<{
    id: string;
    title: string;
    description?: string;
    startDate: Date | string;
    endDate: Date | string;
    location?: string;
    type: "meeting" | "appointment" | "deadline" | "reminder" | "other";
    status: "scheduled" | "in_progress" | "completed" | "cancelled";
    attendees?: string[];
    createdAt?: Date | string;
    updatedAt?: Date | string;
    metadata?: Record<string, any>;
  }>;
}

export const ChatInterface = () => {
  const [input, setInput] = useState("");
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('online');
  const [useStreaming, setUseStreaming] = useState(true); // Toggle for streaming mode
  const [messagesToShow, setMessagesToShow] = useState(10); // Show last 10 messages
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Monitor connection status
  useEffect(() => {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    const monitor = createConnectionMonitor(apiUrl);
    
    const unsubscribe = monitor.subscribe((status) => {
      setConnectionStatus(status);
      
      if (status === 'offline') {
        toast({
          title: "Connection Lost",
          description: "You're offline. Messages will be sent when connection is restored.",
          variant: "destructive",
        });
      } else if (status === 'online') {
      }
    });

    return () => {
      unsubscribe();
      monitor.destroy();
    };
  }, [toast]);

  // Regular chat hook
  const {
    messages: regularMessages,
    isLoading,
    sendMessage,
    clearMessages,
    startNewChat,
    userId,
  } = useChat({
    onError: (error) => {
      toast({
        title: "Error",
        description: error,
        variant: "destructive",
      });
    },
    onSuccess: (response) => {
      console.log('Chat response received:', response);
    },
  });

  // Streaming chat hook
  const {
    messages: streamingMessages,
    isStreaming,
    sendStreamingMessage,
    cancelStreaming,
  } = useStreamingChat({
    onError: (error) => {
      toast({
        title: "Streaming Error",
        description: error,
        variant: "destructive",
      });
    },
    onStepUpdate: (step) => {
      console.log('Step update:', step);
    },
  });

  // Use either regular or streaming messages based on mode
  const chatMessages = useStreaming ? streamingMessages : regularMessages;

  // Convert chat messages to display messages
  const allMessages: Message[] = chatMessages.map(msg => {
    const tasks = msg.actions
      ?.filter(action => action.type === 'task')
      .map((action, actionIndex) => ({
        id: action.data.id || `task-${msg.id}-${actionIndex}`,
        title: action.data.title || 'Task',
        description: action.data.description,
        status: (action.data.status || 'pending') as "pending" | "in_progress" | "completed" | "cancelled",
        priority: (action.data.priority || 'medium') as "low" | "medium" | "high" | "urgent",
        dueDate: action.data.dueDate || action.data.due_date,
        tags: action.data.tags,
        createdAt: action.data.createdAt || action.data.created_at,
        updatedAt: action.data.updatedAt || action.data.updated_at,
        metadata: action.data.metadata,
      }));
    
    const events = msg.actions
      ?.filter(action => action.type === 'event')
      .map((action, actionIndex) => ({
        id: action.data.id || `event-${msg.id}-${actionIndex}`,
        title: action.data.title || 'Event',
        description: action.data.description,
        startDate: action.data.startDate || action.data.start_date || new Date().toISOString(),
        endDate: action.data.endDate || action.data.end_date || new Date().toISOString(),
        location: action.data.location,
        type: (action.data.type || 'other') as "meeting" | "appointment" | "deadline" | "reminder" | "other",
        status: (action.data.status || 'scheduled') as "scheduled" | "in_progress" | "completed" | "cancelled",
        attendees: action.data.attendees,
        createdAt: action.data.createdAt || action.data.created_at,
        updatedAt: action.data.updatedAt || action.data.updated_at,
        metadata: action.data.metadata,
      }));
    
    // Debug logging
    if (tasks && tasks.length > 0) {
      console.log('📋 Rendering tasks:', tasks);
    }
    if (events && events.length > 0) {
      console.log('📅 Rendering events:', events);
    }
    
    return {
      ...msg,
      tasks,
      events,
    };
  });

  // Show only recent messages based on messagesToShow count
  const messages: Message[] = (() => {
    if (allMessages.length === 0) return [];
    
    // Show the last N messages based on messagesToShow
    const startIndex = Math.max(0, allMessages.length - messagesToShow);
    return allMessages.slice(startIndex);
  })();

  const handleSend = async () => {
    if (!input.trim() || isLoading || isStreaming) return;

    // Reset to show last 10 messages when sending new message
    setMessagesToShow(10);

    if (useStreaming) {
      await sendStreamingMessage(input);
    } else {
      await sendMessage(input);
    }
    setInput("");
  };

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Connection Status Bar */}
      {connectionStatus !== 'online' && (
        <div className={`flex-shrink-0 px-4 py-2 text-sm flex items-center gap-2 ${
          connectionStatus === 'offline' 
            ? 'bg-destructive text-destructive-foreground' 
            : 'bg-yellow-500 text-white'
        }`}>
          {connectionStatus === 'offline' ? (
            <>
              <WifiOff className="h-4 w-4" />
              <span>You're offline. Reconnecting...</span>
            </>
          ) : (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Reconnecting...</span>
            </>
          )}
        </div>
      )}
      
      <div ref={scrollAreaRef} className="chat-scroll-area flex-1 min-h-0 p-4 relative">
        {/* Matrix Avatar Background */}
        <MatrixAvatar />
        
        <div className="max-w-3xl mx-auto space-y-4 relative z-10">
          {/* Show load more button if there are more messages */}
          {messagesToShow < allMessages.length && (
            <div className="text-center py-2">
              <button
                onClick={() => setMessagesToShow(prev => Math.min(prev + 10, allMessages.length))}
                className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground bg-muted hover:bg-muted/80 px-4 py-2 rounded-full transition-colors"
              >
                <ChevronUp className="h-3 w-3" />
                <span>Load older messages ({allMessages.length - messagesToShow} hidden)</span>
              </button>
            </div>
          )}
          <AnimatePresence mode="popLayout">
            {messages.map((message, index) => {
              const isLastMessage = index === messages.length - 1;
              // Apply height to last AI message (including streaming/loading)
              const isLastAIMessage = isLastMessage && message.role === 'assistant';
              
              return (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ type: "spring", stiffness: 300, damping: 25, delay: index * 0.05 }}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`rounded-2xl px-6 py-4 max-w-[85%] ${
                    isLastAIMessage ? "min-h-[75vh]" : ""
                  } ${
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : message.error
                      ? "bg-destructive/10 border border-destructive/20"
                      : (message as any).isStreaming
                      ? "p-4"
                      : ""
                  }`}
                >
                  {message.isLoading ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm">Thinking...</span>
                    </div>
                  ) : (message as any).isStreaming ? (
                    // Streaming mode - show progress
                    <StreamingProgress
                      steps={(message as any).steps || []}
                      currentMessage={(message as any).currentMessage}
                      isComplete={false}
                    />
                  ) : (
                    <>
                      {message.role === "user" ? (
                        <p className="text-sm leading-relaxed">{String(message.content || '')}</p>
                      ) : (
                        <>
                          <div className="text-sm leading-relaxed prose prose-sm max-w-none dark:prose-invert prose-a:text-blue-600 dark:prose-a:text-blue-400 prose-a:underline prose-a:font-medium hover:prose-a:text-blue-800 dark:hover:prose-a:text-blue-300">
                            <ReactMarkdown
                              components={{
                                a: ({ node, ...props }) => (
                                  <a
                                    {...props}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline font-medium transition-colors"
                                  />
                                ),
                              }}
                            >
                              {typeof message.content === 'string' 
                                ? message.content 
                                : JSON.stringify(message.content, null, 2)}
                            </ReactMarkdown>
                          </div>
                          {/* Show completed steps if they exist */}
                          {(message as any).steps && (message as any).steps.length > 0 && (
                            <div className="mt-4 pt-4 border-t border-border/50">
                              <details className="group">
                                <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2">
                                  <Sparkles className="h-3 w-3" />
                                  <span>View execution steps ({(message as any).steps.length})</span>
                                </summary>
                                <div className="mt-3">
                                  <StreamingProgress
                                    steps={(message as any).steps}
                                    isComplete={true}
                                  />
                                </div>
                              </details>
                            </div>
                          )}
                        </>
                      )}
                      {message.error && (
                        <div className="flex items-center gap-2 mt-2 text-destructive text-xs">
                          <AlertCircle className="h-3 w-3" />
                          <span>{message.error}</span>
                        </div>
                      )}
                      {message.tasks && message.tasks.length > 0 && (
                        <div className="mt-3">
                          <TaskPreview tasks={message.tasks} />
                        </div>
                      )}
                      {message.events && message.events.length > 0 && (
                        <div className="mt-3">
                          <EventPreview events={message.events} />
                        </div>
                      )}
                    </>
                  )}
                </div>
              </motion.div>
            );
            })}
          </AnimatePresence>
        </div>
      </div>

      <div className="flex-shrink-0 border-t border-border bg-card p-4">
        <div className="max-w-3xl mx-auto space-y-3">
          {/* Mode Toggle and Input */}
          <div className="flex gap-2 items-center">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
              placeholder="Ask me anything..."
              className="flex-1 bg-background border-border rounded-full px-4 h-9 text-sm"
              disabled={isLoading || isStreaming}
            />
            
            <Button
              onClick={handleSend}
              size="icon"
              className="rounded-full h-9 w-9"
              disabled={isLoading || isStreaming || !input.trim() || connectionStatus === 'offline'}
              title={connectionStatus === 'offline' ? 'Waiting for connection...' : 'Send message'}
            >
              {isLoading || isStreaming ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : connectionStatus === 'offline' ? (
                <WifiOff className="h-4 w-4" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>

            {isStreaming && (
              <motion.button
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                onClick={cancelStreaming}
                className="text-xs font-medium px-2 py-1.5 rounded-full bg-red-100 dark:bg-red-950/30 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-950/50"
              >
              Cancel
              </motion.button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
