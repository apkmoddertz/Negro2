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
    <div id="whatsapp-view-container" className="w-full bg-[#f0f2f5] border border-slate-300/80 rounded-2xl shadow-xl flex flex-col md:flex-row h-[calc(100vh-100px)] md:h-[calc(100vh-130px)] min-h-[520px] overflow-hidden select-none font-sans text-[#111b21]">
      
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
        
        {/* WhatsApp-style Header */}
        {activePartner ? (
          <div className="h-[54px] bg-[#f0f2f5] px-4 flex items-center justify-between border-b border-[#e9edef] shadow-sm text-[#111b21]">
            <div className="flex items-center gap-3">
              {isMainAdmin && (
                <button
                  id="chat-back-to-sessions"
                  onClick={() => setSelectedUserId(null)}
                  className="p-1.5 rounded-lg text-[#54656f] hover:text-[#111b21] hover:bg-[#e1e3e5] active:scale-95 transition-all cursor-pointer md:hidden mr-1"
                >
                  <ArrowLeft className="w-4.5 h-4.5" />
                </button>
              )}
              
              <div className="relative shrink-0">
                <div className={`w-9 h-9 rounded-full ${activePartner.isVip ? "bg-gradient-to-br from-[#ffd700] to-[#ffa500]" : "bg-emerald-600"} flex items-center justify-center text-white font-black text-xs uppercase shadow-sm`}>
                  {activePartner.username[0]}
                </div>
                <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-400 border border-white animate-ping" />
                <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-500 border border-white" />
              </div>

              <div>
                <p className="text-xs font-black text-[#111b21] flex items-center gap-1 font-sans uppercase tracking-wider leading-tight">
                  {activePartner.username}
                  {activePartner.isVip && <Zap className="w-3 h-3 text-yellow-500 fill-yellow-500" />}
                </p>
                <span className="text-[9px] text-[#00a884] font-bold block">
                  {isMainAdmin ? activePartner.email : "Official Live Support"}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-4 text-[#54656f]">
              <Phone className="w-4.5 h-4.5 hover:text-[#111b21] cursor-pointer transition-colors" />
              <Video className="w-4.5 h-4.5 hover:text-[#111b21] cursor-pointer transition-colors" />
              <MoreVertical className="w-4.5 h-4.5 hover:text-[#111b21] cursor-pointer transition-colors" />
            </div>
          </div>
        ) : (
          <div className="h-[54px] bg-[#f0f2f5] px-4 flex items-center justify-center border-b border-[#e9edef] text-[#111b21]">
            <span className="text-xs text-[#667781] font-bold">Select conversation thread to start chatting</span>
          </div>
        )}

        {/* MESSAGES SCROLL CONTAINER with genuine WhatsApp Doodle Wallpaper look */}
        <div 
          id="chat-messages-container"
          className="flex-1 overflow-y-auto p-4 space-y-3 relative scrollbar-none"
          style={{
            backgroundImage: "url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')",
            backgroundSize: "380px",
            backgroundRepeat: "repeat",
            opacity: 0.98
          }}
        >
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
                    
                    {/* Text */}
                    <p className="text-xs leading-relaxed font-sans select-text whitespace-pre-wrap text-[#111b21]">
                      {msg.text}
                    </p>

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
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Replies templates chips */}
        {(!isMainAdmin || selectedUserId) && (
          <div className="px-3 py-2 bg-[#f0f2f5] border-t border-[#e9edef] overflow-x-auto whitespace-nowrap flex gap-2 scrollbar-none shrink-0 select-none">
            {quickReplies.map((reply, i) => (
              <button
                id={`quick-reply-${i}`}
                key={i}
                onClick={() => handleQuickReply(reply)}
                className="inline-block px-3 py-1 bg-[#ffffff] hover:bg-slate-100 text-[#005c4b] text-[10px] rounded-full border border-[#e9edef] active:scale-95 transition-all cursor-pointer shadow-sm font-semibold"
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
            className="p-3 bg-[#f0f2f5] border-t border-[#e9edef] flex items-center gap-3 shrink-0 sticky bottom-0 z-20"
          >
            <div className="flex items-center gap-3 text-[#54656f]">
              <Smile className="w-5.5 h-5.5 hover:text-[#00a884] cursor-pointer transition-colors shrink-0" />
              <Paperclip className="w-5 h-5 hover:text-[#00a884] cursor-pointer transition-colors shrink-0" />
            </div>

            <input
              id="message-input-field"
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 px-4 py-2.5 bg-[#ffffff] border border-slate-200 rounded-full text-xs font-semibold text-[#111b21] focus:outline-none focus:border-[#00a884] placeholder-slate-400 transition-all shadow-sm"
            />

            <button
              id="send-message-btn"
              type="submit"
              disabled={!inputText.trim()}
              className="w-10 h-10 rounded-full bg-[#00a884] hover:bg-[#008f72] text-white flex items-center justify-center shrink-0 active:scale-95 hover:scale-105 disabled:opacity-40 disabled:scale-100 disabled:cursor-not-allowed transition-all cursor-pointer shadow-md"
            >
              <Send className="w-4 h-4 ml-0.5 text-white" strokeWidth={2.5} />
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
