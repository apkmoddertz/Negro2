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
  Zap
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
}

export default function WhatsAppChat({
  currentUser,
  isMainAdmin,
  userProfile,
  userMessages,
  adminAllMessages,
  allUsers,
  db,
  sendFCMNotificationProgrammatic
}: WhatsAppChatProps) {
  // Chat input
  const [inputText, setInputText] = useState("");
  
  // Selected user for Admin chat
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  
  // Search state for Admin users list
  const [searchQuery, setSearchQuery] = useState("");
  
  // Chat window scroll ref
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

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
    if (!inputText.trim() || !currentUser) return;

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
        timestamp: new Date().toISOString(),
        readByAdmin: isMainAdmin ? true : false,
        readByUser: isMainAdmin ? false : true
      };

      await setDoc(doc(db, "chats", messageId), messageData);
      setInputText("");

      // Dispatch Programmatic FCM Notifications
      let notifyTitle = "You have new message on Negro Tips";
      let notifyBody = messageData.text;

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

  const quickReplies = isMainAdmin 
    ? [
        "Welcome! Your payment receipt has been received and verified. Your VIP status is now fully active. Enjoy the wins!",
        "Hello, please upload a clear, full-page screenshot of your payment confirmation receipt to activate your VIP subscription.",
        "Our team is currently reviewing your payment proof. Please remain patient, it takes less than 15 minutes.",
        "Check out today's active VIP ticket now! We updated the odds and guaranteed correct scores."
      ]
    : [
        "Hello Admin! I've just sent my payment screenshot, please activate my subscription.",
        "Are today's VIP matches ready?",
        "Thank you! The banker tips of yesterday won perfectly.",
        "Can I pay using another mobile money provider?"
      ];

  return (
    <div id="whatsapp-view-container" className="w-full bg-[#0b0f14] border border-white/5 rounded-2xl shadow-2xl flex flex-col md:flex-row h-[75vh] min-h-[500px] overflow-hidden select-none font-sans">
      
      {/* SIDEBAR FOR ADMIN: LIST OF USER CHATS */}
      {isMainAdmin && (
        <div id="admin-chat-sidebar" className={`w-full md:w-[280px] border-r border-white/10 flex flex-col bg-[#0e141b] ${selectedUserId ? "hidden md:flex" : "flex"}`}>
          <div className="p-3 border-b border-white/5 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-[#E2FF00]" />
                Client Chats
              </span>
              <span className="text-[10px] bg-[#E2FF00]/10 text-[#E2FF00] px-2 py-0.5 rounded-full font-mono font-bold">
                {chatSessions.length} Actives
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
                className="w-full pl-8 pr-3 py-1.5 bg-[#17212b] border border-white/5 rounded-lg text-xs font-bold text-white placeholder-slate-500 focus:outline-none focus:border-[#E2FF00]/40 transition-all"
              />
              <Search className="absolute left-2.5 top-2.2 w-3.5 h-3.5 text-slate-500" />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-white/5 scrollbar-none">
            {filteredSessions.length === 0 ? (
              <div className="p-6 text-center space-y-1 text-slate-500 select-none">
                <Search className="w-6 h-6 mx-auto text-slate-600 mb-1" />
                <p className="text-xs font-bold">No active chat sessions</p>
                <p className="text-[10px]">Waiting for users to initiate chats</p>
              </div>
            ) : (
              filteredSessions.map(session => {
                const isSelected = selectedUserId === session.userId;
                return (
                  <button
                    id={`session-btn-${session.userId}`}
                    key={session.userId}
                    onClick={() => setSelectedUserId(session.userId)}
                    className={`w-full p-3 flex items-start gap-2.5 transition-all cursor-pointer text-left ${
                      isSelected ? "bg-[#182533]" : "hover:bg-white/5"
                    }`}
                  >
                    <div className="relative shrink-0 mt-0.5">
                      <div className={`w-8 h-8 rounded-full ${session.isVip ? "bg-gradient-to-r from-yellow-500 to-[#E2FF00]" : "bg-slate-700"} flex items-center justify-center text-black font-black text-xs uppercase`}>
                        {session.username[0]}
                      </div>
                      <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-[#0b0f14] ${session.isVip ? "bg-yellow-500" : "bg-emerald-500 animate-pulse"}`} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-white truncate flex items-center gap-1 font-sans uppercase tracking-wide">
                          {session.username}
                          {session.isVip && <Zap className="w-2.5 h-2.5 text-yellow-400 fill-yellow-400 shrink-0" />}
                        </p>
                        <span className="text-[9px] text-slate-500 font-mono">
                          {new Date(session.lastMessage.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 truncate mt-0.5">
                        {session.lastMessage.senderId === "admin" ? "You: " : ""}{session.lastMessage.text}
                      </p>
                      <p className="text-[8px] text-slate-600 truncate font-mono">
                        {session.email}
                      </p>
                    </div>

                    {session.unreadCount > 0 && (
                      <span className="bg-red-500 text-white text-[9px] px-1.5 py-0.5 rounded-full shrink-0 font-black font-mono animate-pulse self-center">
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
      <div id="chat-conversation-panel" className="flex-1 flex flex-col bg-[#0c131a] relative">
        
        {/* WhatsApp-style Header */}
        {activePartner ? (
          <div className="h-[52px] bg-[#17212b] px-4 flex items-center justify-between border-b border-white/5 shadow-md">
            <div className="flex items-center gap-3">
              {isMainAdmin && (
                <button
                  id="chat-back-to-sessions"
                  onClick={() => setSelectedUserId(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 active:scale-95 transition-all cursor-pointer md:hidden mr-1"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
              )}
              
              <div className="relative shrink-0">
                <div className={`w-8 h-8 rounded-full ${activePartner.isVip ? "bg-gradient-to-r from-yellow-500 to-[#E2FF00]" : "bg-emerald-600"} flex items-center justify-center text-black font-black text-xs uppercase shadow-[0_0_8px_rgba(226,255,0,0.1)]`}>
                  {activePartner.username[0]}
                </div>
                <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-400 border border-[#17212b] animate-ping" />
                <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-500 border border-[#17212b]" />
              </div>

              <div>
                <p className="text-xs font-black text-white flex items-center gap-1 font-sans uppercase tracking-wider">
                  {activePartner.username}
                  {activePartner.isVip && <Zap className="w-3 h-3 text-yellow-400 fill-yellow-400" />}
                </p>
                <span className="text-[9px] text-emerald-400 font-bold block leading-none">
                  {isMainAdmin ? activePartner.email : "Official Support"}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3.5 text-slate-400">
              <Phone className="w-4 h-4 hover:text-[#E2FF00] cursor-pointer transition-colors" />
              <Video className="w-4 h-4 hover:text-[#E2FF00] cursor-pointer transition-colors" />
              <MoreVertical className="w-4 h-4 hover:text-white cursor-pointer transition-colors" />
            </div>
          </div>
        ) : (
          <div className="h-[52px] bg-[#17212b] px-4 flex items-center justify-center border-b border-white/5">
            <span className="text-xs text-slate-500 font-bold">Select conversation thread</span>
          </div>
        )}

        {/* MESSAGES SCROLL CONTAINER with WhatsApp Doodle Wallpaper look */}
        <div 
          id="chat-messages-container"
          className="flex-1 overflow-y-auto p-4 space-y-3 relative scrollbar-none"
          style={{
            backgroundImage: "radial-gradient(rgba(226, 255, 0, 0.015) 1.5px, transparent 1.5px)",
            backgroundSize: "24px 24px"
          }}
        >
          {/* Support Safe Banner */}
          <div className="flex justify-center my-1 select-none">
            <div className="bg-[#18222d] border border-white/5 px-3 py-1.5 rounded-xl flex items-center gap-1.5 text-[10px] text-slate-400 max-w-[280px] text-center shadow-md">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span>End-to-end encrypted. Tap to verify.</span>
            </div>
          </div>

          {isMainAdmin && !selectedUserId ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 space-y-3 select-none">
              <div className="w-16 h-16 rounded-full bg-[#17212b] border border-white/5 flex items-center justify-center text-[#E2FF00] shadow-lg">
                <MessageSquare className="w-8 h-8" />
              </div>
              <div className="max-w-[240px]">
                <h4 className="text-xs font-black uppercase text-white tracking-wider">Negro Support Chats</h4>
                <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
                  Select any active client from the left menu panel to view transaction histories and respond instantly.
                </p>
              </div>
            </div>
          ) : activeMessages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2 select-none">
              <p className="text-xs font-bold text-slate-400">No messages yet</p>
              <p className="text-[10px] text-slate-500 max-w-[200px] leading-relaxed">
                {isMainAdmin 
                  ? "Send an initial message to active users to help with their subscriptions." 
                  : "Send your screenshot or message. The support team responds in less than 15 minutes."}
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
                  <div className={`max-w-[75%] rounded-2xl p-2.5 shadow-md flex flex-col ${
                    isMe 
                      ? "bg-emerald-900/60 border border-emerald-500/20 rounded-tr-none text-slate-100" 
                      : "bg-[#182533] border border-white/5 rounded-tl-none text-slate-200"
                  }`}>
                    {/* Message Sender Name */}
                    <span className="text-[8px] font-black uppercase tracking-wider text-[#E2FF00] mb-0.5">
                      {isMe ? "You" : msg.senderName}
                    </span>
                    
                    {/* Text */}
                    <p className="text-xs leading-relaxed font-sans select-text whitespace-pre-wrap">
                      {msg.text}
                    </p>

                    {/* Metadata */}
                    <div className="flex items-center justify-end gap-1 mt-1 self-end">
                      <span className="text-[8px] text-slate-400 font-mono">
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {isMe && (
                        <span>
                          {isMainAdmin ? (
                            msg.readByAdmin ? (
                              <CheckCircle2 className="w-2.5 h-2.5 text-[#E2FF00]" />
                            ) : (
                              <Check className="w-2.5 h-2.5 text-slate-500" />
                            )
                          ) : (
                            msg.readByUser ? (
                              <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
                            ) : (
                              <Clock className="w-2.5 h-2.5 text-slate-500" />
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
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Replies templates chips */}
        {(!isMainAdmin || selectedUserId) && (
          <div className="px-3 py-1.5 bg-[#0e141b]/80 border-t border-white/5 overflow-x-auto whitespace-nowrap flex gap-2 scrollbar-none">
            {quickReplies.map((reply, i) => (
              <button
                id={`quick-reply-${i}`}
                key={i}
                onClick={() => handleQuickReply(reply)}
                className="inline-block px-3 py-1 bg-[#17212b] hover:bg-[#1f2d3d] text-[10px] text-slate-300 rounded-full border border-white/5 active:scale-95 transition-all cursor-pointer"
              >
                {reply}
              </button>
            ))}
          </div>
        )}

        {/* Bottom messaging input bar */}
        {(!isMainAdmin || selectedUserId) && (
          <form 
            id="chat-message-form"
            onSubmit={handleSend} 
            className="p-3 bg-[#17212b] border-t border-white/5 flex items-center gap-2"
          >
            <div className="flex items-center gap-2.5 text-slate-400">
              <Smile className="w-5 h-5 hover:text-[#E2FF00] cursor-pointer transition-colors shrink-0" />
              <Paperclip className="w-4.5 h-4.5 hover:text-[#E2FF00] cursor-pointer transition-colors shrink-0" />
            </div>

            <input
              id="message-input-field"
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 px-3 py-2 bg-[#0e141b] border border-white/5 rounded-xl text-xs font-medium text-white focus:outline-none focus:border-[#E2FF00]/40 placeholder-slate-500 transition-all"
            />

            <button
              id="send-message-btn"
              type="submit"
              disabled={!inputText.trim()}
              className="w-8 h-8 rounded-full bg-[#E2FF00] hover:bg-[#d4f000] text-black flex items-center justify-center shrink-0 active:scale-95 hover:scale-105 disabled:opacity-40 disabled:scale-100 disabled:cursor-not-allowed transition-all cursor-pointer shadow-[0_0_10px_rgba(226,255,0,0.25)]"
            >
              <Send className="w-3.5 h-3.5 ml-0.5" strokeWidth={2.5} />
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
