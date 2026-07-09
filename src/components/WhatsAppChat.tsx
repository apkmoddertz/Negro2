import React, { useState, useEffect, useRef } from "react";
import { 
  Send, 
  User, 
  Check, 
  CheckCircle2, 
  Clock, 
  MessageSquare, 
  Search, 
  ArrowLeft,
  Sparkles,
  Phone,
  Video,
  MoreVertical,
  Paperclip,
  ShieldCheck,
  Zap,
  X,
  Trash2,
  Settings,
  Link as LinkIcon,
  ExternalLink
} from "lucide-react";
import { doc, setDoc, collection, onSnapshot, query, where } from "firebase/firestore";
import { motion, AnimatePresence } from "motion/react";
import { auth } from "../firebase";

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

function handleFirestoreError(error: any, operationType: string, path: string | null) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export interface Agent {
  id: string;
  name: string;
  role: string;
  personality: string;
  imageUrl: string;
  status: "available" | "busy" | "offline";
}

export const DEFAULT_AGENTS: Agent[] = [
  {
    id: "olivia",
    name: "Olivia",
    role: "Manager",
    personality: "Professional, calm, experienced, and trusted. Used for important cases, escalations, and final decisions.",
    imageUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150",
    status: "available"
  },
  {
    id: "sophia",
    name: "Sophia",
    role: "Customer Support Agent",
    personality: "Friendly, helpful, patient, and welcoming. Used for general customer questions and first contact.",
    imageUrl: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150",
    status: "available"
  },
  {
    id: "alexander",
    name: "Alexander",
    role: "Senior Support Agent",
    personality: "Professional, confident, and solution-focused. Used for technical issues and complex requests.",
    imageUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150",
    status: "available"
  },
  {
    id: "william",
    name: "William",
    role: "Support Specialist",
    personality: "Reliable, respectful, and efficient. Used for assisting users and handling requests.",
    imageUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150",
    status: "available"
  }
];

interface WhatsAppChatProps {
  currentUser: any;
  isMainAdmin: boolean;
  userProfile: any;
  userMessages: any[];
  adminAllMessages: any[];
  allUsers: any[];
  db: any;
  sendFCMNotificationProgrammatic: (titleText: string, messageText: string) => Promise<void>;
  selectedUserId?: string | null;
  setSelectedUserId?: (id: string | null) => void;
  adminSettings: {
    isOnline: boolean;
    customGreeting: string;
    showAgentsOnAdmin?: boolean;
    showAgentsInChatBox?: boolean;
    defaultAgentId?: string;
  };
  setAdminSettings: React.Dispatch<React.SetStateAction<{
    isOnline: boolean;
    customGreeting: string;
    showAgentsOnAdmin?: boolean;
    showAgentsInChatBox?: boolean;
    defaultAgentId?: string;
  }>>;
  searchQuery?: string;
  setSearchQuery?: (q: string) => void;
}

