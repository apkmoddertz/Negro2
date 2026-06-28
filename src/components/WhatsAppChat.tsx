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
  Smile,
  ShieldCheck,
  Zap,
  X,
  Trash2
} from "lucide-react";
import { doc, setDoc, collection } from "firebase/firestore";

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
  setSelectedUserId: externalSetSelectedUserId
}: WhatsAppChatProps) {
  // Chat input
  const [inputText, setInputText] = useState("");
  const [attachedImages, setAttachedImages] = useState<string[]>([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Auto-resize textarea to fit content up to 6 lines (approx 144px)
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 144)}px`;
    }
  }, [inputText]);

  // Standard Emojis List
  const emojis = [
    "😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣", "😊", "😇", "🙂", "🙃", "😉", "😌", "😍", "🥰", "😘", "😋", "😛", "😜", "🤪", "🤨", "🧐", "😎", "🤩", "🥳", "😏", "😒", "😞", "😔", "😟", "😕", "🙁", "☹️", "😣", "😫", "😩", "🥺", "😢", "😭", "😤", "😠", "😡", "🤬", "🤯", "😳", "🥵", "🥶", "😱", "😨", "😰", "😥", "😓", "🤗", "🤔", "🫣", "🤭", "🤫", "🤥", "😶", "😐", "😑", "😬", "🫠", "🙄", "😯", "😴", "😵", "🤐", "🥴", "🤢", "🤮", "🤧", "😷", "🤒", "🤕", "🤑", "🤠", "😈", "💀", "👽", "🤖", "🎃", "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "💔", "❤️‍🔥", "❤️‍🩹", "❣️", "💕", "💞", "💓", "💗", "💖", "💘", "💝", "👍", "👎", "👊", "✊", "🤛", "🤜", "🤞", "✌️", "🤟", "🤘", "👌", "🤌", "🤏", "👈", "👉", "👆", "👇", "☝️", "✋", "🤚", "👋", "🤙", "💪", "🙏", "🤝", "👏", "🙌", "👐", "🤲", "🔥", "✨", "🌟", "⭐", "💫", "⚡", "💥", "💯", "🎉", "🎊", "🎈", "🎁", "🏆", "⚽", "🏀", "🏈", "🎯", "🎮", "💵", "💳", "📈", "📉", "✅", "❌", "⚠️", "👑", "💬"
  ];

  // Insert emoji at current cursor position in textarea
  const insertEmoji = (emoji: string) => {
    const textarea = textareaRef.current;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = textarea.value;
      const before = text.substring(0, start);
      const after = text.substring(end, text.length);
      setInputText(before + emoji + after);
      
      // Reset cursor position after React re-renders
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + emoji.length, start + emoji.length);
      }, 0);
    } else {
      setInputText(prev => prev + emoji);
    }
  };

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

  // Close emoji picker when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("#emoji-picker-container") && !target.closest("#emoji-btn-trigger")) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);
  
  // Selected user for Admin chat
  const [localSelectedUserId, localSetSelectedUserId] = useState<string | null>(null);
  const selectedUserId = externalSelectedUserId !== undefined ? externalSelectedUserId : localSelectedUserId;
  const setSelectedUserId = externalSetSelectedUserId !== undefined ? externalSetSelectedUserId : localSetSelectedUserId;
  
  // Search state for Admin users list
  const [searchQuery, setSearchQuery] = useState("");

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

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const hasText = !!inputText.trim();
    const hasImages = attachedImages.length > 0;
    if ((!hasText && !hasImages) || !currentUser) return;

    try {
      const messageId = "msg_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7);
      const targetUserId = isMainAdmin ? selectedUserId : currentUser.uid;

      if (!targetUserId) return;

      const messageData = {
        id: messageId,
        userId: targetUserId,
        senderId: isMainAdmin ? "admin" : currentUser.uid,
        senderName: isMainAdmin ? "Admin" : (currentUser.displayName || currentUser.email || "User"),
        text: inputText.trim(),
        images: attachedImages,
        timestamp: new Date().toISOString(),
        readByAdmin: isMainAdmin ? true : false,
        readByUser: isMainAdmin ? false : true
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
    <div id="whatsapp-view-container" className="w-full bg-[#f0f2f5] flex flex-col md:flex-row h-[calc(100vh-54px)] overflow-hidden select-none font-sans text-[#111b21]">
      
      {/* SIDEBAR FOR ADMIN: LIST OF USER CHATS */}
      {isMainAdmin && (
        <div id="admin-chat-sidebar" className={`w-full md:w-[320px] border-r border-[#d1d7db] flex flex-col bg-[#ffffff] ${selectedUserId ? "hidden md:flex" : "flex"}`}>
          <div className="p-3.5 border-b border-[#e9edef] bg-[#f0f2f5] space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-[#111b21] flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-[#00a884]" />
                Client Chats
              </span>
              <span className="text-[10px] bg-[#00a884]/10 text-[#00a884] px-2.5 py-0.5 rounded-full font-sans font-black">
                {chatSessions.length} Active
              </span>
            </div>
            
            {/* Search Input */}
            <div className="relative">
              <input
                id="chat-search"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search clients..."
                className="w-full pl-8 pr-3 py-1.5 bg-[#ffffff] border border-slate-200 rounded-lg text-xs font-bold text-[#111b21] placeholder-slate-400 focus:outline-none focus:border-[#00a884] transition-all"
              />
              <Search className="absolute left-2.5 top-2.2 w-3.5 h-3.5 text-slate-400" />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 bg-white scrollbar-none">
            {filteredSessions.length === 0 ? (
              <div className="p-6 text-center space-y-1 text-slate-400 select-none h-full flex flex-col justify-center items-center">
                <Search className="w-6 h-6 mx-auto text-slate-300 mb-1" />
                <p className="text-xs font-bold text-slate-600">No active sessions</p>
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
                    className={`w-full p-3.5 flex items-start gap-3 transition-all cursor-pointer text-left border-b border-[#f5f6f6] ${
                      isSelected ? "bg-[#eaebeb]" : "hover:bg-[#f5f6f6] bg-[#ffffff]"
                    }`}
                  >
                    <div className="relative shrink-0 mt-0.5">
                      <div className={`w-9 h-9 rounded-full ${session.isVip ? "bg-gradient-to-br from-[#ffd700] to-[#ffa500]" : "bg-slate-300"} flex items-center justify-center text-slate-800 font-bold text-sm uppercase shadow-sm`}>
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
                        <span className="text-[9px] text-slate-400 font-mono">
                          {new Date(session.lastMessage.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-[10px] text-[#667781] truncate mt-0.5">
                        {session.lastMessage.senderId === "admin" ? "You: " : ""}{session.lastMessage.text}
                      </p>
                      <p className="text-[8px] text-slate-400 truncate font-mono mt-0.5">
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
      <div id="chat-conversation-panel" className="flex-1 flex flex-col bg-[#efeae2] relative border-l border-[#d1d7db] h-full overflow-hidden">
        
        {/* MESSAGES SCROLL CONTAINER with genuine WhatsApp Doodle Wallpaper look */}
        <div 
          id="chat-messages-container"
          className="flex-1 overflow-y-auto p-4 space-y-3 relative scrollbar-none"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          style={{
            backgroundImage: "url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')",
            backgroundSize: "380px",
            backgroundRepeat: "repeat",
            opacity: 0.98
          }}
        >
          {isDragging && (
            <div className="absolute inset-0 bg-[#00a884]/15 border-4 border-dashed border-[#00a884] rounded-2xl flex flex-col items-center justify-center z-50 pointer-events-none animate-pulse">
              <Paperclip className="w-12 h-12 text-[#00a884] mb-2" />
              <p className="text-sm font-black text-[#005c4b] uppercase tracking-wider">Drop images to attach</p>
            </div>
          )}
          {/* Support Safe Banner */}
          <div className="flex justify-center my-1.5 select-none">
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
                <h4 className="text-sm font-black uppercase text-[#111b21] tracking-wider">Negro Support Chats</h4>
                <p className="text-[10px] text-[#667781] mt-1 leading-relaxed">
                  Select any active client from the left menu panel to view transaction histories and respond instantly.
                </p>
              </div>
            </div>
          ) : activeMessages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2 select-none">
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
              return (
                <div 
                  key={msg.id || idx} 
                  className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                >
                  <div className={`max-w-[70%] rounded-2xl p-2.5 shadow-sm flex flex-col relative ${
                    isMe 
                      ? "bg-[#d9fdd3] border border-[#e1f7de] rounded-tr-none text-[#111b21]" 
                      : "bg-[#ffffff] border border-[#e9edef] rounded-tl-none text-[#111b21]"
                  }`}>
                    {/* Message Sender Name */}
                    <span className="text-[8px] font-black uppercase tracking-wider text-[#005c4b] mb-0.5 select-none">
                      {isMe ? "You" : msg.senderName}
                    </span>
                    
                    {/* Image attachments */}
                    {msg.images && msg.images.length > 0 && (
                      <div className={`grid gap-1 mb-1.5 rounded-lg overflow-hidden ${msg.images.length === 1 ? 'grid-cols-1' : 'grid-cols-2'} max-w-[280px]`}>
                        {msg.images.map((img: string, i: number) => (
                          <div key={i} className="relative group overflow-hidden rounded-md border border-slate-100 bg-slate-50">
                            <img 
                              src={img} 
                              alt="Attached visual" 
                              className="object-cover w-full h-auto max-h-48 cursor-pointer hover:scale-[1.02] transition-transform duration-200" 
                              onClick={() => {
                                const w = window.open();
                                if (w) {
                                  w.document.write(`<img src="${img}" style="max-width:100%; max-height:100vh; display:block; margin:auto;" />`);
                                  w.document.body.style.backgroundColor = "black";
                                  w.document.body.style.margin = "0";
                                  w.document.title = "View Image";
                                }
                              }}
                            />
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Text */}
                    {msg.text && (
                      <p className="text-xs leading-relaxed font-sans select-text whitespace-pre-wrap text-[#111b21]">
                        {msg.text}
                      </p>
                    )}

                    {/* Metadata */}
                    <div className="flex items-center justify-end gap-1 mt-1 self-end text-[#667781] select-none">
                      <span className="text-[8px] font-mono">
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {isMe && (
                        <span>
                          {isMainAdmin ? (
                            msg.readByAdmin ? (
                              <CheckCircle2 className="w-3 h-3 text-[#53bdeb]" />
                            ) : (
                              <Check className="w-3 h-3 text-slate-400" />
                            )
                          ) : (
                            msg.readByUser ? (
                              <CheckCircle2 className="w-3 h-3 text-[#53bdeb]" />
                            ) : (
                              <Clock className="w-3 h-3 text-slate-400" />
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
          <div className="h-28 md:h-36 shrink-0" />
          <div ref={messagesEndRef} />
        </div>

        {/* Bottom fixed messaging controls area */}
        {(!isMainAdmin || selectedUserId) && (
          <div 
            id="fixed-chat-controls-container" 
            className={`fixed bottom-0 right-0 z-30 bg-[#870404] transition-all duration-300 flex flex-col ${
              isMainAdmin ? 'left-0 md:left-[320px]' : 'left-0'
            }`}
            style={{
              paddingBottom: "env(safe-area-inset-bottom)"
            }}
          >
            {/* Attached Image Previews Rail */}
            {attachedImages.length > 0 && (
              <div className="px-4 py-2 bg-[#870404] border-b border-white/10 flex items-center gap-3 overflow-x-auto scrollbar-none animate-fade-in shrink-0">
                {attachedImages.map((img, i) => (
                  <div key={i} className="relative shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 border-[#E2FF00] shadow-md group">
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
                <div className="text-[10px] text-white/70 font-sans font-bold uppercase shrink-0">
                  {attachedImages.length} file(s) selected
                </div>
              </div>
            )}

            {/* Emoji Picker Popover */}
            {showEmojiPicker && (
              <div 
                id="emoji-picker-container" 
                className="absolute bottom-full left-4 mb-3 w-[280px] sm:w-[320px] bg-white border border-slate-200 rounded-2xl shadow-2xl flex flex-col overflow-hidden z-40 animate-fade-in select-none"
              >
                <div className="px-3 py-1.5 bg-[#f0f2f5] border-b border-[#e9edef] flex justify-between items-center">
                  <span className="text-[10px] font-black uppercase text-[#111b21] tracking-wider">Quick Emojis</span>
                  <button 
                    type="button"
                    onClick={() => setShowEmojiPicker(false)}
                    className="p-1 hover:bg-slate-200 rounded-full transition-all cursor-pointer flex items-center justify-center"
                  >
                    <X className="w-3.5 h-3.5 text-slate-500" />
                  </button>
                </div>
                <div className="p-2 overflow-y-auto grid grid-cols-7 sm:grid-cols-8 gap-1.5 justify-items-center max-h-[160px] scrollbar-thin">
                  {emojis.map((emoji, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => insertEmoji(emoji)}
                      className="w-8 h-8 flex items-center justify-center text-lg hover:bg-slate-100 rounded-lg active:scale-90 transition-all cursor-pointer"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Main Form Area */}
            <form 
              id="chat-message-form"
              onSubmit={handleSend} 
              className="p-3 bg-[#870404] flex items-end gap-2.5 shrink-0 relative z-20"
            >
              {/* Left trigger buttons */}
              <div className="flex items-center gap-1.5 text-white/90 mb-1">
                <button
                  id="emoji-btn-trigger"
                  type="button"
                  onClick={() => setShowEmojiPicker(prev => !prev)}
                  className={`p-2 rounded-full cursor-pointer transition-all active:scale-90 ${showEmojiPicker ? 'text-[#E2FF00] bg-white/10' : 'text-white hover:text-[#E2FF00] hover:bg-white/10'}`}
                  title="Select emoji"
                >
                  <Smile className="w-5.5 h-5.5 shrink-0" />
                </button>

                <button
                  type="button"
                  onClick={handleAttachmentClick}
                  className="p-2 rounded-full text-white hover:text-[#E2FF00] hover:bg-white/10 cursor-pointer transition-all active:scale-90"
                  title="Attach images"
                >
                  <Paperclip className="w-5 h-5 shrink-0" />
                </button>
                
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
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Type your message..."
                  rows={1}
                  className="w-full pl-4 pr-3 py-2.5 bg-white/95 focus:bg-white border border-transparent rounded-[22px] text-xs font-semibold text-[#111b21] focus:outline-none focus:border-[#E2FF00] placeholder-slate-400 transition-all shadow-sm resize-none max-h-[144px] overflow-y-auto block leading-relaxed"
                  style={{ height: "38px" }}
                />
              </div>

              {/* Send Button */}
              <button
                id="send-message-btn"
                type="submit"
                disabled={!inputText.trim() && attachedImages.length === 0}
                className="w-10 h-10 rounded-full bg-[#E2FF00] text-[#300202] flex items-center justify-center shrink-0 active:scale-95 hover:scale-105 disabled:opacity-40 disabled:scale-100 disabled:cursor-not-allowed transition-all cursor-pointer shadow-md mb-0.5"
              >
                <Send className="w-4 h-4 ml-0.5" strokeWidth={2.5} />
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
