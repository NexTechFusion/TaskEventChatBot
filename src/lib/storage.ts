/**
 * localStorage utilities for persisting chat state
 * Provides type-safe storage operations with error handling
 */

const STORAGE_KEYS = {
  USER_ID: 'task-track-bot:user-id',
  SESSION_ID: 'task-track-bot:session-id',
  CONVERSATION_ID: 'task-track-bot:conversation-id',
  CHAT_HISTORY: 'task-track-bot:chat-history',
  LAST_ACTIVITY: 'task-track-bot:last-activity',
} as const;

// Session expiry time (24 hours)
const SESSION_EXPIRY_MS = 24 * 60 * 60 * 1000;

/**
 * Generate a unique user ID
 */
export const generateUserId = (): string => {
  return `user-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
};

/**
 * Generate a unique session ID
 */
export const generateSessionId = (): string => {
  return `session-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
};

/**
 * Generate a unique conversation ID
 */
export const generateConversationId = (): string => {
  return `conversation-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
};

/**
 * Get or create user ID
 */
export const getUserId = (): string => {
  try {
    let userId = localStorage.getItem(STORAGE_KEYS.USER_ID);
    
    if (!userId) {
      userId = generateUserId();
      localStorage.setItem(STORAGE_KEYS.USER_ID, userId);
    }
    
    return userId;
  } catch (error) {
    console.error('Error accessing user ID:', error);
    // Generate a fallback userId even if localStorage fails
    return generateUserId();
  }
};

/**
 * Get or create session ID
 * Creates a new session if the last one expired
 */
export const getSessionId = (): string => {
  try {
    const lastActivity = localStorage.getItem(STORAGE_KEYS.LAST_ACTIVITY);
    const sessionId = localStorage.getItem(STORAGE_KEYS.SESSION_ID);
    
    // Check if session expired
    if (lastActivity && sessionId) {
      const lastActivityTime = new Date(lastActivity).getTime();
      const now = Date.now();
      
      if (now - lastActivityTime < SESSION_EXPIRY_MS) {
        // Session is still valid
        updateLastActivity();
        return sessionId;
      }
    }
    
    // Create new session
    const newSessionId = generateSessionId();
    localStorage.setItem(STORAGE_KEYS.SESSION_ID, newSessionId);
    updateLastActivity();
    
    return newSessionId;
  } catch (error) {
    console.error('Error accessing session ID:', error);
    return `session-${Date.now()}`;
  }
};

/**
 * Get or create conversation ID
 */
export const getConversationId = (): string => {
  try {
    let conversationId = localStorage.getItem(STORAGE_KEYS.CONVERSATION_ID);
    
    if (!conversationId) {
      conversationId = generateConversationId();
      localStorage.setItem(STORAGE_KEYS.CONVERSATION_ID, conversationId);
    }
    
    return conversationId;
  } catch (error) {
    console.error('Error accessing conversation ID:', error);
    return `conversation-${Date.now()}`;
  }
};

/**
 * Update last activity timestamp
 */
export const updateLastActivity = (): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.LAST_ACTIVITY, new Date().toISOString());
  } catch (error) {
    console.error('Error updating last activity:', error);
  }
};

/**
 * Save chat messages to localStorage
 */
export const saveChatHistory = (messages: any[]): void => {
  try {
    // Only save last 50 messages to avoid storage limits
    const messagesToSave = messages.slice(-50);
    localStorage.setItem(STORAGE_KEYS.CHAT_HISTORY, JSON.stringify(messagesToSave));
    updateLastActivity();
  } catch (error) {
    console.error('Error saving chat history:', error);
  }
};

/**
 * Load chat messages from localStorage
 */
export const loadChatHistory = (): any[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.CHAT_HISTORY);
    
    if (!stored) {
      return [];
    }
    
    const messages = JSON.parse(stored);
    
    // Convert timestamp strings back to Date objects
    return messages.map((msg: any) => ({
      ...msg,
      timestamp: new Date(msg.timestamp),
    }));
  } catch (error) {
    console.error('Error loading chat history:', error);
    return [];
  }
};

/**
 * Clear all chat data
 */
export const clearChatData = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEYS.CHAT_HISTORY);
    localStorage.removeItem(STORAGE_KEYS.CONVERSATION_ID);
    localStorage.removeItem(STORAGE_KEYS.LAST_ACTIVITY);
    // Keep user_id and session_id
  } catch (error) {
    console.error('Error clearing chat data:', error);
  }
};

/**
 * Start a new conversation
 */
export const startNewConversation = (): string => {
  try {
    clearChatData();
    const newConversationId = generateConversationId();
    localStorage.setItem(STORAGE_KEYS.CONVERSATION_ID, newConversationId);
    updateLastActivity();
    return newConversationId;
  } catch (error) {
    console.error('Error starting new conversation:', error);
    return `conversation-${Date.now()}`;
  }
};

/**
 * Check if session expired
 */
export const isSessionExpired = (): boolean => {
  try {
    const lastActivity = localStorage.getItem(STORAGE_KEYS.LAST_ACTIVITY);
    
    if (!lastActivity) {
      return true;
    }
    
    const lastActivityTime = new Date(lastActivity).getTime();
    const now = Date.now();
    
    return (now - lastActivityTime) >= SESSION_EXPIRY_MS;
  } catch (error) {
    console.error('Error checking session expiry:', error);
    return true;
  }
};

/**
 * Clear all storage (for logout)
 */
export const clearAllStorage = (): void => {
  try {
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
  } catch (error) {
    console.error('Error clearing all storage:', error);
  }
};

/**
 * Export storage for debugging
 */
export const exportStorage = (): Record<string, string | null> => {
  try {
    const data: Record<string, string | null> = {};
    Object.entries(STORAGE_KEYS).forEach(([key, storageKey]) => {
      data[key] = localStorage.getItem(storageKey);
    });
    return data;
  } catch (error) {
    console.error('Error exporting storage:', error);
    return {};
  }
};