export default function WhatsAppChat({
  currentUser,
  isMainAdmin,
  userProfile,
  userMessages,
  adminAllMessages,
  allUsers,
  db,
  sendFCMNotificationProgrammatic,
  selectedUserId: externalSelectedUserId,
  setSelectedUserId: externalSetSelectedUserId,
  adminSettings,
  setAdminSettings,
  searchQuery: externalSearchQuery,
  setSearchQuery: externalSetSearchQuery
}: WhatsAppChatProps) {
  // Chat input
  const [inputText, setInputText] = useState("");
  const [attachedImages, setAttachedImages] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [partnerTyping, setPartnerTyping] = useState(false);
  const typingTimeoutRef = useRef<any>(null);

  // Multi-agent support states
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string>("sophia");
  const [showAgentsModal, setShowAgentsModal] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);

  // Shortcut URL states
  const [showUrlShortcutModal, setShowUrlShortcutModal] = useState(false);
  const [urlShortcutTitle, setUrlShortcutTitle] = useState("");
  const [urlShortcutLink, setUrlShortcutLink] = useState("");

  // Subscription Orders states
  const [userOrders, setUserOrders] = useState<any[]>([]);
  const [allOrders, setAllOrders] = useState<any[]>([]);
  const [assignedOrderIds, setAssignedOrderIds] = useState<string[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const agentFileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Smooth Drag and Momentum Scrolling for PWA & Touch support
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const isDraggingChat = useRef(false);
  const dragStartY = useRef(0);
  const dragStartScrollTop = useRef(0);
  const dragVelocity = useRef(0);
  const dragLastY = useRef(0);
  const dragLastTime = useRef(0);
  const dragAnimFrame = useRef<number | null>(null);

  // Smooth Drag and Momentum Scrolling for Sidebar
  const sidebarContainerRef = useRef<HTMLDivElement | null>(null);
  const isDraggingSidebar = useRef(false);
  const sidebarDragStartY = useRef(0);
  const sidebarDragStartScrollTop = useRef(0);
  const sidebarDragVelocity = useRef(0);
  const sidebarDragLastY = useRef(0);
  const sidebarDragLastTime = useRef(0);
  const sidebarDragAnimFrame = useRef<number | null>(null);

  // Clean up animation frames on unmount
  useEffect(() => {
    return () => {
      if (dragAnimFrame.current) {
        cancelAnimationFrame(dragAnimFrame.current);
      }
      if (sidebarDragAnimFrame.current) {
        cancelAnimationFrame(sidebarDragAnimFrame.current);
      }
    };
  }, []);

  // Auto-resize textarea to fit content up to 6 lines (approx 144px)
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 144)}px`;
    }
  }, [inputText]);

  // Client-side image compression helper
  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          let width = img.width;
          let height = img.height;
          const maxDim = 640;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const compressed = canvas.toDataURL("image/jpeg", 0.7); // compress to JPEG 70% quality
            resolve(compressed);
          } else {
            resolve(reader.result as string);
          }
        };
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // File picker handler
  const handleAttachmentClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const urls: string[] = [];
    for (let i = 0; i < files.length; i++) {
      try {
        const compressed = await compressImage(files[i]);
        urls.push(compressed);
      } catch (err) {
        console.error("Error loading image:", err);
      }
    }
    setAttachedImages(prev => [...prev, ...urls]);
    e.target.value = "";
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;
    const urls: string[] = [];
    for (let i = 0; i < files.length; i++) {
      if (files[i].type.startsWith("image/")) {
        try {
          const compressed = await compressImage(files[i]);
          urls.push(compressed);
        } catch (err) {
          console.error("Error loading dropped image:", err);
        }
      }
    }
    if (urls.length > 0) {
      setAttachedImages(prev => [...prev, ...urls]);
    }
  };

  // Sync and seed support agents
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "agents"), (snapshot) => {
      if (!snapshot.empty) {
        const loaded = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Agent));
        const sorted = ["olivia", "sophia", "alexander", "william"].map(id => {
          const found = loaded.find(a => a.id === id);
          const orig = DEFAULT_AGENTS.find(a => a.id === id)!;
          return found || orig;
        });
        setAgents(sorted);
      } else {
        if (isMainAdmin) {
          DEFAULT_AGENTS.forEach(async (agent) => {
            try {
              await setDoc(doc(db, "agents", agent.id), agent);
            } catch (e) {
              console.error("Error seeding agent:", e);
            }
          });
        }
        setAgents(DEFAULT_AGENTS);
      }
    }, (error) => {
      console.error("Error listening to agents:", error);
    });
    return () => unsubscribe();
  }, [db, isMainAdmin]);

  // Sync subscription orders
  useEffect(() => {
    if (!currentUser) {
      setUserOrders([]);
      return;
    }
    if (isMainAdmin) {
      const q = collection(db, "orders");
      const unsubscribe = onSnapshot(q, (snapshot) => {
        if (!snapshot.empty) {
          const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          list.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          setAllOrders(list);
        } else {
          setAllOrders([]);
        }
      }, (err) => {
        console.error("Error loading all orders in chat:", err);
      });
      return () => unsubscribe();
    } else {
      const q = query(collection(db, "orders"), where("userId", "==", currentUser.uid));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        if (!snapshot.empty) {
          const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          list.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          setUserOrders(list);
        } else {
          setUserOrders([]);
        }
      }, (err) => {
        console.error("Error loading user orders in chat:", err);
      });
      return () => unsubscribe();
    }
  }, [currentUser, isMainAdmin, db]);
  
  // Selected user for Admin chat
  const [localSelectedUserId, localSetSelectedUserId] = useState<string | null>(null);
  const selectedUserId = externalSelectedUserId !== undefined ? externalSelectedUserId : localSelectedUserId;
  const setSelectedUserId = externalSetSelectedUserId !== undefined ? externalSetSelectedUserId : localSetSelectedUserId;
  
  // Auto-select agent assigned to the selected client
  useEffect(() => {
    if (isMainAdmin && selectedUserId && allOrders.length > 0) {
      const activeOrder = allOrders.find(o => o.userId === selectedUserId && o.status === "active");
      if (activeOrder && activeOrder.assignedAgentId) {
        setSelectedAgentId(activeOrder.assignedAgentId);
      }
    }
  }, [selectedUserId, allOrders, isMainAdmin]);

  // Real-time partner typing state listener
  useEffect(() => {
    const activeUserId = isMainAdmin ? selectedUserId : currentUser?.uid;
    if (!activeUserId || !db) {
      setPartnerTyping(false);
      return;
    }

    const docRef = doc(db, "typing_states", activeUserId);
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const isTypingField = isMainAdmin ? "userTyping" : "adminTyping";
        const lastTypedField = isMainAdmin ? "userLastTyped" : "adminLastTyped";
        
        const isTyping = !!data[isTypingField];
        const lastTyped = data[lastTypedField] || 0;
        const now = Date.now();
        
        // Show typing if marked true and within 6 seconds (failsafe for stale window close/network issues)
        if (isTyping && (now - lastTyped < 6000)) {
          setPartnerTyping(true);
        } else {
          setPartnerTyping(false);
        }
      } else {
        setPartnerTyping(false);
      }
    }, (err) => {
      handleFirestoreError(err, "get", `typing_states/${activeUserId}`);
    });

    return () => unsubscribe();
  }, [db, isMainAdmin, selectedUserId, currentUser]);

  // Scroll to bottom when partner is typing
  useEffect(() => {
    if (partnerTyping) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 50);
    }
  }, [partnerTyping]);
  
  // Search state for Admin users list
  const [localSearchQuery, setLocalSearchQuery] = useState("");
  const searchQuery = externalSearchQuery !== undefined ? externalSearchQuery : localSearchQuery;
  const setSearchQuery = externalSetSearchQuery !== undefined ? externalSetSearchQuery : setLocalSearchQuery;
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);

  // Group messages for Admin view by user
  const chatSessions = React.useMemo(() => {
    if (!isMainAdmin) return [];
    
    // Create a map of userId -> last message & unread count
    const sessionsMap: Record<string, {
      userId: string;
      lastMessage: any;
      unreadCount: number;
      messages: any[];
    }> = {};

    adminAllMessages.forEach(msg => {
      if (!sessionsMap[msg.userId]) {
        sessionsMap[msg.userId] = {
          userId: msg.userId,
          lastMessage: msg,
          unreadCount: 0,
          messages: []
        };
      }
      
      sessionsMap[msg.userId].messages.push(msg);
      
      // Update last message (messages are pre-sorted by timestamp asc)
      if (new Date(msg.timestamp).getTime() >= new Date(sessionsMap[msg.userId].lastMessage.timestamp).getTime()) {
        sessionsMap[msg.userId].lastMessage = msg;
      }

      // Unread count for admin (sent by user, not read by admin)
      if (msg.senderId !== "admin" && !msg.readByAdmin) {
        sessionsMap[msg.userId].unreadCount += 1;
      }
    });

    // Merge with user profiles
    return Object.values(sessionsMap).map(session => {
      const profile = allUsers.find(u => u.uid === session.userId || u.id === session.userId);
      return {
        ...session,
        username: profile?.username || profile?.email?.split("@")[0] || "Client " + session.userId.substring(0, 5),
        email: profile?.email || "Unknown Email",
        role: profile?.role || "user",
        isVip: profile?.subscriptions ? Object.values(profile.subscriptions).some(v => v === true) : false
      };
    }).sort((a, b) => new Date(b.lastMessage.timestamp).getTime() - new Date(a.lastMessage.timestamp).getTime());
  }, [isMainAdmin, adminAllMessages, allUsers]);

  // Selected session messages
  const activeMessages = React.useMemo(() => {
    if (isMainAdmin) {
      if (!selectedUserId) return [];
      return adminAllMessages.filter(m => m.userId === selectedUserId);
    } else {
      return userMessages;
    }
  }, [isMainAdmin, selectedUserId, adminAllMessages, userMessages]);

  const activePartner = React.useMemo(() => {
    if (isMainAdmin) {
      if (!selectedUserId) return null;
      const profile = allUsers.find(u => u.uid === selectedUserId || u.id === selectedUserId);
      return {
        id: selectedUserId,
        username: profile?.username || profile?.email?.split("@")[0] || "Client " + selectedUserId.substring(0, 5),
        email: profile?.email || "No email",
        isVip: profile?.subscriptions ? Object.values(profile.subscriptions).some(v => v === true) : false
      };
    } else {
      return {
        id: "admin",
        username: "Negro Tips Support",
        email: "jilalamasanja1998@gmail.com",
        isVip: true
      };
    }
  }, [isMainAdmin, selectedUserId, allUsers]);

  // Mark user's or admin's active conversation messages as read
  useEffect(() => {
    const markAsRead = async () => {
      if (!currentUser) return;
      try {
        if (isMainAdmin) {
          if (!selectedUserId) return;
          const unread = adminAllMessages.filter(
            m => m.userId === selectedUserId && m.senderId !== "admin" && !m.readByAdmin
          );
          for (const msg of unread) {
            await setDoc(doc(db, "chats", msg.id), { readByAdmin: true }, { merge: true });
          }
        } else {
          const unread = userMessages.filter(
            m => m.senderId === "admin" && !m.readByUser
          );
          for (const msg of unread) {
            await setDoc(doc(db, "chats", msg.id), { readByUser: true }, { merge: true });
          }
        }
      } catch (err) {
        console.error("Error updating message read status:", err);
      }
    };

    markAsRead();
  }, [activeMessages.length, isMainAdmin, selectedUserId, currentUser, db]);

  // Auto-scroll on new messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [activeMessages.length]);

  const handleCreateUrlShortcut = async (title: string, link: string) => {
    let formattedLink = link.trim();
    if (formattedLink && !/^https?:\/\//i.test(formattedLink)) {
      formattedLink = "https://" + formattedLink;
    }
    const text = `[URL_BUTTON:${title.trim()}|${formattedLink}]`;
    
    try {
      const messageId = "msg_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7);
      const targetUserId = isMainAdmin ? selectedUserId : currentUser?.uid;
      if (!targetUserId || !currentUser) return;

      const activeAgent = agents.find(a => a.id === selectedAgentId) || DEFAULT_AGENTS.find(a => a.id === "sophia") || DEFAULT_AGENTS[1];
      const messageData = {
        id: messageId,
        userId: targetUserId,
        senderId: "admin",
        senderName: "Admin",
        text: text,
        message: text,
        images: [],
        timestamp: new Date().toISOString(),
        readByAdmin: true,
        readByUser: false,
        senderType: "admin",
        agentName: activeAgent.name,
        agentRole: activeAgent.role,
        agentImage: activeAgent.imageUrl
      };

      await setDoc(doc(db, "chats", messageId), messageData);
      await sendFCMNotificationProgrammatic("Admin sent a quick link", `Click to open: ${title}`);
    } catch (err) {
      console.error("Error sending shortcut url link:", err);
    }
    
    setShowUrlShortcutModal(false);
    setUrlShortcutTitle("");
    setUrlShortcutLink("");
  };

  const handleChatTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    const container = messagesContainerRef.current;
    if (!container) return;

    isDraggingChat.current = true;
    const touch = e.touches[0];
    dragStartY.current = touch.clientY;
    dragStartScrollTop.current = container.scrollTop;
    dragLastY.current = touch.clientY;
    dragLastTime.current = Date.now();
    dragVelocity.current = 0;

    if (dragAnimFrame.current) {
      cancelAnimationFrame(dragAnimFrame.current);
      dragAnimFrame.current = null;
    }
  };

  const handleChatTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!isDraggingChat.current) return;
    const container = messagesContainerRef.current;
    if (!container) return;

    const touch = e.touches[0];
    const deltaY = touch.clientY - dragStartY.current;
    
    // Smooth custom drag scrolling
    container.scrollTop = dragStartScrollTop.current - deltaY;

    // Track velocity
    const now = Date.now();
    const dt = now - dragLastTime.current;
    if (dt > 0) {
      const currentDeltaY = touch.clientY - dragLastY.current;
      dragVelocity.current = (currentDeltaY / dt) * 12;
    }
    dragLastY.current = touch.clientY;
    dragLastTime.current = now;

    // Prevent default browser behavior (like pulling-to-refresh!)
    if (e.cancelable) {
      e.preventDefault();
    }
  };

  const handleChatTouchEnd = () => {
    if (!isDraggingChat.current) return;
    isDraggingChat.current = false;

    const container = messagesContainerRef.current;
    if (!container || Math.abs(dragVelocity.current) < 0.5) return;

    let velocity = dragVelocity.current;
    const decay = 0.96;

    const scrollStep = () => {
      if (Math.abs(velocity) < 0.1 || isDraggingChat.current) {
        if (dragAnimFrame.current) {
          cancelAnimationFrame(dragAnimFrame.current);
          dragAnimFrame.current = null;
        }
        return;
      }

      container.scrollTop -= velocity;
      velocity *= decay;
      dragAnimFrame.current = requestAnimationFrame(scrollStep);
    };

    dragAnimFrame.current = requestAnimationFrame(scrollStep);
  };

  const handleChatMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return; // Left click only
    const container = messagesContainerRef.current;
    if (!container) return;

    const target = e.target as HTMLElement;
    if (
      target.closest("button") || 
      target.closest("a") || 
      target.closest("input") || 
      target.closest("textarea") ||
      target.closest(".cursor-pointer")
    ) {
      return;
    }

    isDraggingChat.current = true;
    dragStartY.current = e.clientY;
    dragStartScrollTop.current = container.scrollTop;
    dragLastY.current = e.clientY;
    dragLastTime.current = Date.now();
    dragVelocity.current = 0;

    if (dragAnimFrame.current) {
      cancelAnimationFrame(dragAnimFrame.current);
      dragAnimFrame.current = null;
    }
    
    container.style.cursor = "grabbing";
    container.style.userSelect = "none";
  };

  const handleChatMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDraggingChat.current) return;
    const container = messagesContainerRef.current;
    if (!container) return;

    const deltaY = e.clientY - dragStartY.current;
    container.scrollTop = dragStartScrollTop.current - deltaY;

    const now = Date.now();
    const dt = now - dragLastTime.current;
    if (dt > 0) {
      const currentDeltaY = e.clientY - dragLastY.current;
      dragVelocity.current = (currentDeltaY / dt) * 12;
    }
    dragLastY.current = e.clientY;
    dragLastTime.current = now;
    
    if (e.cancelable) {
      e.preventDefault();
    }
  };

  const handleChatMouseUpOrLeave = () => {
    if (!isDraggingChat.current) return;
    isDraggingChat.current = false;

    const container = messagesContainerRef.current;
    if (container) {
      container.style.cursor = "grab";
      container.style.userSelect = "";
    }

    if (!container || Math.abs(dragVelocity.current) < 0.5) return;

    let velocity = dragVelocity.current;
    const decay = 0.96;

    const scrollStep = () => {
      if (Math.abs(velocity) < 0.1 || isDraggingChat.current) {
        if (dragAnimFrame.current) {
          cancelAnimationFrame(dragAnimFrame.current);
          dragAnimFrame.current = null;
        }
        return;
      }

      container.scrollTop -= velocity;
      velocity *= decay;
      dragAnimFrame.current = requestAnimationFrame(scrollStep);
    };

    dragAnimFrame.current = requestAnimationFrame(scrollStep);
  };

  const handleSidebarTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    const container = sidebarContainerRef.current;
    if (!container) return;

    isDraggingSidebar.current = true;
    const touch = e.touches[0];
    sidebarDragStartY.current = touch.clientY;
    sidebarDragStartScrollTop.current = container.scrollTop;
    sidebarDragLastY.current = touch.clientY;
    sidebarDragLastTime.current = Date.now();
    sidebarDragVelocity.current = 0;

    if (sidebarDragAnimFrame.current) {
      cancelAnimationFrame(sidebarDragAnimFrame.current);
      sidebarDragAnimFrame.current = null;
    }
  };

  const handleSidebarTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!isDraggingSidebar.current) return;
    const container = sidebarContainerRef.current;
    if (!container) return;

    const touch = e.touches[0];
    const deltaY = touch.clientY - sidebarDragStartY.current;
    
    container.scrollTop = sidebarDragStartScrollTop.current - deltaY;

    const now = Date.now();
    const dt = now - sidebarDragLastTime.current;
    if (dt > 0) {
      const currentDeltaY = touch.clientY - sidebarDragLastY.current;
      sidebarDragVelocity.current = (currentDeltaY / dt) * 12;
    }
    sidebarDragLastY.current = touch.clientY;
    sidebarDragLastTime.current = now;
  };

  const handleSidebarTouchEnd = () => {
    if (!isDraggingSidebar.current) return;
    isDraggingSidebar.current = false;

    const container = sidebarContainerRef.current;
    if (!container || Math.abs(sidebarDragVelocity.current) < 0.5) return;

    let velocity = sidebarDragVelocity.current;
    const decay = 0.96;

    const scrollStep = () => {
      if (Math.abs(velocity) < 0.1 || isDraggingSidebar.current) {
        if (sidebarDragAnimFrame.current) {
          cancelAnimationFrame(sidebarDragAnimFrame.current);
          sidebarDragAnimFrame.current = null;
        }
        return;
      }

      container.scrollTop -= velocity;
      velocity *= decay;
      sidebarDragAnimFrame.current = requestAnimationFrame(scrollStep);
    };

    sidebarDragAnimFrame.current = requestAnimationFrame(scrollStep);
  };

  const handleSidebarMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return; // Left click only
    const container = sidebarContainerRef.current;
    if (!container) return;

    const target = e.target as HTMLElement;
    if (
      target.closest("button") || 
      target.closest("a") || 
      target.closest("input") || 
      target.closest("textarea") ||
      target.closest(".cursor-pointer")
    ) {
      return;
    }

    isDraggingSidebar.current = true;
    sidebarDragStartY.current = e.clientY;
    sidebarDragStartScrollTop.current = container.scrollTop;
    sidebarDragLastY.current = e.clientY;
    sidebarDragLastTime.current = Date.now();
    sidebarDragVelocity.current = 0;

    if (sidebarDragAnimFrame.current) {
      cancelAnimationFrame(sidebarDragAnimFrame.current);
      sidebarDragAnimFrame.current = null;
    }
    
    container.style.cursor = "grabbing";
    container.style.userSelect = "none";
  };

  const handleSidebarMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDraggingSidebar.current) return;
    const container = sidebarContainerRef.current;
    if (!container) return;

    const deltaY = e.clientY - sidebarDragStartY.current;
    container.scrollTop = sidebarDragStartScrollTop.current - deltaY;

    const now = Date.now();
    const dt = now - sidebarDragLastTime.current;
    if (dt > 0) {
      const currentDeltaY = e.clientY - sidebarDragLastY.current;
      sidebarDragVelocity.current = (currentDeltaY / dt) * 12;
    }
    sidebarDragLastY.current = e.clientY;
    sidebarDragLastTime.current = now;
  };

  const handleSidebarMouseUpOrLeave = () => {
    if (!isDraggingSidebar.current) return;
    isDraggingSidebar.current = false;

    const container = sidebarContainerRef.current;
    if (container) {
      container.style.cursor = "grab";
      container.style.userSelect = "";
    }

    if (!container || Math.abs(sidebarDragVelocity.current) < 0.5) return;

    let velocity = sidebarDragVelocity.current;
    const decay = 0.96;

    const scrollStep = () => {
      if (Math.abs(velocity) < 0.1 || isDraggingSidebar.current) {
        if (sidebarDragAnimFrame.current) {
          cancelAnimationFrame(sidebarDragAnimFrame.current);
          sidebarDragAnimFrame.current = null;
        }
        return;
      }

      container.scrollTop -= velocity;
      velocity *= decay;
      sidebarDragAnimFrame.current = requestAnimationFrame(scrollStep);
    };

    sidebarDragAnimFrame.current = requestAnimationFrame(scrollStep);
  };

  const handleMessageInputChange = (val: string) => {
    if (isMainAdmin && (val.toLowerCase().includes("#url") || val.toLowerCase().includes("/url"))) {
      setShowUrlShortcutModal(true);
      const cleaned = val.replace(/#url/gi, "").replace(/\/url/gi, "").trim();
      setInputText(cleaned);
      return;
    }

    setInputText(val);

    const activeUserId = isMainAdmin ? selectedUserId : currentUser?.uid;
    if (!activeUserId || !db) return;

    const docRef = doc(db, "typing_states", activeUserId);
    setDoc(docRef, {
      [isMainAdmin ? "adminTyping" : "userTyping"]: val.trim().length > 0,
      [isMainAdmin ? "adminLastTyped" : "userLastTyped"]: Date.now()
    }, { merge: true }).catch(err => console.error("Error setting typing status:", err));

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      setDoc(docRef, {
        [isMainAdmin ? "adminTyping" : "userTyping"]: false,
        [isMainAdmin ? "adminLastTyped" : "userLastTyped"]: Date.now()
      }, { merge: true }).catch(err => console.error("Error clearing typing status:", err));
    }, 2500);
  };

  const handleInputFocus = () => {
    // Scroll chat window to bottom to keep messages in view when keyboard pops up
    setTimeout(() => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
      }
    }, 150);

    // Prevent Safari layout shifting by resetting any window scrolling
    setTimeout(() => {
      window.scrollTo(0, 0);
      document.body.scrollTop = 0;
      if (document.documentElement) {
        document.documentElement.scrollTop = 0;
      }
    }, 50);
  };

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const hasText = !!inputText.trim();
    const hasImages = attachedImages.length > 0;
    if ((!hasText && !hasImages) || !currentUser) return;

    // Clear typing state immediately on send
    const activeUserId = isMainAdmin ? selectedUserId : currentUser?.uid;
    if (activeUserId && db) {
      const docRef = doc(db, "typing_states", activeUserId);
      setDoc(docRef, {
        [isMainAdmin ? "adminTyping" : "userTyping"]: false,
        [isMainAdmin ? "adminLastTyped" : "userLastTyped"]: Date.now()
      }, { merge: true }).catch(err => console.error("Error clearing typing status:", err));
    }
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    try {
      const messageId = "msg_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7);
      const targetUserId = isMainAdmin ? selectedUserId : currentUser.uid;

      if (!targetUserId) return;

      const defaultAgentId = adminSettings.defaultAgentId || "sophia";
      const currentAgentId = (adminSettings.showAgentsOnAdmin !== false) ? selectedAgentId : defaultAgentId;
      const activeAgent = agents.find(a => a.id === currentAgentId) || agents.find(a => a.id === defaultAgentId) || DEFAULT_AGENTS.find(a => a.id === defaultAgentId) || DEFAULT_AGENTS.find(a => a.id === "sophia") || DEFAULT_AGENTS[1];
      const messageData = {
        id: messageId,
        userId: targetUserId,
        senderId: isMainAdmin ? "admin" : currentUser.uid,
        senderName: isMainAdmin ? "Admin" : (currentUser.displayName || currentUser.email || "User"),
        text: inputText.trim(),
        message: inputText.trim(),
        images: attachedImages,
        timestamp: new Date().toISOString(),
        readByAdmin: isMainAdmin ? true : false,
        readByUser: isMainAdmin ? false : true,
        // Support agent identity metadata
        senderType: isMainAdmin ? "admin" : "user",
        agentName: isMainAdmin ? activeAgent.name : "",
        agentRole: isMainAdmin ? activeAgent.role : "",
        agentImage: isMainAdmin ? activeAgent.imageUrl : ""
      };

      await setDoc(doc(db, "chats", messageId), messageData);
      setInputText("");
      setAttachedImages([]);

      // Dispatch Programmatic FCM Notifications
      let notifyTitle = "You have new message on Negro Tips";
      let notifyBody = messageData.text || "Sent an image attachment";

      if (isMainAdmin) {
        notifyTitle = "Admin Replied to your message";
      } else {
        notifyTitle = "User sent you new message";
      }

      // Send actual FCM trigger
      await sendFCMNotificationProgrammatic(notifyTitle, notifyBody);

      // Log push notification mock emails for both user & admin to know
      console.log(`Email push notification triggered: To: ${isMainAdmin ? activePartner?.email : "jilalamasanja1998@gmail.com"} | Subject: ${notifyTitle} | Content: ${notifyBody}`);
    } catch (err) {
      console.error("Error sending message:", err);
    }
  };

  const handleQuickReply = (reply: string) => {
    setInputText(reply);
  };

  const filteredSessions = searchQuery.trim()
    ? chatSessions.filter(s => 
        s.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.email.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : chatSessions;

  const quickReplies: string[] = [];

  return (
    <div id="whatsapp-view-container" className="w-full bg-[#f0f2f5] flex flex-col md:flex-row h-full overflow-hidden select-none font-sans text-[#111b21]">
      
      {/* SIDEBAR FOR ADMIN: LIST OF USER CHATS */}
      {isMainAdmin && (
        <div id="admin-chat-sidebar" className={`w-full md:w-[320px] border-r border-[#d1d7db] flex flex-col bg-[#ffffff] h-full min-h-0 ${selectedUserId ? "hidden md:flex" : "flex"}`}>

          <div 
            ref={sidebarContainerRef}
            className="flex-1 overflow-y-auto divide-y divide-[#e9edef] bg-[#ffffff] admin-sidebar-scroll overscroll-contain cursor-grab"
            onMouseDown={handleSidebarMouseDown}
            onMouseMove={handleSidebarMouseMove}
            onMouseUp={handleSidebarMouseUpOrLeave}
            onMouseLeave={handleSidebarMouseUpOrLeave}
            onTouchStart={handleSidebarTouchStart}
            onTouchMove={handleSidebarTouchMove}
            onTouchEnd={handleSidebarTouchEnd}
          >
            {filteredSessions.length === 0 ? (
              <div className="p-6 text-center space-y-1 text-slate-400 select-none h-full flex flex-col justify-center items-center">
                <Search className="w-6 h-6 mx-auto text-slate-300 mb-1" />
                <p className="text-xs font-bold text-slate-500">No active sessions</p>
                <p className="text-[10px] text-slate-400">Waiting for clients to initiate chats</p>
              </div>
            ) : (
              filteredSessions.map(session => {
                const isSelected = selectedUserId === session.userId;
                return (
                  <button
                    id={`session-btn-${session.userId}`}
                    key={session.userId}
                    onClick={() => setSelectedUserId(session.userId)}
                    className={`w-full p-3.5 flex items-start gap-3 transition-all cursor-pointer text-left border-b border-[#f0f2f5] ${
                      isSelected ? "bg-[#eae6df]" : "hover:bg-[#f5f6f6] bg-[#ffffff]"
                    }`}
                  >
                    <div className="relative shrink-0 mt-0.5">
                      <div className={`w-9 h-9 rounded-full ${session.isVip ? "bg-gradient-to-br from-[#ffd700] to-[#ffa500]" : "bg-slate-200"} flex items-center justify-center text-slate-800 font-bold text-sm uppercase shadow-sm`}>
                        {session.username[0]}
                      </div>
                      <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white ${session.isVip ? "bg-yellow-500" : "bg-emerald-500 animate-pulse"}`} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-black text-[#111b21] truncate flex items-center gap-1 font-sans uppercase tracking-wide">
                          {session.username}
                          {session.isVip && <Zap className="w-2.5 h-2.5 text-yellow-500 fill-yellow-500 shrink-0" />}
                        </p>
                        <span className="text-[9px] text-[#667781] font-mono">
                          {new Date(session.lastMessage.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-[10px] text-[#667781] truncate mt-0.5">
                        {session.lastMessage.senderId === "admin" ? "You: " : ""}{session.lastMessage.text}
                      </p>
                      <p className="text-[8px] text-[#667781]/80 truncate font-mono mt-0.5">
                        {session.email}
                      </p>
                    </div>

                    {session.unreadCount > 0 && (
                      <span className="bg-[#00a884] text-white text-[9px] w-5 h-5 rounded-full flex items-center justify-center font-black shrink-0 font-mono self-center shadow-sm">
                        {session.unreadCount}
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* CHAT MAIN CONVERSATION WINDOW */}
      <div id="chat-conversation-panel" className={`flex-1 flex flex-col bg-[#efeae2] relative border-l border-[#d1d7db] h-full overflow-hidden ${isMainAdmin && !selectedUserId ? "hidden md:flex" : "flex"}`}>
        
        {/* CONVERSATION TOP BAR REMOVED - USING MAIN TOP HEADER */}

        {/* USER BANNER FOR ORDER STATUS */}
        {!isMainAdmin && (() => {
          const pendingOrder = userOrders.find(o => o.status === "pending_agent");
          const activeOrder = userOrders.find(o => o.status === "active");
          
          if (pendingOrder) {
            return (
              <div className="bg-gradient-to-r from-amber-500/15 via-amber-600/10 to-amber-500/5 border-b border-amber-500/20 px-4 py-3 flex items-start gap-3 shrink-0 z-20 animate-fade-in select-none">
                <div className="w-7 h-7 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-600 shrink-0 mt-0.5">
                  <Clock className="w-3.5 h-3.5 animate-spin" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-[10px] font-black uppercase text-amber-700 tracking-wider">Order #{pendingOrder.id.substring(6, 12)} Pending Connection</h4>
                  <p className="text-[9px] text-amber-950 leading-normal mt-0.5 font-bold">
                    Your VIP order for <span className="text-amber-800">"{pendingOrder.planName}"</span> has been created. Please wait while a support agent connects to provide your secure checkout link and activate your subscription.
                  </p>
                </div>
              </div>
            );
          } else if (activeOrder) {
            const agent = agents.find(a => a.id === activeOrder.assignedAgentId) || DEFAULT_AGENTS.find(a => a.id === "sophia");
            const showAgents = adminSettings.showAgentsInChatBox !== false;
            return (
              <div className="bg-gradient-to-r from-emerald-500/15 via-emerald-600/10 to-emerald-500/5 border-b border-emerald-500/20 px-4 py-3 flex items-start gap-3 shrink-0 z-20 animate-fade-in select-none">
                <div className="w-7 h-7 rounded-full overflow-hidden border border-emerald-500/30 shrink-0 mt-0.5 flex items-center justify-center bg-emerald-500/10 text-emerald-600">
                  {showAgents ? (
                    <img src={activeOrder.assignedAgentImage || agent.imageUrl} alt={activeOrder.assignedAgentName || agent.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xs">🛡️</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-[10px] font-black uppercase text-emerald-700 tracking-wider">
                    {showAgents ? `Connected with ${activeOrder.assignedAgentName || agent.name}` : "Support Team Connected"}
                  </h4>
                  <p className="text-[9px] text-emerald-950 leading-normal mt-0.5 font-bold">
                    {showAgents ? (
                      <>
                        Support Agent <span className="text-emerald-800">{activeOrder.assignedAgentName || agent.name} ({activeOrder.assignedAgentRole || agent.role})</span> is now assigned to assist you. Please wait for payment coordinates.
                      </>
                    ) : (
                      "Our support team is now assigned to assist you. Please wait for payment coordinates."
                    )}
                  </p>
                </div>
              </div>
            );
          }
          return null;
        })()}

        {/* ADMIN AGENT ASSIGNMENT OVERLAY PANEL */}
        {isMainAdmin && selectedUserId && (() => {
          const activeOrder = allOrders.find(o => o.userId === selectedUserId && o.status === "pending_agent" && !assignedOrderIds.includes(o.id));
          if (activeOrder) {
            return (
              <div className="bg-gradient-to-r from-[#005c4b]/95 via-[#008069]/90 to-[#00a884]/85 border-b border-[#00a884]/30 text-white p-4.5 flex flex-col gap-3 shrink-0 z-20 shadow-md animate-fade-in select-none">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-[#E2FF00] shrink-0 mt-0.5">
                    <Sparkles className="w-4 h-4 animate-pulse" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-black uppercase tracking-wider text-[#E2FF00]">⚡ Pending Subscription Order Received</h4>
                    <p className="text-[10.5px] text-emerald-50 leading-normal mt-0.5 font-sans font-medium">
                      Client <span className="font-extrabold text-white">{activePartner?.username}</span> created an order for <span className="font-extrabold text-[#E2FF00]">"{activeOrder.planName}"</span> at <span className="font-mono text-white">{activeOrder.price}</span>. Select which support agent should handle this transaction:
                    </p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-1">
                  {agents.map((agent) => {
                    return (
                      <button
                        key={agent.id}
                        type="button"
                        onClick={async () => {
                          try {
                            // Immediately hide order overlay
                            setAssignedOrderIds(prev => [...prev, activeOrder.id]);

                            // Update order status and assign agent
                            await setDoc(doc(db, "orders", activeOrder.id), {
                              status: "active",
                              assignedAgentId: agent.id,
                              assignedAgentName: agent.name,
                              assignedAgentRole: agent.role,
                              assignedAgentImage: agent.imageUrl,
                              assignedAt: new Date().toISOString()
                            }, { merge: true });

                            // Auto-post welcoming message from this agent in the chats
                            const messageId = "msg_welcome_" + Date.now() + "_" + Math.random().toString(36).substring(2, 5);
                            await setDoc(doc(db, "chats", messageId), {
                              id: messageId,
                              userId: selectedUserId,
                              senderId: "admin",
                              senderName: "Admin",
                              text: `Hello! I am ${agent.name} (${agent.role}). I am assigned to assist you with your order for "${activeOrder.planName}". Let me provide you the payment coordinates to complete your transaction securely.`,
                              message: `Hello! I am ${agent.name} (${agent.role}). I am assigned to assist you with your order for "${activeOrder.planName}". Let me provide you the payment coordinates to complete your transaction securely.`,
                              timestamp: new Date().toISOString(),
                              readByAdmin: true,
                              readByUser: false,
                              senderType: "admin",
                              agentName: agent.name,
                              agentRole: agent.role,
                              agentImage: agent.imageUrl
                            });

                            // Select this agent as reply identity automatically
                            setSelectedAgentId(agent.id);

                            // Send FCM notice to user
                            await sendFCMNotificationProgrammatic(
                              `Support Agent ${agent.name} Connected`,
                              `I am ready to help you complete your VIP purchase. Please check chat.`
                            );
                          } catch (err) {
                            console.error("Error assigning agent:", err);
                          }
                        }}
                        className="bg-white/10 hover:bg-[#E2FF00] hover:text-black border border-white/15 p-2 rounded-xl flex items-center gap-2 text-left transition-all duration-300 cursor-pointer active:scale-95 group shrink-0"
                      >
                        <img src={agent.imageUrl} alt={agent.name} className="w-7 h-7 rounded-full object-cover shrink-0 border border-white/20" />
                        <div className="min-w-0">
                          <p className="text-[10px] font-black uppercase truncate group-hover:text-black leading-none">{agent.name}</p>
                          <p className="text-[7.5px] opacity-70 group-hover:text-black leading-none mt-1 uppercase tracking-wider font-semibold truncate">{agent.role.replace("Support ", "")}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          }
          return null;
        })()}
        
        {/* MESSAGES SCROLL CONTAINER with genuine WhatsApp Doodle Wallpaper look */}
        <div 
          ref={messagesContainerRef}
          id="chat-messages-container"
          className="flex-1 overflow-y-auto p-4 space-y-3 relative scrollbar-none overscroll-contain cursor-grab select-none"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onTouchStart={handleChatTouchStart}
          onTouchMove={handleChatTouchMove}
          onTouchEnd={handleChatTouchEnd}
          onMouseDown={handleChatMouseDown}
          onMouseMove={handleChatMouseMove}
          onMouseUp={handleChatMouseUpOrLeave}
          onMouseLeave={handleChatMouseUpOrLeave}
          style={{ overscrollBehaviorY: "contain" }}
        >
          {/* Faint Background image overlay to prevent opacity bleeding to messages */}
          <div 
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: "url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')",
              backgroundSize: "380px",
              backgroundRepeat: "repeat",
              opacity: 0.08
            }}
          />

          {isDragging && (
            <div className="absolute inset-0 bg-[#00a884]/15 border-4 border-dashed border-[#00a884] rounded-2xl flex flex-col items-center justify-center z-50 pointer-events-none animate-pulse">
              <Paperclip className="w-12 h-12 text-[#00a884] mb-2" />
              <p className="text-sm font-black text-[#005c4b] uppercase tracking-wider">Drop images to attach</p>
            </div>
          )}
          {/* Support Safe Banner */}
          <div className="flex justify-center my-1.5 select-none relative z-10">
            <div className="bg-[#ffe194]/70 border border-[#f5c347]/30 px-3 py-1.5 rounded-lg flex items-center gap-2 text-[10px] text-[#604b1e] max-w-[320px] text-center shadow-sm font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Messages are end-to-end encrypted with SSL security.</span>
            </div>
          </div>

          {isMainAdmin && !selectedUserId ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 space-y-3 select-none bg-[#f8f9fa]">
              <div className="w-16 h-16 rounded-full bg-[#f0f2f5] border border-slate-200 flex items-center justify-center text-[#00a884] shadow-md">
                <MessageSquare className="w-8 h-8" />
              </div>
              <div className="max-w-[280px]">
                <h4 className="text-sm font-black uppercase text-[#111b21] tracking-wider font-sans">Chat Support Panel</h4>
                <p className="text-[10px] text-[#667781] mt-1 leading-relaxed">
                  Select any active client from the left menu panel to view transaction histories and respond instantly.
                </p>
              </div>
            </div>
          ) : activeMessages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2 select-none relative z-10">
              <p className="text-xs font-bold text-[#111b21]">No messages yet</p>
              <p className="text-[10px] text-[#667781] max-w-[200px] leading-relaxed">
                {isMainAdmin 
                  ? "Send an initial message to active users to help with their subscriptions." 
                  : "Send your payment confirmation screenshot. The support team responds in less than 15 minutes."}
              </p>
            </div>
          ) : (
            activeMessages.map((msg, idx) => {
              const isMe = isMainAdmin ? (msg.senderId === "admin") : (msg.senderId !== "admin");
              
              // Get sender details if not admin
              const senderProfile = msg.senderId !== "admin" 
                ? (allUsers.find(u => u.uid === msg.senderId || u.id === msg.senderId) || (currentUser && currentUser.uid === msg.senderId ? userProfile : null))
                : null;
              
              const senderRealName = senderProfile?.username || msg.senderName || senderProfile?.email?.split("@")[0] || "Client";
              const senderInitial = senderRealName.charAt(0).toUpperCase() || "C";
              const isVipUser = senderProfile?.subscriptions ? Object.values(senderProfile.subscriptions).some(v => v === true) : false;

              return (
                <div 
                  key={msg.id || idx} 
                  className={`flex ${isMe ? "justify-end" : "justify-start"} relative z-10 w-full mb-3 px-1`}
                >
                  <div className={`max-w-[85%] sm:max-w-[70%] rounded-2xl p-2.5 shadow-sm flex flex-col relative break-words [word-break:break-word] overflow-hidden ${
                    isMe 
                      ? "bg-[#20805c] border border-transparent rounded-tr-none text-white" 
                      : "bg-[#f2f2f3] border border-transparent rounded-tl-none text-[#111b21]"
                  }`}>
                    {/* Message Sender Name / Agent Identity */}
                    {msg.senderId === "admin" ? (
                      adminSettings.showAgentsInChatBox !== false ? (
                        <div className={`flex items-center gap-2 mb-1.5 pb-1 border-b select-none ${isMe ? 'border-white/10' : 'border-slate-200'}`}>
                          <img
                            src={msg.agentImage || "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150"}
                            alt={msg.agentName || "Support Agent"}
                            className="w-6 h-6 rounded-full object-cover shrink-0 border border-white/10 shadow-sm animate-fade-in"
                            referrerPolicy="no-referrer"
                          />
                          <div className="flex flex-col">
                            <span className={`text-[10px] font-black leading-none font-sans ${isMe ? 'text-emerald-100' : 'text-slate-800'}`}>
                              {msg.agentName || "Sophia"}
                            </span>
                            <span className={`text-[7px] font-bold tracking-wider uppercase leading-none mt-0.5 ${isMe ? 'text-emerald-200/80' : 'text-slate-500/80'}`}>
                              {msg.agentRole || "Support Agent"}
                            </span>
                          </div>
                          <span className={`text-[6.5px] font-bold px-1 py-0.2 rounded-sm ml-auto uppercase tracking-widest font-mono ${
                            isMe 
                              ? "text-emerald-200 bg-white/10 border border-white/10" 
                              : "text-slate-600 bg-slate-200 border border-slate-300"
                          }`}>
                            Support
                          </span>
                        </div>
                      ) : (
                        <div className={`flex items-center gap-2 mb-1.5 pb-1 border-b select-none ${isMe ? 'border-white/10' : 'border-slate-200'}`}>
                          <div className={`w-6 h-6 rounded-full shrink-0 border flex items-center justify-center text-[10px] font-bold ${
                            isMe ? 'bg-white/10 text-white border-white/10' : 'bg-slate-200 text-slate-700 border-slate-300'
                          }`}>
                            🛡️
                          </div>
                          <div className="flex flex-col">
                            <span className={`text-[10px] font-black leading-none font-sans ${isMe ? 'text-emerald-100' : 'text-slate-800'}`}>
                              Support Team
                            </span>
                            <span className={`text-[7px] font-bold tracking-wider uppercase leading-none mt-0.5 ${isMe ? 'text-emerald-200/80' : 'text-slate-500/80'}`}>
                              Official Representative
                            </span>
                          </div>
                          <span className={`text-[6.5px] font-bold px-1 py-0.2 rounded-sm ml-auto uppercase tracking-widest font-mono ${
                            isMe 
                              ? "text-emerald-200 bg-white/10 border border-white/10" 
                              : "text-slate-600 bg-slate-200 border border-slate-300"
                          }`}>
                            Support
                          </span>
                        </div>
                      )
                    ) : (
                      <div className={`flex items-center gap-2 mb-1.5 pb-1 border-b select-none ${isMe ? 'border-white/10' : 'border-slate-200'}`}>
                        <div className={`w-6 h-6 rounded-full shrink-0 border flex items-center justify-center text-[10px] font-bold ${
                          isMe 
                            ? 'bg-white/10 text-white border-white/10' 
                            : 'bg-emerald-500/10 text-[#00a884] border-emerald-500/20'
                        }`}>
                          {senderInitial}
                        </div>
                        <div className="flex flex-col">
                          <span className={`text-[10px] font-black leading-none font-sans ${isMe ? 'text-emerald-100' : 'text-slate-800'}`}>
                            {isMe ? `${senderRealName} (You)` : senderRealName}
                          </span>
                          <span className={`text-[7px] font-bold tracking-wider uppercase leading-none mt-0.5 ${isMe ? 'text-emerald-200/80' : 'text-slate-500/80'}`}>
                            {isVipUser ? "🏆 VIP Client" : "Client"}
                          </span>
                        </div>
                        <span className={`text-[6.5px] font-bold px-1 py-0.2 rounded-sm ml-auto uppercase tracking-widest font-mono ${
                          isMe 
                            ? "text-emerald-200 bg-white/10 border border-white/10" 
                            : "text-[#00a884] bg-emerald-500/10 border border-emerald-500/20"
                        }`}>
                          {isVipUser ? "VIP" : "Client"}
                        </span>
                      </div>
                    )}
                    
                    {/* Image attachments */}
                    {msg.images && msg.images.length > 0 && (
                      <div className={`grid gap-1 mb-1.5 rounded-lg overflow-hidden ${msg.images.length === 1 ? 'grid-cols-1' : 'grid-cols-2'} max-w-[280px]`}>
                        {msg.images.map((img: string, i: number) => (
                          <div key={i} className={`relative group overflow-hidden rounded-md border bg-slate-50 ${isMe ? 'border-slate-100' : 'border-white/5'}`}>
                            <img 
                              src={img} 
                              alt="Attached visual" 
                              className="object-cover w-full h-auto max-h-48 cursor-pointer hover:scale-[1.02] transition-transform duration-200" 
                              onClick={() => setZoomedImage(img)}
                            />
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Text & Quick URL shortcut buttons */}
                    {msg.text && (
                      (() => {
                        const isUrlButton = msg.text.startsWith("[URL_BUTTON:") && msg.text.endsWith("]");
                        if (isUrlButton) {
                          const content = msg.text.slice(12, -1);
                          const parts = content.split("|");
                          const buttonTitle = parts[0] || "Click here";
                          const buttonLink = parts.slice(1).join("|") || "#";
                          
                          return (
                            <div className="py-3 px-1.5 w-full flex flex-col items-center select-none">
                              <motion.a
                                href={buttonLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-black text-center text-[11px] tracking-widest uppercase transition-all duration-300 cursor-pointer w-full max-w-[280px] relative overflow-hidden group/btn bg-[#25D366] text-white border border-[#25D366]/40 shadow-[0_0_20px_rgba(37,211,102,0.6)] hover:shadow-[0_0_25px_rgba(37,211,102,0.8)]"
                                whileHover={{ scale: 1.08 }}
                                whileTap={{ scale: 0.95 }}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ 
                                  opacity: 1, 
                                  y: 0,
                                  scale: [1, 1.04, 0.98, 1.04, 1],
                                  rotate: [0, 1, -1, 1, 0]
                                }}
                                transition={{
                                  scale: {
                                    repeat: Infinity,
                                    repeatType: "reverse",
                                    duration: 2,
                                    ease: "easeInOut"
                                  },
                                  rotate: {
                                    repeat: Infinity,
                                    repeatType: "reverse",
                                    duration: 2.5,
                                    ease: "easeInOut"
                                  },
                                  opacity: { duration: 0.3 },
                                  y: { duration: 0.3 }
                                }}
                              >
                                <motion.span 
                                  className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover/btn:translate-x-[100%] transition-transform duration-1000 ease-out pointer-events-none"
                                />
                                <span className="absolute -inset-1 rounded-xl bg-[#25D366] opacity-30 blur-sm animate-pulse pointer-events-none" />
                                <Zap className="w-4 h-4 text-white animate-bounce shrink-0 relative z-10" />
                                <span className="font-extrabold truncate relative z-10 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.2)]">
                                  {buttonTitle}
                                </span>
                                <span className="text-xs relative z-10 font-bold ml-1 text-white/95 animate-ping">➔</span>
                              </motion.a>
                            </div>
                          );
                        }
                        
                        return (
                          <p className={`text-[14px] leading-relaxed font-sans font-normal select-text whitespace-pre-wrap break-words [word-break:break-word] overflow-hidden ${isMe ? 'text-white' : 'text-[#111b21]'}`}>
                            {msg.text}
                          </p>
                        );
                      })()
                    )}

                    {/* Metadata */}
                    <div className={`flex items-center justify-end gap-1 mt-1 self-end select-none ${isMe ? 'text-emerald-100/70' : 'text-[#667781]'}`}>
                      <span className="text-[10px] font-sans">
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {isMe && (
                        <span>
                          {isMainAdmin ? (
                            msg.readByAdmin ? (
                              <CheckCircle2 className="w-3 h-3 text-[#53bdeb]" />
                            ) : (
                              <Check className="w-3 h-3 text-white/55" />
                            )
                          ) : (
                            msg.readByUser ? (
                              <CheckCircle2 className="w-3 h-3 text-[#53bdeb]" />
                            ) : (
                              <Clock className="w-3 h-3 text-white/55" />
                            )
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}

          {/* Real-time typing animation bubble */}
          {partnerTyping && (
            <div className="flex justify-start relative z-10 animate-fade-in mb-4 max-w-[250px]">
              <div className="rounded-2xl p-3 shadow-sm bg-white border border-slate-100 rounded-tl-none flex items-center gap-2">
                <span className="text-[10px] font-black text-[#667781] font-sans">
                  {isMainAdmin ? "Client typing" : "Support typing"}
                </span>
                <div className="flex gap-1 items-center pt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00a884] animate-bounce [animation-delay:0ms] duration-1000" />
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00a884] animate-bounce [animation-delay:200ms] duration-1000" />
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00a884] animate-bounce [animation-delay:400ms] duration-1000" />
                </div>
              </div>
            </div>
          )}

          <div className="h-28 md:h-36 shrink-0" />
          <div ref={messagesEndRef} />
        </div>

        {/* Bottom messaging controls area */}
        {(!isMainAdmin || selectedUserId) && (
          <div 
            id="fixed-chat-controls-container" 
            className="w-full bg-[#f0f2f5] z-30 flex flex-col shrink-0 sticky bottom-0 border-t border-[#e9edef] pb-[env(safe-area-inset-bottom,0px)] mb-0"
            style={{
              paddingBottom: "env(safe-area-inset-bottom, 0px)",
              marginBottom: "0px"
            }}
          >
            {/* Active Identity selector for admin */}
            {isMainAdmin && agents.length > 0 && adminSettings.showAgentsOnAdmin !== false && (
              <div className="px-4 py-2.5 bg-[#eae6df] border-b border-[#e9edef] flex flex-wrap items-center justify-between gap-3 text-slate-800 select-none">
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-black uppercase text-slate-500 tracking-wider">
                    Reply Identity:
                  </span>
                  {(() => {
                    const activeAgent = agents.find(a => a.id === selectedAgentId) || DEFAULT_AGENTS.find(a => a.id === "sophia") || DEFAULT_AGENTS[1];
                    return (
                      <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-full border border-slate-200 shadow-sm">
                        <img 
                          src={activeAgent.imageUrl} 
                          alt={activeAgent.name} 
                          className="w-5 h-5 rounded-full object-cover shrink-0 border border-slate-100" 
                          referrerPolicy="no-referrer"
                        />
                        <span className="text-[10px] font-black text-[#00a884] font-sans">{activeAgent.name}</span>
                        <span className="text-[8px] font-bold text-slate-500">({activeAgent.role})</span>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          activeAgent.status === "available" ? "bg-emerald-500 animate-pulse" :
                          activeAgent.status === "busy" ? "bg-amber-500" : "bg-slate-400"
                        }`} />
                      </div>
                    );
                  })()}
                </div>
                
                {/* Switches buttons */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[8px] font-mono text-slate-500 uppercase tracking-wider">Switch Agent:</span>
                  <div className="flex gap-1 animate-fade-in">
                    {agents.map((agent) => (
                      <button
                        key={agent.id}
                        type="button"
                        onClick={() => setSelectedAgentId(agent.id)}
                        className={`px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                          selectedAgentId === agent.id
                            ? "bg-[#00a884] text-white shadow-md font-extrabold scale-105"
                            : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"
                        }`}
                        title={`Transferred/switch to ${agent.name} (${agent.role})`}
                      >
                        {agent.name}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAgentsModal(true)}
                    className="p-1 bg-white hover:bg-slate-50 border border-slate-200 rounded text-slate-600 transition-all active:scale-95 cursor-pointer flex items-center justify-center h-[22px] w-[22px]"
                    title="Manage support agents and availability status"
                  >
                    <Settings className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* Attached Image Previews Rail */}
            {attachedImages.length > 0 && (
              <div className="px-4 py-2 bg-[#f0f2f5] border-b border-[#e9edef] flex items-center gap-3 overflow-x-auto scrollbar-none animate-fade-in shrink-0">
                {attachedImages.map((img, i) => (
                  <div key={i} className="relative shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 border-[#00a884] shadow-md group">
                    <img src={img} alt="Preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => {
                        setAttachedImages(prev => prev.filter((_, idx) => idx !== i));
                      }}
                      className="absolute top-1 right-1 bg-red-600 hover:bg-red-700 text-white p-1 rounded-full shadow-md active:scale-90 transition-all cursor-pointer flex items-center justify-center"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </div>
                ))}
                <div className="text-[10px] text-slate-600 font-sans font-bold uppercase shrink-0">
                  {attachedImages.length} file(s) selected
                </div>
              </div>
            )}

            {/* Main Form Area */}
            <form 
              id="chat-message-form"
              onSubmit={handleSend} 
              className="py-2.5 px-3 bg-[#f0f2f5] flex items-end gap-2.5 shrink-0 relative z-20"
            >
              {/* Left trigger buttons */}
              <div className="flex items-center gap-1.5 text-slate-600 mb-1">
                <button
                  type="button"
                  onClick={handleAttachmentClick}
                  className="p-2 rounded-full text-slate-600 hover:text-[#00a884] hover:bg-black/5 cursor-pointer transition-all active:scale-90"
                  title="Attach images"
                >
                  <Paperclip className="w-5 h-5 shrink-0" />
                </button>

                {isMainAdmin && (
                  <button
                    type="button"
                    onClick={() => setShowUrlShortcutModal(true)}
                    className="p-2 rounded-full text-[#00a884] hover:text-white hover:bg-[#00a884] cursor-pointer transition-all active:scale-90 flex items-center justify-center relative group"
                    title="Generate Link Button (or type /url or #url)"
                  >
                    <LinkIcon className="w-5 h-5 shrink-0" />
                    <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[8px] font-bold px-2 py-1 rounded shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                      Add Link Button
                    </span>
                  </button>
                )}
                
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  multiple 
                  accept="image/*" 
                  className="hidden" 
                />
              </div>

              {/* Textarea container */}
              <div className="flex-1 relative mb-0.5">
                <textarea
                  ref={textareaRef}
                  id="message-input-field"
                  value={inputText}
                  onChange={(e) => handleMessageInputChange(e.target.value)}
                  onFocus={handleInputFocus}
                  placeholder="Type your message..."
                  rows={1}
                  className="w-full pl-4 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl text-[16px] md:text-xs font-semibold text-[#111b21] focus:outline-none focus:border-[#00a884] placeholder-slate-400 transition-all shadow-sm resize-none max-h-[144px] overflow-y-auto block leading-relaxed font-sans"
                  style={{ height: "38px" }}
                />
              </div>

              {/* Send Button */}
              <button
                id="send-message-btn"
                type="submit"
                disabled={!inputText.trim() && attachedImages.length === 0}
                className="w-10 h-10 rounded-full bg-[#00a884] text-white flex items-center justify-center shrink-0 active:scale-95 hover:scale-105 disabled:opacity-40 disabled:scale-100 disabled:cursor-not-allowed transition-all cursor-pointer shadow-md mb-0.5"
              >
                <Send className="w-4 h-4 ml-0.5" strokeWidth={2.5} />
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Support Agents Management Modal */}
      <AnimatePresence>
        {showAgentsModal && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-[60] flex items-center justify-center p-4 select-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-[#0b1017] border border-white/10 p-5 rounded-2xl w-full max-w-[500px] shadow-[0_25px_60px_rgba(0,0,0,0.85)] flex flex-col max-h-[90vh]"
            >
              <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-[#E2FF00]" />
                  <h3 className="text-sm font-black uppercase tracking-wider text-white font-sans">
                    Support Agent Identity System
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowAgentsModal(false);
                    setEditingAgent(null);
                  }}
                  className="p-1 hover:bg-white/5 rounded-full transition-all text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {editingAgent ? (
                /* Edit Mode */
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    try {
                      await setDoc(doc(db, "agents", editingAgent.id), editingAgent);
                      setEditingAgent(null);
                    } catch (err) {
                      console.error("Error updating agent:", err);
                    }
                  }}
                  className="space-y-4 text-left flex-1 overflow-y-auto"
                >
                  <div className="flex items-center gap-4 bg-white/5 p-3 rounded-xl border border-white/5">
                    {/* Image picker */}
                    <div className="relative group cursor-pointer" onClick={() => agentFileInputRef.current?.click()}>
                      <img
                        src={editingAgent.imageUrl || "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150"}
                        alt={editingAgent.name}
                        className="w-16 h-16 rounded-full object-cover border-2 border-[#E2FF00] group-hover:opacity-75 transition-opacity"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 rounded-full transition-opacity text-[10px] text-white font-bold uppercase text-center leading-tight">
                        Upload
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-black text-white uppercase font-sans">{editingAgent.name || "Agent"}</p>
                      <p className="text-[10px] text-slate-400 font-medium">Click photo to upload custom support image.</p>
                    </div>
                    
                    <input
                      type="file"
                      ref={agentFileInputRef}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          try {
                            const base64 = await compressImage(file);
                            setEditingAgent(prev => prev ? { ...prev, imageUrl: base64 } : null);
                          } catch (err) {
                            console.error("Error compressing agent image:", err);
                          }
                        }
                      }}
                      accept="image/*"
                      className="hidden"
                    />
                  </div>

                  <div className="space-y-3.5 text-left">
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-400 mb-1 tracking-wider">
                        Agent Name
                      </label>
                      <input
                        type="text"
                        value={editingAgent.name}
                        onChange={(e) => setEditingAgent(prev => prev ? { ...prev, name: e.target.value } : null)}
                        required
                        className="w-full bg-[#121921] border border-white/10 px-3 py-2 rounded-lg text-xs font-bold text-white focus:outline-none focus:border-[#E2FF00] transition-colors"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-400 mb-1 tracking-wider">
                        Role / Title
                      </label>
                      <input
                        type="text"
                        value={editingAgent.role}
                        onChange={(e) => setEditingAgent(prev => prev ? { ...prev, role: e.target.value } : null)}
                        required
                        className="w-full bg-[#121921] border border-white/10 px-3 py-2 rounded-lg text-xs font-bold text-white focus:outline-none focus:border-[#E2FF00] transition-colors"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-400 mb-1 tracking-wider">
                        Availability Status
                      </label>
                      <select
                        value={editingAgent.status}
                        onChange={(e) => setEditingAgent(prev => prev ? { ...prev, status: e.target.value as any } : null)}
                        className="w-full bg-[#121921] border border-white/10 px-3 py-2 rounded-lg text-xs font-bold text-white focus:outline-none focus:border-[#E2FF00] transition-colors cursor-pointer"
                      >
                        <option value="available">Available (Online)</option>
                        <option value="busy">Busy (In Call)</option>
                        <option value="offline">Offline (Away)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-400 mb-1 tracking-wider">
                        Personality & Deployment (Internal Info)
                      </label>
                      <p className="bg-[#121921] border border-white/5 px-3 py-2 rounded-lg text-[10px] leading-relaxed text-slate-300 italic">
                        {editingAgent.personality || "No internal traits assigned."}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2.5 pt-2">
                    <button
                      type="button"
                      onClick={() => setEditingAgent(null)}
                      className="flex-1 bg-white/5 hover:bg-white/10 text-slate-300 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-colors active:scale-95 cursor-pointer"
                    >
                      Back to list
                    </button>
                    <button
                      type="submit"
                      className="flex-1 bg-[#E2FF00] hover:bg-[#cbfa00] text-[#0b1017] py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-colors active:scale-95 shadow-md cursor-pointer"
                    >
                      Save Agent
                    </button>
                  </div>
                </form>
              ) : (
                /* Agents List Grid */
                <div className="space-y-3.5 flex-1 overflow-y-auto scrollbar-thin text-left">
                  <p className="text-[10px] text-slate-400 leading-relaxed">
                    Manage support agent identities, titles, and availability. Changes are synced instantly with Firestore, updating client views in real-time.
                  </p>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {agents.map((agent) => (
                      <div
                        key={agent.id}
                        className="bg-white/5 border border-white/10 hover:border-[#E2FF00]/45 p-3.5 rounded-xl flex flex-col justify-between gap-3 text-left transition-all"
                      >
                        <div className="flex items-center gap-2.5">
                          <img
                            src={agent.imageUrl}
                            alt={agent.name}
                            className="w-10 h-10 rounded-full object-cover shrink-0 border border-white/15"
                            referrerPolicy="no-referrer"
                          />
                          <div className="min-w-0">
                            <p className="text-xs font-black text-white truncate uppercase tracking-wide">
                              {agent.name}
                            </p>
                            <p className="text-[9px] text-[#E2FF00] font-black truncate uppercase tracking-widest leading-none mt-0.5">
                              {agent.role}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between border-t border-white/5 pt-2 mt-1">
                          {/* Status Badge */}
                          <div className="flex items-center gap-1.5">
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              agent.status === "available" ? "bg-emerald-500 animate-pulse" :
                              agent.status === "busy" ? "bg-amber-500" : "bg-slate-400"
                            }`} />
                            <span className="text-[9px] font-mono text-slate-300 font-bold uppercase tracking-wider">
                              {agent.status}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => setEditingAgent({ ...agent })}
                            className="text-[9px] bg-[#E2FF00]/10 hover:bg-[#E2FF00]/20 text-[#E2FF00] border border-[#E2FF00]/20 px-2.5 py-1 rounded font-black uppercase cursor-pointer transition-all active:scale-95"
                          >
                            Edit Profile
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Quick URL Shortcut Modal */}
      <AnimatePresence>
        {showUrlShortcutModal && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-[70] flex items-center justify-center p-4 select-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-[#0b1017] border border-white/10 p-5 rounded-2xl w-full max-w-[420px] shadow-[0_25px_60px_rgba(0,0,0,0.85)] flex flex-col"
            >
              <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <LinkIcon className="w-5 h-5 text-[#E2FF00]" />
                  <h3 className="text-sm font-black uppercase tracking-wider text-white font-sans">
                    URL Shortcut Generator
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowUrlShortcutModal(false);
                    setUrlShortcutTitle("");
                    setUrlShortcutLink("");
                  }}
                  className="p-1 hover:bg-white/5 rounded-full transition-all text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (urlShortcutTitle.trim() && urlShortcutLink.trim()) {
                    handleCreateUrlShortcut(urlShortcutTitle, urlShortcutLink);
                  }
                }}
                className="space-y-4 text-left"
              >
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-1 tracking-wider">
                    Button Title / Text
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Join VIP Channel"
                    value={urlShortcutTitle}
                    onChange={(e) => setUrlShortcutTitle(e.target.value)}
                    className="w-full bg-[#121921] border border-white/10 px-3 py-2.5 rounded-lg text-xs font-bold text-white focus:outline-none focus:border-[#E2FF00] transition-colors placeholder:text-slate-600"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-1 tracking-wider">
                    URL Link / Website Address
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. t.me/channel"
                    value={urlShortcutLink}
                    onChange={(e) => setUrlShortcutLink(e.target.value)}
                    className="w-full bg-[#121921] border border-white/10 px-3 py-2.5 rounded-lg text-xs font-bold text-white focus:outline-none focus:border-[#E2FF00] transition-colors placeholder:text-slate-600"
                  />
                </div>

                <div className="flex gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowUrlShortcutModal(false);
                      setUrlShortcutTitle("");
                      setUrlShortcutLink("");
                    }}
                    className="flex-1 bg-white/5 hover:bg-white/10 text-slate-300 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-colors active:scale-95 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!urlShortcutTitle.trim() || !urlShortcutLink.trim()}
                    className="flex-1 bg-[#E2FF00] hover:bg-[#cbfa00] text-[#0b1017] py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-colors active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-md cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Send Button</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Zoomed Image Lightbox */}
      <AnimatePresence>
        {zoomedImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setZoomedImage(null)}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 cursor-zoom-out select-none"
          >
            {/* Close button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setZoomedImage(null);
              }}
              className="absolute top-4 right-4 p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer z-50 active:scale-95"
            >
              <X className="w-6 h-6" />
            </button>
            
            {/* Image content */}
            <motion.img
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              src={zoomedImage}
              alt="Zoomed attachment"
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
