import React, { useState, useEffect, useRef } from "react";
import { 
  Bell, 
  Send, 
  Settings, 
  CheckCircle, 
  XCircle, 
  Key, 
  Trash2, 
  Eye, 
  EyeOff, 
  RefreshCw,
  Sparkles,
  Menu,
  X,
  Info,
  Trophy,
  ThumbsUp,
  Calendar,
  Layers,
  Tv,
  Crown,
  Target,
  Shuffle,
  Zap,
  Timer,
  ArrowLeft,
  Clock,
  Copy,
  Check,
  ExternalLink,
  ShieldAlert,
  Globe,
  Coins,
  Camera,
  Image,
  UserCheck
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { freeTips, vipTips } from "./data/tipsData";
import WhatsAppChat from "./components/WhatsAppChat";
import { CredentialsStatus, CategoryData, Match } from "./types";
import { auth, db } from "./firebase";
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup
} from "firebase/auth";
import { 
  doc, 
  setDoc, 
  onSnapshot, 
  collection,
  getDoc,
  query,
  where
} from "firebase/firestore";
import { 
  LogIn, 
  LogOut, 
  User, 
  Plus, 
  Edit3, 
  Lock, 
  PlusCircle, 
  Sparkles as SparklesIcon,
  Mail,
  MessageSquare,
  Paperclip
} from "lucide-react";

type ActiveTab = "notification" | "setting" | "correct_score" | "proofs" | "chats";

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

export default function App() {
  // Auth states
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  
  const isMainAdmin = currentUser?.email?.toLowerCase() === "jilalamasanja1998@gmail.com" || userProfile?.role === "admin";

  const [authLoading, setAuthLoading] = useState(true);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authUsername, setAuthUsername] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [firestoreError, setFirestoreError] = useState<string | null>(null);

  // Proof and User VIP Management States
  const [userProofs, setUserProofs] = useState<any[]>([]);
  const [allProofs, setAllProofs] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [proofImage, setProofImage] = useState<string | null>(null);
  const [uploadingProof, setUploadingProof] = useState<boolean>(false);
  const [proofSubmitSuccess, setProofSubmitSuccess] = useState<string | null>(null);
  const [proofSubmitError, setProofSubmitError] = useState<string | null>(null);
  const [viewingScreenshot, setViewingScreenshot] = useState<string | null>(null);
  const [userSearchQuery, setUserSearchQuery] = useState<string>("");
  const [adminSubTab, setAdminSubTab] = useState<"pending" | "users">("pending");

  // Firestore categories state
  const [freeCategories, setFreeCategories] = useState<CategoryData[]>(freeTips);
  const [vipCategories, setVipCategories] = useState<CategoryData[]>(vipTips);
  const [isSeeding, setIsSeeding] = useState(false);

  // Edit/Add Match states
  const [editingMatch, setEditingMatch] = useState<{
    categoryId: string;
    ticketIndex: number;
    matchIndex: number;
    match: Match;
  } | null>(null);

  const [addingMatch, setAddingMatch] = useState<{
    categoryId: string;
    ticketIndex: number;
  } | null>(null);

  // Unified Match Upload and Edit Form states
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [uploadCategory, setUploadCategory] = useState("");
  const [uploadDate, setUploadDate] = useState(""); // YYYY-MM-DD
  const [uploadTime, setUploadTime] = useState(""); // HH:MM
  const [uploadHome, setUploadHome] = useState("");
  const [uploadAway, setUploadAway] = useState("");
  const [uploadScore, setUploadScore] = useState("");
  const [uploadOdds, setUploadOdds] = useState("");
  const [uploadStatus, setUploadStatus] = useState<"win" | "lose" | "pending">("pending");

  // New match form states
  const [matchHome, setMatchHome] = useState("");
  const [matchAway, setMatchAway] = useState("");
  const [matchScore, setMatchScore] = useState("");
  const [matchOdds, setMatchOdds] = useState("");
  const [matchStatus, setMatchStatus] = useState<"win" | "lose" | "pending">("pending");
  const [matchDate, setMatchDate] = useState(""); // YYYY-MM-DD for editing
  const [matchTime, setMatchTime] = useState(""); // HH:MM for editing

  const [showAddTicket, setShowAddTicket] = useState(false);
  const [newTicketDate, setNewTicketDate] = useState("");

  // Deletion state to avoid native confirm dialogs (blocked in some iframe configurations)
  const [deleteConfirm, setDeleteConfirm] = useState<{
    type: "match" | "group";
    categoryId: string;
    ticketIndex: number;
    matchIndex?: number;
    title: string;
    message: string;
  } | null>(null);

  // Navigation & Drawer States
  const [activeTab, setActiveTab] = useState<ActiveTab>("correct_score");
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedProofCategory, setSelectedProofCategory] = useState<string>("vip_cs_today");

  // Home Page Navigation States
  const [toggleMode, setToggleMode] = useState<"free" | "vip">("free");
  
  // Selected category state for FREE and VIP
  const [selectedFreeCat, setSelectedFreeCat] = useState<string>("free_banker_today");
  const [selectedVipCat, setSelectedVipCat] = useState<string>("vip_elite_today");

  // Opened category details "new window feel like APK activity" state
  const [openedCategoryId, setOpenedCategoryId] = useState<string | null>(null);
  const activeCategory = openedCategoryId 
    ? [...freeCategories, ...vipCategories].find(c => c.id === openedCategoryId) || null
    : null;

  const [isStandaloneWindow, setIsStandaloneWindow] = useState(false);

  // Chat/Messages states
  const [userMessages, setUserMessages] = useState<any[]>([]);
  const [adminAllMessages, setAdminAllMessages] = useState<any[]>([]);
  const [selectedChatUser, setSelectedChatUser] = useState<any | null>(null);
  const [selectedChatUserId, setSelectedChatUserId] = useState<string | null>(null);
  const [chatInputText, setChatInputText] = useState("");

  // Parse standalone mode on startup
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const isStandalone = params.get("standalone") === "true";
    const categoryParam = params.get("category");
    if (isStandalone || categoryParam) {
      setIsStandaloneWindow(true);
      if (categoryParam) {
        setOpenedCategoryId(categoryParam);
        // Deduce toggleMode from category ID
        if (categoryParam.startsWith("vip_")) {
          setToggleMode("vip");
        } else {
          setToggleMode("free");
        }
      }
    }
  }, []);

  // Payment and paywall states
  const [selectedCountryCode, setSelectedCountryCode] = useState<string>("UG");
  const [exchangeRates, setExchangeRates] = useState<Record<string, number>>({
    UGX: 3750,
    NGN: 1500,
    XAF: 605,
    XOF: 605,
    TZS: 2600,
    USD: 1
  });
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // 1. Monitor Auth State
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      setIsDrawerOpen(false); // Explicitly close navigation drawer on auth change
      if (user) {
        setAuthError(null);
        try {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists()) {
            setUserProfile(userDoc.data());
          } else {
            // Create user document if it does not exist
            const isMainAdmin = user.email?.toLowerCase() === "jilalamasanja1998@gmail.com";
            const profile = {
              uid: user.uid,
              username: user.displayName || user.email?.split("@")[0] || "User",
              email: user.email || "",
              role: isMainAdmin ? "admin" : "user",
              createdAt: new Date().toISOString()
            };
            await setDoc(doc(db, "users", user.uid), profile);
            setUserProfile(profile);
          }
          setFirestoreError(null);
        } catch (err: any) {
          console.error("Error loading user profile:", err);
          setFirestoreError(err.message || String(err));
          // Fallback in-memory profile so logged in user is not blocked
          const isMainAdmin = user.email?.toLowerCase() === "jilalamasanja1998@gmail.com";
          const fallbackProfile = {
            uid: user.uid,
            username: user.displayName || user.email?.split("@")[0] || "User",
            email: user.email || "",
            role: isMainAdmin ? "admin" : "user",
            createdAt: new Date().toISOString(),
            isFallback: true
          };
          setUserProfile(fallbackProfile);
        }
      } else {
        setUserProfile(null);
      }
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // 2. Monitor Categories & Matches in Firestore
  useEffect(() => {
    // Anyone can read categories and tips, even logged-out users!
    const unsubscribe = onSnapshot(collection(db, "categories"), (snapshot) => {
      setFirestoreError(null); // Clear error on successful connection
      if (!snapshot.empty) {
        const docs = snapshot.docs.map(d => d.data() as CategoryData);
        
        // Filter into free and VIP categories
        const freeList = docs.filter(c => c.id.startsWith("free_"));
        const vipList = docs.filter(c => c.id.startsWith("vip_"));

        // Match the order of original lists (keep default tips if not in Firestore)
        const orderedFree = freeTips.map(orig => {
          const found = freeList.find(c => c.id === orig.id);
          return found || orig;
        });

        const orderedVip = vipTips.map(orig => {
          const found = vipList.find(c => c.id === orig.id);
          return found || orig;
        });

        setFreeCategories(orderedFree);
        setVipCategories(orderedVip);
      } else {
        // If Firestore categories are empty, keep standard defaults
        setFreeCategories(freeTips);
        setVipCategories(vipTips);
      }
    }, (error) => {
      console.error("Error listening to categories: ", error);
      setFirestoreError(error.message || String(error));
      handleFirestoreError(error, "list", "categories");
    });

    return () => unsubscribe();
  }, []);

  // 2b. Monitor user's own submitted proofs
  useEffect(() => {
    if (!currentUser) {
      setUserProofs([]);
      return;
    }
    const q = query(collection(db, "proofs"), where("userId", "==", currentUser.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        setUserProofs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } else {
        setUserProofs([]);
      }
    }, (err) => {
      console.error("Error loading user proofs:", err);
      handleFirestoreError(err, "list", "proofs");
    });
    return () => unsubscribe();
  }, [currentUser]);

  // 2c. Monitor all proofs and all users for Admin VIP management
  useEffect(() => {
    if (!isMainAdmin) {
      setAllProofs([]);
      setAllUsers([]);
      return;
    }

    const unsubProofs = onSnapshot(collection(db, "proofs"), (snapshot) => {
      if (!snapshot.empty) {
        const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        list.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setAllProofs(list);
      } else {
        setAllProofs([]);
      }
    }, (err) => {
      console.error("Error loading all proofs for admin:", err);
      handleFirestoreError(err, "list", "proofs");
    });

    const unsubUsers = onSnapshot(collection(db, "users"), (snapshot) => {
      if (!snapshot.empty) {
        setAllUsers(snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() })));
      } else {
        setAllUsers([]);
      }
    }, (err) => {
      console.error("Error loading all users for admin:", err);
      handleFirestoreError(err, "list", "users");
    });

    return () => {
      unsubProofs();
      unsubUsers();
    };
  }, [isMainAdmin]);

  // 2d. Listen to chat messages (realtime sync)
  useEffect(() => {
    if (!currentUser) {
      setUserMessages([]);
      return;
    }
    if (isMainAdmin) {
      setUserMessages([]);
      return;
    }

    const q = query(
      collection(db, "chats"),
      where("userId", "==", currentUser.uid)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        msgs.sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        setUserMessages(msgs);
      } else {
        setUserMessages([]);
      }
    }, (err) => {
      console.error("Error loading chat messages for user:", err);
    });

    return () => unsubscribe();
  }, [currentUser, isMainAdmin]);

  useEffect(() => {
    if (!currentUser || !isMainAdmin) {
      setAdminAllMessages([]);
      return;
    }

    const unsubscribe = onSnapshot(collection(db, "chats"), (snapshot) => {
      if (!snapshot.empty) {
        const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        msgs.sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        setAdminAllMessages(msgs);
      } else {
        setAdminAllMessages([]);
      }
    }, (err) => {
      console.error("Error loading all chat messages for admin:", err);
    });

    return () => unsubscribe();
  }, [currentUser, isMainAdmin]);

  // Programmatic FCM sender helper that triggers when user/admin chat
  const sendFCMNotificationProgrammatic = async (titleText: string, messageText: string) => {
    try {
      const stored = localStorage.getItem("fcm_service_account");
      if (!stored) return;
      const sa = JSON.parse(stored);
      const projectId = sa.project_id || sa.projectId;
      const privateKey = (sa.private_key || sa.privateKey)?.replace(/\\n/g, "\n");
      const clientEmail = sa.client_email || sa.clientEmail;

      if (!projectId || !privateKey || !clientEmail) return;

      const jwt = await signJwtClientSide(privateKey, clientEmail);
      const oauthRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: new URLSearchParams({
          grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
          assertion: jwt
        })
      });

      if (!oauthRes.ok) return;

      const tokenData = await oauthRes.json();
      const accessToken = tokenData.access_token;
      if (!accessToken) return;

      const fcmPayload = {
        message: {
          topic: "all",
          notification: {
            title: titleText.trim(),
            body: messageText.trim()
          },
          data: {
            title: titleText.trim(),
            body: messageText.trim(),
            source: "noyify-eedaf"
          },
          android: {
            priority: "high",
            notification: {
              channel_id: "default",
              sound: "default"
            }
          }
        }
      };

      const fcmEndpoint = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;
      await fetch(fcmEndpoint, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(fcmPayload)
      });
      console.log("Programmatic FCM push sent successfully.");
    } catch (err) {
      console.error("Failed to send programmatic FCM notification:", err);
    }
  };

  // 3. User Authentication Trigger
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthSubmitting(true);

    try {
      if (authMode === "register") {
        if (!authUsername.trim()) {
          throw new Error("Username is required");
        }
        const userCred = await createUserWithEmailAndPassword(auth, authEmail, authPassword);
        const user = userCred.user;
        await updateProfile(user, { displayName: authUsername });

        const isMainAdmin = authEmail.toLowerCase() === "jilalamasanja1998@gmail.com";
        const profile = {
          uid: user.uid,
          username: authUsername,
          email: authEmail,
          role: isMainAdmin ? "admin" : "user",
          createdAt: new Date().toISOString()
        };
        await setDoc(doc(db, "users", user.uid), profile);
        setUserProfile(profile);
      } else {
        const userCred = await signInWithEmailAndPassword(auth, authEmail, authPassword);
        const user = userCred.user;
        
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          setUserProfile(userDoc.data());
        } else {
          const isMainAdmin = authEmail.toLowerCase() === "jilalamasanja1998@gmail.com";
          const profile = {
            uid: user.uid,
            username: user.displayName || authEmail.split("@")[0] || "User",
            email: authEmail,
            role: isMainAdmin ? "admin" : "user",
            createdAt: new Date().toISOString()
          };
          await setDoc(doc(db, "users", user.uid), profile);
          setUserProfile(profile);
        }
      }
    } catch (err: any) {
      console.error("Auth error:", err);
      if (err.code === "auth/operation-not-allowed" || err.message?.includes("operation-not-allowed")) {
        setAuthError(
          "Email/Password sign-in is not enabled. To fix this:\n" +
          "1. Go to Firebase Console > Authentication > Sign-in method.\n" +
          "2. Click 'Add new provider' and select 'Email/Password'.\n" +
          "3. Enable the 'Email/Password' switch and save."
        );
      } else if (err.code === "auth/email-already-in-use") {
        setAuthError(
          "This email address is already in use in the connected Firebase project: 'gmail-smtp-394022'.\n\n" +
          "If you recently deleted it, please double-check that you deleted it in this specific project console, or try using a different email address."
        );
      } else if (err.code === "auth/invalid-credential" || err.code === "auth/user-not-found" || err.code === "auth/wrong-password") {
        setAuthError("Incorrect email or password.");
      } else if (err.code === "auth/weak-password") {
        setAuthError("Password should be at least 6 characters.");
      } else {
        setAuthError(err.message || "An error occurred. Please try again.");
      }
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setAuthError(null);
    setAuthSubmitting(true);
    try {
      const provider = new GoogleAuthProvider();
      const userCred = await signInWithPopup(auth, provider);
      const user = userCred.user;
      
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists()) {
        setUserProfile(userDoc.data());
      } else {
        const isMainAdmin = user.email?.toLowerCase() === "jilalamasanja1998@gmail.com";
        const profile = {
          uid: user.uid,
          username: user.displayName || user.email?.split("@")[0] || "User",
          email: user.email || "",
          role: isMainAdmin ? "admin" : "user",
          createdAt: new Date().toISOString()
        };
        await setDoc(doc(db, "users", user.uid), profile);
        setUserProfile(profile);
      }
    } catch (err: any) {
      console.error("Google Auth error:", err);
      if (err.code === "auth/unauthorized-domain" || err.message?.includes("unauthorized-domain")) {
        const currentDomain = window.location.hostname;
        setAuthError(
          `Google Sign-In is blocked because this domain is not authorized in Firebase.\n\n` +
          `To fix this:\n` +
          `1. Open Firebase Console > Authentication > Settings.\n` +
          `2. Under "Authorized domains", click "Add domain" and enter:\n` +
          `   ${currentDomain}\n\n` +
          `Or, simply Register & Login using an Email/Password above, which does not require domain authorization.`
        );
      } else {
        setAuthError(err.message || "Failed to sign in with Google. If the popup closed, please try again.");
      }
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      console.warn("Auth signOut warning:", e);
    }
    setCurrentUser(null);
    setUserProfile(null);
  };

  // 4. Seeding default matches (Write clean category shells with empty tickets lists to Firestore)
  const handleSeedDatabase = async () => {
    setIsSeeding(true);
    try {
      for (const cat of [...freeTips, ...vipTips]) {
        const emptyCat = {
          ...cat,
          tickets: []
        };
        await setDoc(doc(db, "categories", cat.id), emptyCat);
      }
      alert("Firestore successfully seeded with empty category shells! You can now add tickets and matches directly.");
    } catch (err: any) {
      alert("Failed to seed database: " + err.message);
    } finally {
      setIsSeeding(false);
    }
  };

  // 5. Delete and Duplicate Match from Firestore (without native blockages)
  const triggerDeleteMatch = (categoryId: string, ticketIndex: number, matchIndex: number) => {
    const category = [...freeCategories, ...vipCategories].find(c => c.id === categoryId);
    if (!category) return;
    const match = category.tickets[ticketIndex]?.matches[matchIndex];
    if (!match) return;

    setDeleteConfirm({
      type: "match",
      categoryId,
      ticketIndex,
      matchIndex,
      title: "Delete Match",
      message: `Are you sure you want to delete the match "${match.home} vs {match.away}"?`
    });
  };

  const triggerDeleteTicketGroup = (categoryId: string, ticketIndex: number) => {
    const category = [...freeCategories, ...vipCategories].find(c => c.id === categoryId);
    if (!category) return;
    const ticket = category.tickets[ticketIndex];
    if (!ticket) return;

    setDeleteConfirm({
      type: "group",
      categoryId,
      ticketIndex,
      title: "Delete Ticket Group",
      message: `Are you sure you want to delete the entire ticket group "${ticket.date}" and all its matches?`
    });
  };

  const executeDelete = async () => {
    if (!deleteConfirm) return;
    const { type, categoryId, ticketIndex, matchIndex } = deleteConfirm;

    const category = [...freeCategories, ...vipCategories].find(c => c.id === categoryId);
    if (!category) {
      setDeleteConfirm(null);
      return;
    }

    const updatedTickets = JSON.parse(JSON.stringify(category.tickets));

    if (type === "match" && matchIndex !== undefined) {
      updatedTickets[ticketIndex].matches.splice(matchIndex, 1);
      if (updatedTickets[ticketIndex].matches.length === 0) {
        updatedTickets.splice(ticketIndex, 1);
      } else {
        updatedTickets[ticketIndex].matches.forEach((m: any, idx: number) => {
          m.num = idx + 1;
        });
      }
    } else if (type === "group") {
      updatedTickets.splice(ticketIndex, 1);
    }

    try {
      await setDoc(doc(db, "categories", categoryId), {
        ...category,
        tickets: updatedTickets
      }, { merge: true });
    } catch (err: any) {
      console.error("Deletion failed:", err);
      setFirestoreError("Deletion failed: " + err.message);
    } finally {
      setDeleteConfirm(null);
    }
  };

  const duplicateMatch = async (categoryId: string, ticketIndex: number, matchIndex: number) => {
    const category = [...freeCategories, ...vipCategories].find(c => c.id === categoryId);
    if (!category) return;

    const ticket = category.tickets[ticketIndex];
    if (!ticket) return;

    const matchToCopy = ticket.matches[matchIndex];
    if (!matchToCopy) return;

    const updatedTickets = JSON.parse(JSON.stringify(category.tickets));
    const copiedMatch = {
      ...matchToCopy,
      num: updatedTickets[ticketIndex].matches.length + 1
    };
    updatedTickets[ticketIndex].matches.push(copiedMatch);

    try {
      await setDoc(doc(db, "categories", categoryId), {
        ...category,
        tickets: updatedTickets
      }, { merge: true });
    } catch (err: any) {
      console.error("Failed to duplicate match:", err);
      setFirestoreError("Failed to duplicate match: " + err.message);
    }
  };

  const deleteMatch = async (categoryId: string, ticketIndex: number, matchIndex: number) => {
    triggerDeleteMatch(categoryId, ticketIndex, matchIndex);
  };

  // Helpers for Date conversions
  const formatDateToGroup = (dateStr: string) => {
    if (!dateStr) return "";
    const parts = dateStr.split("-");
    if (parts.length !== 3) return dateStr;
    const year = parts[0];
    const monthIndex = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const months = [
      "JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE", 
      "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"
    ];
    return `${day} ${months[monthIndex]} ${year}`;
  };

  const parseGroupDateToInput = (displayDate: string) => {
    if (!displayDate) return "";
    const parts = displayDate.trim().split(/\s+/);
    if (parts.length !== 3) return "";
    const day = parts[0].padStart(2, "0");
    const monthStr = parts[1].toUpperCase();
    const year = parts[2];
    const months = [
      "JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE", 
      "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"
    ];
    const monthIndex = months.indexOf(monthStr);
    if (monthIndex === -1) return "";
    const month = String(monthIndex + 1).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  // 6. Edit Match Form Actions
  const startEditMatch = (categoryId: string, ticketIndex: number, matchIndex: number, match: Match) => {
    setEditingMatch({ categoryId, ticketIndex, matchIndex, match });
    setMatchHome(match.home);
    setMatchAway(match.away);
    setMatchScore(match.score);
    setMatchOdds(match.odds);
    setMatchStatus(match.status || "pending");
    setMatchTime(match.time || "");

    const category = [...freeCategories, ...vipCategories].find(c => c.id === categoryId);
    if (category && category.tickets[ticketIndex]) {
      setMatchDate(parseGroupDateToInput(category.tickets[ticketIndex].date));
    } else {
      setMatchDate("");
    }
  };

  const saveEditMatch = async () => {
    if (!editingMatch) return;
    const { categoryId, ticketIndex, matchIndex } = editingMatch;
    
    const category = [...freeCategories, ...vipCategories].find(c => c.id === categoryId);
    if (!category) return;

    const oldDateGroup = category.tickets[ticketIndex].date;
    const newDateGroup = formatDateToGroup(matchDate);

    const updatedTickets = JSON.parse(JSON.stringify(category.tickets));

    const updatedMatch: Match = {
      num: editingMatch.match.num,
      home: matchHome,
      away: matchAway,
      score: matchScore,
      odds: matchOdds,
      status: matchStatus,
      time: matchTime
    };

    if (oldDateGroup === newDateGroup) {
      // Inline update
      updatedTickets[ticketIndex].matches[matchIndex] = updatedMatch;
    } else {
      // Date has changed! Reschedule match to correct group
      // 1. Remove from old group
      updatedTickets[ticketIndex].matches.splice(matchIndex, 1);
      
      // Clean up old group if empty
      if (updatedTickets[ticketIndex].matches.length === 0) {
        updatedTickets.splice(ticketIndex, 1);
      } else {
        // Re-index matches in old group
        updatedTickets[ticketIndex].matches.forEach((m: any, idx: number) => {
          m.num = idx + 1;
        });
      }

      // 2. Add to new group
      let newTicket = updatedTickets.find((t: any) => t.date === newDateGroup);
      if (!newTicket) {
        newTicket = {
          date: newDateGroup,
          matches: []
        };
        updatedTickets.unshift(newTicket);
      }
      
      updatedMatch.num = newTicket.matches.length + 1;
      newTicket.matches.push(updatedMatch);
    }

    try {
      await setDoc(doc(db, "categories", categoryId), {
        ...category,
        tickets: updatedTickets
      }, { merge: true });
      setEditingMatch(null);
    } catch (err: any) {
      alert("Failed to save match: " + err.message);
    }
  };

  // 7. Unified Add Match Actions
  const startAddMatch = (categoryId: string, ticketIndex: number) => {
    setUploadCategory(categoryId);
    const category = [...freeCategories, ...vipCategories].find(c => c.id === categoryId);
    if (category && category.tickets[ticketIndex]) {
      setUploadDate(parseGroupDateToInput(category.tickets[ticketIndex].date));
    } else {
      setUploadDate(new Date().toISOString().split("T")[0]);
    }
    setUploadTime("");
    setUploadHome("");
    setUploadAway("");
    setUploadScore("");
    setUploadOdds("");
    setUploadStatus("pending");
    setShowUploadForm(true);
  };

  // Consolidated Match Upload with Date & Time Pickers and Auto-Grouping
  const handleUploadMatch = async (
    catId: string,
    rawDate: string,
    time: string,
    home: string,
    away: string,
    score: string,
    odds: string,
    status: "win" | "lose" | "pending"
  ) => {
    if (!catId || !rawDate || !home || !away || !score || !odds) {
      alert("Please fill in all required fields!");
      return;
    }

    const category = [...freeCategories, ...vipCategories].find(c => c.id === catId);
    if (!category) {
      alert("Selected category not found!");
      return;
    }

    const dateGroup = formatDateToGroup(rawDate);
    const updatedTickets = JSON.parse(JSON.stringify(category.tickets || []));
    
    // Find or create group
    let ticket = updatedTickets.find((t: any) => t.date === dateGroup);
    if (!ticket) {
      ticket = {
        date: dateGroup,
        matches: []
      };
      updatedTickets.unshift(ticket);
    }

    const nextNum = ticket.matches.length + 1;
    ticket.matches.push({
      num: nextNum,
      home,
      away,
      score,
      odds,
      status,
      time
    });

    try {
      await setDoc(doc(db, "categories", catId), {
        ...category,
        tickets: updatedTickets
      }, { merge: true });
      
      // Clear forms
      setUploadHome("");
      setUploadAway("");
      setUploadScore("");
      setUploadOdds("");
      setUploadStatus("pending");
      setUploadTime("");
      setShowUploadForm(false);
    } catch (err: any) {
      alert("Failed to upload match: " + err.message);
    }
  };

  const saveAddMatch = () => {};

  // 8. Add/Delete Ticket Groups
  const addTicketGroup = async (categoryId: string) => {
    if (!newTicketDate.trim()) {
      alert("Please enter a ticket date / group name!");
      return;
    }
    
    const category = [...freeCategories, ...vipCategories].find(c => c.id === categoryId);
    if (!category) return;

    const updatedTickets = JSON.parse(JSON.stringify(category.tickets));
    updatedTickets.unshift({
      date: newTicketDate.toUpperCase(),
      matches: []
    });

    try {
      await setDoc(doc(db, "categories", categoryId), {
        ...category,
        tickets: updatedTickets
      }, { merge: true });
      
      setNewTicketDate("");
      setShowAddTicket(false);
    } catch (err: any) {
      alert("Failed to add ticket group: " + err.message);
    }
  };

  const deleteTicketGroup = async (categoryId: string, ticketIndex: number) => {
    triggerDeleteTicketGroup(categoryId, ticketIndex);
  };

  const handleApproveProof = async (proof: any) => {
    try {
      const userRef = doc(db, "users", proof.userId);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const userData = userSnap.data();
        const currentSubs = userData.subscriptions || {};
        const updatedSubs = { ...currentSubs, [proof.categoryId]: true };
        await setDoc(userRef, { ...userData, subscriptions: updatedSubs }, { merge: true });
      }
      await setDoc(doc(db, "proofs", proof.id), { status: "approved" }, { merge: true });
      alert("Subscription approved successfully!");
    } catch (err: any) {
      console.error("Error approving subscription:", err);
      alert("Failed to approve subscription: " + err.message);
    }
  };

  const handleRejectProof = async (proofId: string) => {
    try {
      await setDoc(doc(db, "proofs", proofId), { status: "rejected" }, { merge: true });
      alert("Proof rejected successfully!");
    } catch (err: any) {
      console.error("Error rejecting proof:", err);
      alert("Failed to reject proof: " + err.message);
    }
  };

  const handleToggleUserSubscription = async (targetUser: any, categoryId: string) => {
    try {
      const userRef = doc(db, "users", targetUser.uid);
      const currentSubs = targetUser.subscriptions || {};
      const isSubscribed = currentSubs[categoryId] === true;
      const updatedSubs = { ...currentSubs, [categoryId]: !isSubscribed };
      await setDoc(userRef, { ...targetUser, subscriptions: updatedSubs }, { merge: true });
    } catch (err: any) {
      console.error("Error toggling user subscription:", err);
      alert("Failed to update user subscription: " + err.message);
    }
  };

  // Fetch live exchange rates
  useEffect(() => {
    fetch("https://open.er-api.com/v6/latest/USD")
      .then((res) => res.json())
      .then((data) => {
        if (data && data.rates) {
          setExchangeRates({
            UGX: data.rates.UGX || 3750,
            NGN: data.rates.NGN || 1500,
            XAF: data.rates.XAF || 605,
            XOF: data.rates.XOF || 605,
            TZS: data.rates.TZS || 2600,
            USD: 1
          });
        }
      })
      .catch((err) => console.log("Failed to fetch live exchange rates, using fallback: ", err));
  }, []);

  const triggerCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2000);
  };

  // Scroll ref for horizontal swiping
  const horizontalScrollRef = useRef<HTMLDivElement>(null);

  // Credentials & Config States
  const [credentialsStatus, setCredentialsStatus] = useState<CredentialsStatus | null>(null);
  const [credentialsJson, setCredentialsJson] = useState("");
  const [credError, setCredError] = useState<string | null>(null);
  const [isSavingCreds, setIsSavingCreds] = useState(false);

  // Form Fields
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [imageUrl, setImageUrl] = useState("");

  // Result output (the pre block content)
  const [fcmResult, setFcmResult] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  // UI state for key visibility
  const [showKeyText, setShowKeyText] = useState(false);

  // Fetch credentials status on mount
  useEffect(() => {
    fetchCredentialsStatus();
  }, []);

  // Web Crypto RSA-SHA256 JWT Generation Helper for pure client-side Google FCM v1
  const signJwtClientSide = async (privateKeyPem: string, clientEmail: string): Promise<string> => {
    const pemHeader = "-----BEGIN PRIVATE KEY-----";
    const pemFooter = "-----END PRIVATE KEY-----";
    const pemContents = privateKeyPem
      .replace(pemHeader, "")
      .replace(pemFooter, "")
      .replace(/\s+/g, "");

    const binaryDerString = window.atob(pemContents);
    const len = binaryDerString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryDerString.charCodeAt(i);
    }

    const privateKey = await window.crypto.subtle.importKey(
      "pkcs8",
      bytes.buffer,
      {
        name: "RSASSA-PKCS1-v1_5",
        hash: { name: "SHA-256" },
      },
      false,
      ["sign"]
    );

    const header = {
      alg: "RS256",
      typ: "JWT"
    };

    const now = Math.floor(Date.now() / 1000);
    const payload = {
      iss: clientEmail,
      scope: "https://www.googleapis.com/auth/firebase.messaging",
      aud: "https://oauth2.googleapis.com/token",
      exp: now + 3600,
      iat: now
    };

    const base64url = (arrayBuffer: ArrayBuffer): string => {
      const bytes = new Uint8Array(arrayBuffer);
      let binary = "";
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      return window.btoa(binary)
        .replace(/=/g, "")
        .replace(/\+/g, "-")
        .replace(/\//g, "_");
    };

    const base64urlStr = (str: string): string => {
      return base64url(new TextEncoder().encode(str));
    };

    const stringToSign = base64urlStr(JSON.stringify(header)) + "." + base64urlStr(JSON.stringify(payload));

    const signatureBuffer = await window.crypto.subtle.sign(
      "RSASSA-PKCS1-v1_5",
      privateKey,
      new TextEncoder().encode(stringToSign)
    );

    const signature = base64url(signatureBuffer);
    return stringToSign + "." + signature;
  };

  const fetchCredentialsStatus = async () => {
    try {
      const stored = localStorage.getItem("fcm_service_account");
      if (stored) {
        const parsed = JSON.parse(stored);
        setCredentialsStatus({
          configured: true,
          projectId: parsed.project_id || parsed.projectId,
          clientEmail: parsed.client_email || parsed.clientEmail
        });
      } else {
        setCredentialsStatus({ configured: false });
      }
    } catch (e) {
      console.error("Failed to check client credentials status:", e);
      setCredentialsStatus({ configured: false });
    }
  };

  // Save Service Account Credentials to Client Storage
  const handleSaveCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setCredError(null);
    setIsSavingCreds(true);
    try {
      let parsedJson: any;
      try {
        parsedJson = JSON.parse(credentialsJson);
      } catch (err) {
        setCredError("Invalid JSON structure. Please copy the full JSON file content from your Firebase service account key.");
        setIsSavingCreds(false);
        return;
      }

      const projectId = parsedJson.project_id || parsedJson.projectId;
      const privateKey = parsedJson.private_key || parsedJson.privateKey;
      const clientEmail = parsedJson.client_email || parsedJson.clientEmail;

      if (!projectId || !privateKey || !clientEmail) {
        setCredError("Service account is missing critical properties (project_id, private_key, or client_email)");
        setIsSavingCreds(false);
        return;
      }

      localStorage.setItem("fcm_service_account", JSON.stringify(parsedJson));
      setCredentialsJson("");
      await fetchCredentialsStatus();
      setFcmResult(null);
      setActiveTab("notification");
    } catch (err: any) {
      setCredError("Save credentials error: " + err.message);
    } finally {
      setIsSavingCreds(false);
    }
  };

  // Delete credentials from Client Storage
  const handleDeleteCredentials = async () => {
    if (!confirm("Are you sure you want to remove the Service Account key?")) {
      return;
    }
    try {
      localStorage.removeItem("fcm_service_account");
      await fetchCredentialsStatus();
      setFcmResult(null);
    } catch (e) {
      console.error("Failed to delete credentials:", e);
    }
  };

  // Send Notification Client-Side via Web Crypto + Google OAuth REST API
  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      return;
    }

    setIsSending(true);
    setFcmResult(null);

    try {
      const stored = localStorage.getItem("fcm_service_account");
      if (!stored) {
        throw new Error("No service account credentials configured.");
      }
      const sa = JSON.parse(stored);
      const projectId = sa.project_id || sa.projectId;
      const privateKey = (sa.private_key || sa.privateKey).replace(/\\n/g, "\n");
      const clientEmail = sa.client_email || sa.clientEmail;

      if (!projectId || !privateKey || !clientEmail) {
        throw new Error("Service account is missing critical properties (project_id, private_key, or client_email)");
      }

      // 1. Generate standard JWT and get Access Token
      const jwt = await signJwtClientSide(privateKey, clientEmail);
      const oauthRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: new URLSearchParams({
          grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
          assertion: jwt
        })
      });

      if (!oauthRes.ok) {
        const errorText = await oauthRes.text();
        throw new Error(`Google Auth Token request failed: ${errorText}`);
      }

      const tokenData = await oauthRes.json();
      const accessToken = tokenData.access_token;
      if (!accessToken) {
        throw new Error("No access_token returned from Google Auth.");
      }

      // 2. Prepare the FCM v1 message payload
      const dataObj: Record<string, string> = {
        title: title.trim(),
        body: message.trim(),
        image: imageUrl.trim(),
        source: "noyify-eedaf"
      };

      const fcmPayload = {
        message: {
          topic: "all",
          notification: {
            title: title.trim(),
            body: message.trim(),
            ...(imageUrl.trim() ? { image: imageUrl.trim() } : {})
          },
          data: dataObj,
          android: {
            priority: "high",
            notification: {
              channel_id: "default",
              sound: "default"
            }
          }
        }
      };

      // 3. Post directly to Google's REST API endpoint
      const fcmEndpoint = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;
      const fcmRes = await fetch(fcmEndpoint, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(fcmPayload)
      });

      const fcmResultData = await fcmRes.json();

      const formattedResult = {
        http_code: fcmRes.status,
        curl_error: "",
        fcm_response: fcmResultData
      };

      setFcmResult(JSON.stringify(formattedResult, null, 4));
    } catch (err: any) {
      const errorResult = {
        http_code: 500,
        curl_error: err.message || "Failed client-side notification transmission",
        fcm_response: null
      };
      setFcmResult(JSON.stringify(errorResult, null, 4));
    } finally {
      setIsSending(false);
    }
  };

  function getMatchStatus(ticketDate: string, matchIdx: number, ticketIdx: number): "win" | "lose" | "pending" {
    if (ticketDate.includes("25")) {
      return "pending";
    }
    // Stable, realistic outcome pattern for past dates:
    // Mostly wins, occasionally a realistic loss for authenticity
    if ((ticketIdx + matchIdx) % 7 === 5) {
      return "lose";
    }
    return "win";
  }

  function formatTip(score: string): string {
    const val = score.trim();
    const lower = val.toLowerCase();

    // 1. Double Chance mappings
    if (lower === "home win or draw" || lower === "1x" || lower === "home or draw") {
      return "Double Chance{1X}";
    }
    if (lower === "away win or draw" || lower === "x2" || lower === "away or draw" || lower === "draw or away win" || lower === "draw or away") {
      return "Double Chance{X2}";
    }
    if (lower === "home win or away win" || lower === "12" || lower === "home or away") {
      return "Double Chance{12}";
    }

    // 2. Home Win / Away Win
    if (lower === "home win" || lower === "home") {
      return "Home Win{1}";
    }
    if (lower === "away win" || lower === "away") {
      return "Away Win{2}";
    }
    if (lower === "draw" || lower === "draw x") {
      return "Draw{X}";
    }

    // 3. Correct Score
    if (lower.startsWith("correct score")) {
      return val.replace(/\s*\{\s*/, "{").replace(/\s*\}\s*/, "}");
    }

    // 4. HT/FT
    if (lower.startsWith("ht/ft")) {
      let formatted = val.replace(/\s*\{\s*/, "{").replace(/\s*\}\s*/, "}");
      formatted = formatted
        .replace(/Home\/Home/gi, "1/1")
        .replace(/Draw\/Home/gi, "X/1")
        .replace(/Away\/Away/gi, "2/2")
        .replace(/Home\/Draw/gi, "1/X")
        .replace(/Draw\/Draw/gi, "X/X")
        .replace(/Draw\/Away/gi, "X/2")
        .replace(/Away\/Home/gi, "2/1")
        .replace(/Home\/Away/gi, "1/2")
        .replace(/Away\/Draw/gi, "2/X");
      return formatted;
    }

    // 5. General bracket format cleaning
    if (val.includes("{") && val.includes("}")) {
      return val.replace(/\s*\{\s*/, "{").replace(/\s*\}\s*/, "}");
    }

    return val;
  }

  function renderMatchStatusBadge(status: "win" | "lose" | "pending") {
    if (status === "win") {
      return (
        <img 
          className="yes-badge w-6 h-6 object-contain select-none filter drop-shadow-[0_1px_3px_rgba(0,0,0,0.3)]" 
          src="https://i.ibb.co/PsqGzGxt/171383-removebg-preview.png" 
          alt="WIN"
          referrerPolicy="no-referrer"
        />
      );
    } else if (status === "lose") {
      return (
        <div className="w-5.5 h-5.5 rounded-full bg-rose-500/15 border border-rose-500/40 flex items-center justify-center text-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.35)] select-none shrink-0" title="LOSE">
          <X className="w-3 h-3 text-rose-400" strokeWidth={3.5} />
        </div>
      );
    } else {
      return (
        <div className="w-5.5 h-5.5 rounded-full bg-amber-500/15 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.35)] select-none shrink-0" title="PENDING">
          <Clock className="w-3 h-3 text-amber-400 animate-pulse" strokeWidth={2.5} />
        </div>
      );
    }
  }

  const menuGradient = {
    background: "linear-gradient(160deg, #a60606 0%, #870404 55%, #590101 100%)",
    boxShadow: "12px 0 40px -4px rgba(0,0,0,0.85)"
  };

  // Count matches in "TODAY MATCHES" ticket for today categories
  function getTodayMatchesCount(category: CategoryData) {
    let count = 0;
    if (category.tickets && Array.isArray(category.tickets)) {
      category.tickets.forEach((ticket, ticketIdx) => {
        if (ticket.matches && Array.isArray(ticket.matches)) {
          ticket.matches.forEach((match, mIdx) => {
            const status = match.status || getMatchStatus(ticket.date, mIdx, ticketIdx);
            if (status === "pending") {
              count++;
            }
          });
        }
      });
    }
    return count;
  }

  // Count matches inside results categories
  function getResultsMatchesCount(category: CategoryData) {
    let count = 0;
    if (category.tickets && Array.isArray(category.tickets)) {
      category.tickets.forEach(ticket => {
        if (ticket.matches && Array.isArray(ticket.matches)) {
          count += ticket.matches.length;
        }
      });
    }
    return count;
  }

  // Map category icons inside premium styled container wrappers
  function renderCategoryIcon(iconName: string, isActive: boolean, matchCount?: number, isResults: boolean = false) {
    const iconColor = isActive ? "text-[#E2FF00]" : "text-slate-300";
    const bgGlow = isActive ? "bg-[#E2FF00]/10 border border-[#E2FF00]/25 shadow-[0_0_8px_rgba(226,255,0,0.15)]" : "bg-white/5 border border-white/5";
    const iconWrapper = `p-2.5 rounded-xl ${bgGlow} transition-all duration-300 flex items-center justify-center shadow-inner relative`;
    
    let element;
    switch (iconName) {
      case "ThumbsUp":
        element = (
          <div className={iconWrapper}>
            <ThumbsUp className={`w-5.5 h-5.5 ${iconColor} transition-colors`} strokeWidth={1.8} />
          </div>
        );
        break;
      case "Calendar5":
        element = (
          <div className={iconWrapper}>
            <Calendar className={`w-5.5 h-5.5 ${iconColor} transition-colors`} strokeWidth={1.8} />
          </div>
        );
        break;
      case "Calendar10":
        element = (
          <div className={iconWrapper}>
            <Calendar className={`w-5.5 h-5.5 ${iconColor} transition-colors`} strokeWidth={1.8} />
          </div>
        );
        break;
      case "PlusMinus":
        element = (
          <div className={iconWrapper}>
            <span className={`text-xs font-black tracking-tight ${iconColor} font-mono transition-colors`}>
              +/-
            </span>
          </div>
        );
        break;
      case "Wallet":
        element = (
          <div className={iconWrapper}>
            <Layers className={`w-5.5 h-5.5 ${iconColor} transition-colors`} strokeWidth={1.8} />
          </div>
        );
        break;
      case "Tv":
        element = (
          <div className={iconWrapper}>
            <Tv className={`w-5.5 h-5.5 ${iconColor} transition-colors`} strokeWidth={1.8} />
          </div>
        );
        break;
      case "Crown":
        element = (
          <div className={isActive ? "p-2.5 rounded-xl bg-[#E2FF00]/15 border border-[#E2FF00]/30 shadow-[0_0_8px_rgba(226,255,0,0.2)] flex items-center justify-center relative" : "p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/15 flex items-center justify-center relative"}>
            <Crown className={`w-5.5 h-5.5 ${isActive ? "text-[#E2FF00]" : "text-amber-500/80"} transition-colors`} strokeWidth={1.8} />
          </div>
        );
        break;
      case "Target":
        element = (
          <div className={isActive ? "p-2.5 rounded-xl bg-[#E2FF00]/15 border border-[#E2FF00]/30 shadow-[0_0_8px_rgba(226,255,0,0.2)] flex items-center justify-center relative" : "p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/15 flex items-center justify-center relative"}>
            <Target className={`w-5.5 h-5.5 ${isActive ? "text-[#E2FF00]" : "text-rose-500/80"} transition-colors`} strokeWidth={1.8} />
          </div>
        );
        break;
      case "Trophy":
        element = (
          <div className={isActive ? "p-2.5 rounded-xl bg-[#E2FF00]/15 border border-[#E2FF00]/30 shadow-[0_0_8px_rgba(226,255,0,0.2)] flex items-center justify-center relative" : "p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/15 flex items-center justify-center relative"}>
            <Trophy className={`w-5.5 h-5.5 ${isActive ? "text-[#E2FF00]" : "text-emerald-500/80"} transition-colors`} strokeWidth={1.8} />
          </div>
        );
        break;
      case "Shuffle":
        element = (
          <div className={isActive ? "p-2.5 rounded-xl bg-[#E2FF00]/15 border border-[#E2FF00]/30 shadow-[0_0_8px_rgba(226,255,0,0.2)] flex items-center justify-center relative" : "p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/15 flex items-center justify-center relative"}>
            <Shuffle className={`w-5.5 h-5.5 ${isActive ? "text-[#E2FF00]" : "text-cyan-500/80"} transition-colors`} strokeWidth={1.8} />
          </div>
        );
        break;
      case "Zap":
        element = (
          <div className={iconWrapper}>
            <Zap className={`w-5.5 h-5.5 ${isActive ? "text-[#E2FF00]" : "text-[#E2FF00]/60"} transition-colors`} strokeWidth={1.8} />
          </div>
        );
        break;
      case "Timer":
        element = (
          <div className={isActive ? "p-2.5 rounded-xl bg-[#E2FF00]/15 border border-[#E2FF00]/30 shadow-[0_0_8px_rgba(226,255,0,0.2)] flex items-center justify-center relative" : "p-2.5 rounded-xl bg-orange-500/10 border border-orange-500/15 flex items-center justify-center relative"}>
            <Timer className={`w-5.5 h-5.5 ${isActive ? "text-[#E2FF00]" : "text-orange-500/80"} transition-colors`} strokeWidth={1.8} />
          </div>
        );
        break;
      default:
        element = (
          <div className={iconWrapper}>
            <Trophy className={`w-5.5 h-5.5 ${iconColor} transition-colors`} strokeWidth={1.8} />
          </div>
        );
    }
    
    if (matchCount !== undefined) {
      const badgeBg = isResults 
        ? "bg-emerald-500 text-white border-emerald-400 shadow-[0_1.5px_8px_rgba(16,185,129,0.6)]" 
        : "bg-[#E2FF00] text-black border-black/25 shadow-[0_1.5px_4px_rgba(0,0,0,0.5)]";
      return (
        <div className="relative">
          {element}
          <span className={`absolute -top-1.5 -right-1.5 text-[8.5px] font-black min-w-[17px] h-[17px] px-1 flex items-center justify-center rounded-full border z-10 select-none animate-fade-in font-mono ${badgeBg}`}>
            {matchCount}
          </span>
        </div>
      );
    }

    return element;
  }

  // Find active data to display tickets for
  const currentCategory: CategoryData | undefined = 
    toggleMode === "free"
      ? freeCategories.find(c => c.id === selectedFreeCat)
      : vipCategories.find(c => c.id === selectedVipCat);

  // Active chat partner computation for top header
  const activeChatPartner = React.useMemo(() => {
    if (activeTab !== "chats") return null;
    if (isMainAdmin) {
      if (!selectedChatUserId) return null;
      const profile = allUsers.find(u => u.uid === selectedChatUserId || u.id === selectedChatUserId);
      return {
        username: profile?.username || profile?.email?.split("@")[0] || "Client " + selectedChatUserId.substring(0, 5),
        email: profile?.email || "No Email Provided"
      };
    } else {
      return {
        username: "Negro Tips Support",
        email: "jilalamasanja1998@gmail.com"
      };
    }
  }, [activeTab, isMainAdmin, selectedChatUserId, allUsers]);

  // Background style
  const backgroundStyle = activeTab === "chats" ? {
    backgroundColor: "#efeae2",
    backgroundImage: `radial-gradient(rgba(0, 0, 0, 0.04) 1px, transparent 1px)`,
    backgroundSize: "20px 20px"
  } : activeTab === "correct_score" ? {
    backgroundImage: `linear-gradient(rgba(48, 2, 2, 0.88), rgba(48, 2, 2, 0.97)), url("https://i.ibb.co/NdsrmZx0/2d4e211d-777e-4801-bd34-cdb12a906b44.jpg")`,
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundAttachment: "fixed"
  } : {
    backgroundColor: "#300202"
  };

  if (authLoading) {
    return null;
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-[#f5f5f5] flex justify-center items-stretch w-full overflow-x-hidden">
        <div className="phone-container">
          {/* Blue Top Banner */}
          <div className="header-bg select-none">
            <h1>Negro</h1>
            <p>Betting Tips</p>
          </div>

          {/* Floating Card View */}
          <div className="login-card">
            <h2 className="card-title uppercase">
              {authMode === "login" ? "LOGIN" : "REGISTER"}
            </h2>

            <form onSubmit={handleAuth} className="w-full">
              {/* Username Field - Only on Register */}
              {authMode === "register" && (
                <div className="input-group">
                  <label htmlFor="username">Username</label>
                  <input
                    type="text"
                    id="username"
                    required
                    placeholder="Enter your username"
                    autoComplete="off"
                    value={authUsername}
                    onChange={(e) => setAuthUsername(e.target.value)}
                  />
                </div>
              )}

              {/* Email Field */}
              <div className="input-group">
                <label htmlFor="email">Email</label>
                <input
                  type="email"
                  id="email"
                  required
                  placeholder="example@email.com"
                  autoComplete="off"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                />
              </div>

              {/* Password Field */}
              <div className="input-group">
                <label htmlFor="password">Password</label>
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  required
                  placeholder="••••••••"
                  autoComplete="off"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                />
                <span
                  className="password-icon select-none"
                  id="togglePassword"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? "🙈" : "👁️"}
                </span>
              </div>

              {/* Error Alert Display */}
              {authError && (
                <div className="text-[11px] text-red-600 bg-red-50 border border-red-200 p-2.5 rounded-lg text-center mb-4 leading-relaxed max-h-[120px] overflow-y-auto whitespace-pre-line font-sans">
                  {authError}
                </div>
              )}

              {/* Main Interactive Login/Register Button */}
              <button
                type="submit"
                disabled={authSubmitting}
                className="login-btn flex items-center justify-center gap-2 active:scale-[0.98] transition-transform disabled:opacity-75"
              >
                {authSubmitting ? (
                  <RefreshCw className="w-4 h-4 animate-spin text-white" />
                ) : authMode === "login" ? (
                  "LOGIN"
                ) : (
                  "REGISTER"
                )}
              </button>

              {/* Bottom Registration/Login Toggle Flow */}
              <p className="signup-text text-center">
                {authMode === "login" ? (
                  <>
                    Don't have an account?{" "}
                    <a
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        setAuthMode("register");
                        setAuthError(null);
                      }}
                    >
                      Sign Up
                    </a>
                  </>
                ) : (
                  <>
                    Already have an account?{" "}
                    <a
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        setAuthMode("login");
                        setAuthError(null);
                      }}
                    >
                      Log In
                    </a>
                  </>
                )}
              </p>
            </form>
          </div>
        </div>
      </div>
    );
  }

  const isSubscribedToActiveCategory = isMainAdmin || (userProfile?.subscriptions?.[activeCategory?.id] === true);

  return (
    <div 
      style={backgroundStyle}
      className={`min-h-screen ${activeTab === 'chats' ? 'bg-[#efeae2] text-[#111b21] pb-0' : 'bg-[#300202] text-slate-100 pb-12'} font-sans flex flex-col items-center justify-start selection:bg-yellow-500 selection:text-black pt-14 relative overflow-x-hidden transition-all duration-500`}
    >
      
      {/* Background ambient radial glow if not in correct score */}
      {activeTab !== "correct_score" && (
        <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
          <div className="absolute top-[10%] left-[-10%] w-[50%] h-[40%] rounded-full bg-emerald-500/5 blur-[120px]" />
          <div className="absolute top-[40%] right-[-10%] w-[45%] h-[45%] rounded-full bg-amber-500/4 blur-[100px]" />
          <div className="absolute bottom-[10%] left-[20%] w-[50%] h-[35%] rounded-full bg-emerald-600/5 blur-[130px]" />
        </div>
      )}

      {/* Dynamic style tag for correct score ticketing aesthetics */}
      <style>{`
        @keyframes resultsPulse {
          0% {
            box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4);
            transform: scale(1);
          }
          50% {
            box-shadow: 0 0 12px 4px rgba(16, 185, 129, 0.7);
            transform: scale(1.08);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(16, 185, 129, 0);
            transform: scale(1);
          }
        }
        @keyframes textShimmer {
          0% {
            opacity: 0.8;
          }
          50% {
            opacity: 1;
            text-shadow: 0 0 6px rgba(52, 211, 153, 0.9);
          }
          100% {
            opacity: 0.8;
          }
        }
        .animate-results-badge {
          animation: resultsPulse 2s infinite ease-in-out;
        }
        .animate-results-text {
          animation: textShimmer 1.5s infinite ease-in-out;
        }

        /* Hide Scrollbar globally to remove any right-edge scroll tracks */
        ::-webkit-scrollbar {
          display: none !important;
          width: 0 !important;
          height: 0 !important;
        }
        html, body, #root, * {
          -ms-overflow-style: none !important;
          scrollbar-width: none !important;
        }

        /* VIP Specific Tickets Styles */
        .vip-ticket-wrap {
          width: 100%;
          max-width: 340px;  
          filter:
            drop-shadow(0px 2px 0px rgba(0,0,0,0.5))
            drop-shadow(0px 16px 40px rgba(0,0,0,0.7));
          transform: rotate(-0.4deg);
          margin-bottom: 8px; /* REDUCED HEIGHT GAP FROM ONE DATE GROUP TO ANOTHER */
          transition: transform 0.2s ease, filter 0.2s ease;
        }
        .vip-ticket-wrap:hover {
          transform: translateY(-2px) rotate(-0.4deg);
          filter:
            drop-shadow(0px 4px 2px rgba(0,0,0,0.5))
            drop-shadow(0px 18px 44px rgba(0,0,0,0.85));
        }

        /* ── TEARS ── */
        .vip-tear { display: block; width: 100%; height: 13px; }
        .vip-tear-top {
          background: #870404;
          clip-path: polygon(
            0% 100%, 1.5% 25%, 3% 85%, 5% 10%, 7% 70%, 9% 5%, 11% 55%,
            13% 88%, 15% 28%, 17% 80%, 19% 12%, 21% 62%, 23% 38%,
            25% 78%, 27% 8%,  29% 68%, 31% 48%, 33% 88%, 35% 18%,
            37% 72%, 39% 3%,  41% 52%, 43% 82%, 45% 22%, 47% 58%,
            49% 8%,  51% 68%, 53% 32%, 55% 78%, 57% 13%, 59% 62%,
            61% 42%, 63% 88%, 65% 18%, 67% 72%, 69% 3%,  71% 52%,
            73% 78%, 75% 28%, 77% 68%, 79% 8%,  81% 58%, 83% 38%,
            85% 82%, 87% 22%, 89% 62%, 91% 12%, 93% 72%, 95% 32%,
            97% 78%, 99% 18%, 100% 22%, 100% 100%
          );
        }
        .vip-tear-bottom {
          background: #870404;
          clip-path: polygon(
            0% 0%, 1.5% 75%, 3% 15%, 5% 90%, 7% 30%, 9% 95%, 11% 45%,
            13% 12%, 15% 72%, 17% 20%, 19% 88%, 21% 38%, 23% 62%,
            25% 22%, 27% 92%, 29% 32%, 31% 52%, 33% 12%, 35% 82%,
            37% 28%, 39% 97%, 41% 48%, 43% 18%, 45% 78%, 47% 42%,
            49% 92%, 51% 32%, 53% 68%, 55% 22%, 57% 87%, 59% 38%,
            61% 58%, 63% 12%, 65% 82%, 67% 28%, 69% 97%, 71% 48%,
            73% 22%, 75% 72%, 77% 32%, 79% 92%, 81% 42%, 83% 62%,
            85% 18%, 87% 78%, 89% 38%, 91% 88%, 93% 28%, 95% 68%,
            97% 22%, 99% 82%, 100% 78%, 100% 0%
          );
        }

        .vip-ticket {
          background: #870404;
          position: relative;
        }

        /* ── DATE HERO ── */
        .vip-date-hero {
          padding: 4px 4px 6px; /* REDUCED HEIGHT GAP */
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1px;
          position: relative;
          overflow: hidden;
        }

        .vip-date-big {
          font-family: 'Barlow Condensed', sans-serif;
          font-size: 18px;
          font-weight: 900;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #ffffff;
          line-height: 1;
          position: relative;
          z-index: 1;
        }

        /* ── PERFORATION ── */
        .vip-perf {
          display: flex;
          align-items: center;
          position: relative;
          height: 20px;
          overflow: visible;
          background: #870404;
        }
        .vip-perf.green { background: #00b478; }

        .vip-perf::before,
        .vip-perf::after {
          content: '';
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          width: 18px;
          height: 18px;
          background: #300202;
          border-radius: 50%;
          z-index: 2;
        }
        .vip-perf::before { left: -9px; }
        .vip-perf::after  { right: -9px; }

        .vip-perf-line {
          flex: 1;
          border: none;
          border-top: 1.5px dashed rgba(255,255,255,0.15);
          margin: 0 16px;
        }
        .vip-perf.green .vip-perf-line {
          border-top-color: rgba(255,255,255,0.4);
        }

        /* ── MATCHES ── */
        .vip-matches { padding: 2px 0; }

        .vip-match-row {
          display: flex;
          align-items: center;
          padding: 4px 14px; /* REDUCED HEIGHT GAP FROM ONE MATCH CARD TO ANOTHER */
          gap: 10px;
          position: relative;
          transition: background 0.2s;
        }
        .vip-match-row:nth-child(odd) {
          background: rgba(255,255,255,0.03);
        }

        /* left accent bar */
        .vip-match-row::before {
          content: '';
          position: absolute;
          left: 0;
          top: 15%;
          bottom: 15%;
          width: 3px;
          background: #00b478;
          border-radius: 0 2px 2px 0;
          opacity: 0.6;
        }

        .vip-num {
          width: 22px;
          height: 22px;
          background: rgba(0,180,120,0.15);
          border: 1.5px solid #00b478;
          border-radius: 50%;
          font-family: 'Share Tech Mono', monospace;
          font-size: 10px;
          color: #00e699;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .vip-match-info {
          flex: 1;
          min-width: 0;
        }

        .vip-match-name {
          font-family: 'Barlow Condensed', sans-serif;
          font-size: 14px;
          font-weight: 800;
          color: #ffffff;
          letter-spacing: 0.02em;
          line-height: 1.1;
          text-transform: uppercase;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .vip-pick {
          font-family: 'Share Tech ono';
          font-size: 15px;
          font-weight: 900;
          color: #00b478;
          min-width: 14px;
          text-align: left;
        }

        .vip-yes-badge {
          width: 40px;
          height: 20px;
          object-fit: contain;
        }

        .vip-odds {  
          font-size: 14px;
          font-weight: 700;
          color: lime; 
          width: 30px;
          height: 30px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-bottom: 1px solid lime;
          border-radius: 50%;
          box-shadow: 0 1px 4px rgba(245,168,0,0.35);
          font-family: 'Share Tech Mono', monospace;
        }

        .vip-row-sep {
          border: none;
          border-top: 1px solid green;
          margin: 0 14px;
        }

        .ticket-wrap {
          width: 100%;
          max-width: 350px;  
          filter:
            drop-shadow(0px 3px 1px rgba(0,0,0,0.45))
            drop-shadow(0px 10px 20px rgba(0,0,0,0.6));
          margin-bottom: 10px; /* REDUCED GAP FROM ONE DATE GROUP TO ANOTHER */
          transition: transform 0.2s ease, filter 0.2s ease;
        }
        .ticket-wrap:hover {
          transform: translateY(-2px);
          filter:
            drop-shadow(0px 4px 2px rgba(0,0,0,0.5))
            drop-shadow(0px 12px 24px rgba(0,0,0,0.7));
        }

        .tear { display: block; width: 100%; height: 10px; }
        .tear-top {
          background: #870404;
          clip-path: polygon(
            0% 100%, 1.5% 25%, 3% 85%, 5% 10%, 7% 70%, 9% 5%, 11% 55%,
            13% 88%, 15% 28%, 17% 80%, 19% 12%, 21% 62%, 23% 38%,
            25% 78%, 27% 8%,  29% 68%, 31% 48%, 33% 88%, 35% 18%,
            37% 72%, 39% 3%,  41% 52%, 43% 82%, 45% 22%, 47% 58%,
            49% 8%,  51% 68%, 53% 32%, 55% 78%, 57% 13%, 59% 62%,
            61% 42%, 63% 88%, 65% 18%, 67% 72%, 69% 3%,  71% 52%,
            73% 78%, 75% 28%, 77% 68%, 79% 8%,  81% 58%, 83% 38%,
            85% 82%, 87% 22%, 89% 62%, 91% 12%, 93% 72%, 95% 32%,
            97% 78%, 99% 18%, 100% 22%, 100% 100%
          );
        }
        .tear-bottom {
          background: #870404;
          clip-path: polygon(
            0% 0%, 1.5% 75%, 3% 15%, 5% 90%, 7% 30%, 9% 95%, 11% 45%,
            13% 12%, 15% 72%, 17% 20%, 19% 88%, 21% 38%, 23% 62%,
            25% 22%, 27% 92%, 29% 32%, 31% 52%, 33% 12%, 35% 82%,
            37% 28%, 39% 97%, 41% 48%, 43% 18%, 45% 78%, 47% 42%,
            49% 92%, 51% 32%, 53% 68%, 55% 22%, 57% 87%, 59% 38%,
            61% 58%, 63% 12%, 65% 82%, 67% 28%, 69% 97%, 71% 48%,
            73% 22%, 75% 72%, 77% 32%, 79% 92%, 81% 42%, 83% 62%,
            85% 18%, 87% 78%, 89% 38%, 91% 88%, 93% 28%, 95% 68%,
            97% 22%, 99% 82%, 100% 78%, 100% 0%
          );
        }

        .ticket {
          background: #870404;
          position: relative;
        }

        .date-hero {
          padding: 4px 2px 6px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1px;
          position: relative;
          overflow: hidden;
        }

        .date-hero::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(120deg, rgba(255,255,255,0.05) 0%, transparent 60%);
        }

        .date-big {
          font-family: 'Barlow Condensed', sans-serif;
          font-size: 16px;
          font-weight: 800;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #E2FF00;
          line-height: 1.1;
          position: relative;
          z-index: 1;
          text-shadow: 0 1px 2px rgba(0,0,0,0.5);
        }

        .perf {
          display: flex;
          align-items: center;
          position: relative;
          height: 20px;
          overflow: visible;
          background: #E2FF00;
        }

        .perf::before,
        .perf::after {
          content: '';
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          width: 18px;
          height: 18px;
          background: #870404;
          border-radius: 50%;
          z-index: 2;
        }
        .perf::before { left: -9px; }
        .perf::after  { right: -9px; }

        .perf-line {
          flex: 1;
          border: none;
          border-top: 1.5px dashed rgba(0,0,0,0.35);
          margin: 0 16px;
        }

        .matches { padding: 1px 0 3px; }

        /* REDUCED GAP FROM ONE MATCH CARD TO ANOTHER */
        .match-row {
          display: flex;
          align-items: center;
          padding: 4px 12px; /* REDUCED PADDING LIKE VIP */
          gap: 10px;
          position: relative;
          transition: background 0.15s;
        }
        .match-row:hover {
          background: rgba(255, 255, 255, 0.03);
        }

        .match-row::before {
          content: '';
          position: absolute;
          left: 0;
          top: 15%;
          bottom: 15%;
          width: 2.5px;
          background: #E2FF00;
          border-radius: 0 1px 1px 0;
          opacity: 0.8;
        }

        .num {
          width: 20px;
          height: 20px;
          background: rgba(226, 255, 0, 0.1);
          border: 1px solid rgba(226, 255, 0, 0.45);
          border-radius: 50%;
          font-family: 'Share Tech Mono', monospace;
          font-size: 10px;
          color: #E2FF00;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .match-info {
          flex: 1;
          min-width: 0;
        }

        .match-name {
          font-family: 'Barlow Condensed', sans-serif;
          font-size: 14px;
          font-weight: 700;
          color: #ffffff;
          letter-spacing: 0.01em;
          line-height: 1.1;
          text-transform: uppercase;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .pick {
          font-family: 'Share Tech ono';
          font-size: 15px;
          font-weight: 900;
          color: #00b478;
          min-width: 14px;
          text-align: left;
        }

        .result-group {
          display: flex;
          align-items: center;
          gap: 6px;
          flex-shrink: 0;
        }

        .yes-badge {
          width: 24px;
          height: 24px;
          object-fit: contain;
        }

        .odds {  
          font-family: 'Share Tech Mono', monospace;
          font-size: 11px;
          font-weight: 700;
          color: #E2FF00; 
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(226, 255, 0, 0.3);
          border-radius: 50%;
          background: rgba(226, 255, 0, 0.05);
        }

        .row-sep {
          border: none;
          border-top: 1px solid rgba(255, 255, 255, 0.05);
          margin: 0 12px;
        }

        /* Hide Scrollbar helper */
        .scrollbar-none::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-none {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
      
      {/* Premium FIXED Top Header */}
      <header className="fixed top-0 left-0 right-0 h-[54px] z-40 bg-gradient-to-r from-[#870404] via-[#a60606] to-[#870404]/98 backdrop-blur-xl text-white px-4 flex items-center justify-between shadow-[0_4px_30px_rgba(0,0,0,0.5)] border-b border-white/10 select-none">
        {/* Glow Line underneath */}
        <div className="absolute bottom-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#E2FF00]/45 to-transparent opacity-80" />

        <div className="flex items-center gap-3">
          {activeTab === "chats" && isMainAdmin && selectedChatUserId ? (
            <button
              id="chat-back-btn"
              onClick={() => setSelectedChatUserId(null)}
              className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/5 active:scale-95 transition-all duration-300 cursor-pointer"
              title="Back to client list"
            >
              <ArrowLeft className="w-5.5 h-5.5" />
            </button>
          ) : (
            <button
              id="hamburger-btn"
              onClick={() => setIsDrawerOpen(true)}
              className="p-1.5 rounded-lg text-slate-300 hover:text-[#E2FF00] hover:bg-white/5 active:scale-95 transition-all duration-300 cursor-pointer"
              aria-label="Open navigation menu"
            >
              <Menu className="w-5.5 h-5.5" />
            </button>
          )}
          
          {activeTab === "chats" ? (
            activeChatPartner ? (
              <div className="flex flex-col items-start leading-tight">
                <span className="text-xs font-black uppercase text-white tracking-wider flex items-center gap-1.5">
                  {activeChatPartner.username} 
                  <span className="w-1.5 h-1.5 rounded-full bg-[#E2FF00] inline-block shadow-[0_0_8px_#E2FF00] animate-pulse" />
                </span>
                {isMainAdmin && (
                  <span className="text-[10px] text-slate-300 font-mono font-medium truncate max-w-[150px] sm:max-w-[220px]">
                    {activeChatPartner.email}
                  </span>
                )}
              </div>
            ) : (
              <span className="text-sm font-black tracking-[0.2em] font-sans uppercase text-white flex items-center gap-1.5">
                Client Chats <span className="w-1.5 h-1.5 rounded-full bg-[#E2FF00] inline-block shadow-[0_0_8px_#E2FF00] animate-pulse" />
              </span>
            )
          ) : (
            <span className="text-sm font-black tracking-[0.2em] font-sans uppercase text-white flex items-center gap-1.5">
              {isMainAdmin ? "Negro Admin" : "Negro Tips"} <span className="w-1.5 h-1.5 rounded-full bg-[#E2FF00] inline-block shadow-[0_0_8px_#E2FF00] animate-pulse" />
            </span>
          )}
        </div>

        <div className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border ${
          activeTab === "chats"
            ? "bg-[#25D366]/20 border-[#25D366]/40 text-[#25D366] shadow-[0_0_10px_rgba(37,211,102,0.25)] font-black"
            : toggleMode === "free" 
              ? "bg-slate-500/10 border-slate-500/20 text-slate-400" 
              : "bg-yellow-500/10 border-[#E2FF00]/30 text-[#E2FF00] shadow-[0_0_10px_rgba(226,255,0,0.15)]"
        }`}>
          <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${
            activeTab === "chats" ? "bg-[#25D366]" : toggleMode === "free" ? "bg-slate-400" : "bg-[#E2FF00]"
          }`} />
          <span className="text-[9px] font-mono font-bold uppercase tracking-wider">
            {activeTab === "chats" ? "SUPPORT CHAT" : toggleMode === "free" ? "FREE ACCESS" : (() => {
              if (activeCategory) {
                if (activeCategory.id.includes("cs")) return "CORRECT SCORE VIP";
                if (activeCategory.id.includes("htft")) return "HT/FT VIP";
                if (activeCategory.id.includes("elite")) return "ELITE VIP";
                return activeCategory.title.toUpperCase();
              }
              return "VIP ACCESS";
            })()}
          </span>
        </div>
      </header>

      {/* Slide-out Navigation Drawer */}
      <AnimatePresence>
        {isDrawerOpen && (
          <>
            {/* Backdrop Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.7 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDrawerOpen(false)}
              className="fixed inset-0 bg-black/95 z-45 backdrop-blur-sm"
            />

            {/* Slide-in Menu Panel - Compact Width as requested */}
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 240 }}
              style={menuGradient}
              className="fixed top-0 bottom-0 left-0 w-[210px] text-white z-50 shadow-2xl flex flex-col justify-between border-r border-white/10"
            >
              <div className="flex flex-col flex-1">
                {/* Menu Header with identical height/styling */}
                <div className="h-[54px] px-4 flex items-center justify-between border-b border-white/10 bg-gradient-to-r from-[#870404] via-[#a60606] to-[#870404]/98 relative select-none">
                  <span className="text-sm font-black tracking-[0.12em] uppercase bg-gradient-to-r from-white to-[#E2FF00] bg-clip-text text-transparent">Negro Tips</span>
                  <button
                    onClick={() => setIsDrawerOpen(false)}
                    className="p-1.5 rounded-lg hover:bg-red-500/10 text-slate-300 hover:text-red-400 transition-all duration-300 cursor-pointer"
                    aria-label="Close menu"
                  >
                    <X className="w-4.5 h-4.5" />
                  </button>
                  {/* Glow Line underneath */}
                  <div className="absolute bottom-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#E2FF00]/45 to-transparent opacity-80" />
                </div>

                <div className="p-4 flex-1">
                  <nav className="space-y-1.5">
                    <button
                      onClick={() => {
                        setActiveTab("correct_score");
                        setOpenedCategoryId(null);
                        setIsDrawerOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-xs font-bold border-l-4 cursor-pointer ${
                        activeTab === "correct_score"
                          ? "bg-gradient-to-r from-[#E2FF00] to-[#cbfa00] text-black shadow-[0_0_15px_rgba(226,255,0,0.3)] translate-x-1 font-extrabold border-white/60"
                          : "text-slate-300 hover:text-white hover:bg-white/5 hover:translate-x-1 border-transparent hover:border-[#E2FF00]/50"
                      }`}
                    >
                      <Trophy className="w-4 h-4 shrink-0 text-inherit" />
                      All Matches
                    </button>

                    <button
                      onClick={() => {
                        setActiveTab("proofs");
                        setIsDrawerOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-xs font-bold border-l-4 cursor-pointer ${
                        activeTab === "proofs"
                          ? "bg-gradient-to-r from-[#E2FF00] to-[#cbfa00] text-black shadow-[0_0_15px_rgba(226,255,0,0.3)] translate-x-1 font-extrabold border-white/60"
                          : "text-slate-300 hover:text-white hover:bg-white/5 hover:translate-x-1 border-transparent hover:border-[#E2FF00]/50"
                      }`}
                    >
                      {isMainAdmin ? (
                        <>
                          <UserCheck className="w-4 h-4 shrink-0 text-inherit" />
                          VIP Management
                        </>
                      ) : (
                        <>
                          <Camera className="w-4 h-4 shrink-0 text-inherit" />
                          Submit Proof
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => {
                        setActiveTab("chats");
                        setIsDrawerOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-all text-xs font-bold border-l-4 cursor-pointer ${
                        activeTab === "chats"
                          ? "bg-gradient-to-r from-[#E2FF00] to-[#cbfa00] text-black shadow-[0_0_15px_rgba(226,255,0,0.3)] translate-x-1 font-extrabold border-white/60"
                          : "text-slate-300 hover:text-white hover:bg-white/5 hover:translate-x-1 border-transparent hover:border-[#E2FF00]/50"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <MessageSquare className="w-4 h-4 shrink-0 text-inherit" />
                        <span>{isMainAdmin ? "Client Chats" : "WhatsApp Chat"}</span>
                      </div>
                      {(() => {
                        const count = isMainAdmin 
                          ? adminAllMessages.filter(m => m.senderId !== "admin" && !m.readByAdmin).length
                          : userMessages.filter(m => m.senderId === "admin" && !m.readByUser).length;
                        return count > 0 ? (
                          <span className="bg-red-500 text-white text-[9px] px-1.5 py-0.5 rounded-full font-black animate-bounce">
                            {count}
                          </span>
                        ) : (
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        );
                      })()}
                    </button>

                    {isMainAdmin && (
                      <>
                        <button
                          onClick={() => {
                            setActiveTab("notification");
                            setIsDrawerOpen(false);
                          }}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-xs font-bold border-l-4 cursor-pointer ${
                            activeTab === "notification"
                              ? "bg-gradient-to-r from-[#E2FF00] to-[#cbfa00] text-black shadow-[0_0_15px_rgba(226,255,0,0.3)] translate-x-1 font-extrabold border-white/60"
                              : "text-slate-300 hover:text-white hover:bg-white/5 hover:translate-x-1 border-transparent hover:border-[#E2FF00]/50"
                          }`}
                        >
                          <Bell className="w-4 h-4 shrink-0" />
                          Notification Form
                        </button>

                        <button
                          onClick={() => {
                            setActiveTab("setting");
                            setIsDrawerOpen(false);
                          }}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-xs font-bold border-l-4 cursor-pointer ${
                            activeTab === "setting"
                              ? "bg-gradient-to-r from-[#E2FF00] to-[#cbfa00] text-black shadow-[0_0_15px_rgba(226,255,0,0.3)] translate-x-1 font-extrabold border-white/60"
                              : "text-slate-300 hover:text-white hover:bg-white/5 hover:translate-x-1 border-transparent hover:border-[#E2FF00]/50"
                          }`}
                        >
                          <Settings className="w-4 h-4 shrink-0" />
                          Service Settings
                        </button>
                      </>
                    )}
                  </nav>
                </div>
              </div>

              {/* Drawer footer info */}
              <div className="p-4 border-t border-white/5 bg-black/20 flex flex-col gap-3">
                <div className="flex items-center gap-2.5 bg-slate-950/40 p-2.5 rounded-xl border border-white/5">
                  <div className="w-8 h-8 shrink-0 rounded-full bg-gradient-to-r from-[#E2FF00] to-emerald-500 flex items-center justify-center text-black font-black text-xs uppercase shadow-[0_0_10px_rgba(226,255,0,0.2)]">
                    {userProfile?.username?.[0] || "U"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-black text-white truncate font-sans uppercase tracking-wider">{userProfile?.username || "User"}</p>
                    <p className="text-[9px] font-mono text-slate-400 truncate">{currentUser?.email}</p>
                  </div>
                  <button
                    onClick={handleLogout}
                    title="Log Out"
                    className="p-1.5 shrink-0 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 active:scale-95 transition-all cursor-pointer flex items-center justify-center"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <main className={`w-full ${activeTab === 'chats' ? 'max-w-none w-full px-0' : 'max-w-[480px] px-4'} flex flex-col items-center z-10`}>

        {activeTab === "correct_score" ? (
          /* CORRECT SCORE / HOME VIEW */
          <div className="w-full flex flex-col items-center">
            
            {/* BRAND LOGO HEADER: Replica of Prime Betting Tips but "NEGRO" */}
            <div className="flex flex-col items-start w-full max-w-[350px] mt-4 mb-5 select-none">
              <div className="flex items-center gap-1.5">
                {/* Yellow triangle pointing right */}
                <div className="w-0 h-0 border-t-[14px] border-t-transparent border-b-[14px] border-b-transparent border-l-[20px] border-l-[#E2FF00] transform skew-x-[-10deg] filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]" />
                <span className="text-4xl font-black italic tracking-tight text-white uppercase font-sans leading-none drop-shadow-md">
                  Negro
                </span>
              </div>
              <span className="text-[17px] font-black italic tracking-[0.25em] text-white uppercase font-sans mt-0.5 leading-none pl-1.5 drop-shadow-sm">
                Betting Tips
              </span>
            </div>

            {/* SLIDING PILL TOGGLE (Free vs VIP) */}
            <div className="w-full max-w-[350px] bg-black/50 p-1.5 rounded-full border border-white/5 flex items-center justify-between mb-6 relative">
              <button
                onClick={() => setToggleMode("free")}
                className={`flex-1 py-3 text-sm font-black uppercase tracking-widest rounded-full transition-all duration-300 relative z-10 cursor-pointer ${
                  toggleMode === "free" ? "text-black" : "text-slate-400 hover:text-white"
                }`}
              >
                Free
              </button>
              <button
                onClick={() => setToggleMode("vip")}
                className={`flex-1 py-3 text-sm font-black uppercase tracking-widest rounded-full transition-all duration-300 relative z-10 cursor-pointer ${
                  toggleMode === "vip" ? "text-black" : "text-slate-400 hover:text-white"
                }`}
              >
                VIP
              </button>

              {/* Glowing animated background pill */}
              <motion.div
                layout
                transition={{ type: "spring", stiffness: 350, damping: 28 }}
                className="absolute top-1.5 bottom-1.5 w-[48%] rounded-full bg-[#E2FF00] shadow-[0_0_15px_rgba(226,255,0,0.35)]"
                style={{
                  left: toggleMode === "free" ? "1.5%" : "50.5%"
                }}
              />
            </div>

            {/* STABLE HIGH-PERFORMANCE HORIZONTAL MOTION VIEWS CONTROLLER */}
            <div className="w-full max-w-[350px] overflow-hidden relative min-h-[380px] flex flex-col justify-start">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={toggleMode}
                  variants={{
                    hidden: { opacity: 0, y: 15 },
                    show: {
                      opacity: 1,
                      y: 0,
                      transition: {
                        staggerChildren: 0.05
                      }
                    }
                  }}
                  initial="hidden"
                  animate="show"
                  exit="hidden"
                  className="w-full flex flex-col gap-6"
                >
                  {/* TODAY & ONWARD SECTION */}
                  <div className="flex flex-col gap-2.5">
                    <div className="flex items-center gap-1.5 px-1 select-none">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#E2FF00] animate-pulse"></span>
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-200">
                        Available Matches
                      </span>
                      <span className="text-[7px] font-black uppercase tracking-widest text-[#E2FF00] bg-[#E2FF00]/10 border border-[#E2FF00]/25 px-1.5 py-0.5 rounded ml-auto shadow-[0_1px_2px_rgba(0,0,0,0.3)]">
                        Active Fixtures
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      {(toggleMode === "free" ? freeCategories : vipCategories)
                        .filter((cat) => cat.id.includes("today"))
                        .map((cat) => {
                          const isActive = openedCategoryId === cat.id;
                          return (
                            <motion.button
                              key={cat.id}
                              variants={{
                                hidden: { opacity: 0, scale: 0.88, y: 12 },
                                show: { opacity: 1, scale: 1, y: 0 }
                              }}
                              transition={{ type: "spring", stiffness: 350, damping: 25 }}
                              onClick={() => {
                                if (toggleMode === "free") {
                                  setSelectedFreeCat(cat.id);
                                } else {
                                  setSelectedVipCat(cat.id);
                                }
                                setOpenedCategoryId(cat.id);
                              }}
                              className={`aspect-square rounded-2xl p-2.5 border flex flex-col items-center justify-center text-center gap-2.5 transition-all duration-300 transform active:scale-95 cursor-pointer relative overflow-hidden group select-none ${
                                isActive 
                                  ? "border-[#E2FF00] bg-[#540202] shadow-[0_0_20px_rgba(226,255,0,0.35)] scale-[1.03]" 
                                  : "border-white/15 bg-[#540202] hover:bg-[#870404] hover:border-white/30"
                              }`}
                            >
                              <span className="absolute top-1 right-1 text-[6px] font-black uppercase tracking-widest text-[#E2FF00]/90 bg-[#E2FF00]/10 border border-[#E2FF00]/20 px-1 py-0.2 rounded-sm">
                                Available
                              </span>

                              {isActive && (
                                <div className="absolute inset-0 bg-gradient-to-tr from-[#E2FF00]/5 to-transparent pointer-events-none" />
                              )}
                              
                              {renderCategoryIcon(cat.iconName, isActive, getTodayMatchesCount(cat))}
                              
                              <span className={`text-[10px] font-bold leading-tight uppercase tracking-wide transition-colors duration-300 font-sans ${
                                isActive ? "text-[#E2FF00]" : "text-slate-300 group-hover:text-white"
                              }`}>
                                {cat.title.replace(" Today", "")}
                              </span>
                            </motion.button>
                          );
                        })}
                    </div>
                  </div>

                  {/* YESTERDAY & BEFORE RESULTS SECTION */}
                  <div className="flex flex-col gap-2.5">
                    <div className="flex items-center gap-1.5 px-1 select-none">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                        Match Results
                      </span>
                      <span className="text-[7px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 px-1.5 py-0.5 rounded ml-auto shadow-[0_1px_2px_rgba(0,0,0,0.3)]">
                        Finished
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      {(toggleMode === "free" ? freeCategories : vipCategories)
                        .filter((cat) => cat.id.includes("results"))
                        .map((cat) => {
                          const isActive = openedCategoryId === cat.id;
                          return (
                            <motion.button
                              key={cat.id}
                              variants={{
                                hidden: { opacity: 0, scale: 0.88, y: 12 },
                                show: { opacity: 1, scale: 1, y: 0 }
                              }}
                              transition={{ type: "spring", stiffness: 350, damping: 25 }}
                              onClick={() => {
                                if (toggleMode === "free") {
                                  setSelectedFreeCat(cat.id);
                                } else {
                                  setSelectedVipCat(cat.id);
                                }
                                setOpenedCategoryId(cat.id);
                              }}
                              className={`aspect-square rounded-2xl p-2.5 border flex flex-col items-center justify-center text-center gap-2.5 transition-all duration-300 transform active:scale-95 cursor-pointer relative overflow-hidden group select-none ${
                                isActive 
                                  ? "border-emerald-500 bg-[#540202] shadow-[0_0_20px_rgba(16,185,129,0.35)] scale-[1.03]" 
                                  : "border-white/15 bg-[#540202] hover:bg-[#870404] hover:border-white/30"
                              }`}
                            >
                              <span className="absolute top-1.5 right-1.5 text-[6px] font-black uppercase tracking-widest text-white bg-gradient-to-r from-emerald-500 to-teal-500 px-1.5 py-0.5 rounded-full border border-emerald-400/30 shadow-[0_2px_8px_rgba(16,185,129,0.5)] animate-results-badge z-10">
                                <span className="animate-results-text">RESULTS</span>
                              </span>

                              {isActive && (
                                <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/5 to-transparent pointer-events-none" />
                              )}
                              
                              {renderCategoryIcon(cat.iconName, isActive)}
                              
                              <span className={`text-[10px] font-bold leading-tight uppercase tracking-wide transition-colors duration-300 font-sans ${
                                isActive ? "text-emerald-400" : "text-slate-400 group-hover:text-white"
                              }`}>
                                {cat.title.replace(" Results", "")}
                              </span>
                            </motion.button>
                          );
                        })}
                    </div>
                  </div>

                </motion.div>
              </AnimatePresence>
            </div>

            {/* TIP CATEGORY TICKETS LIST - Now removed from under the home menus */}

          </div>
        ) : activeTab === "setting" ? (
          /* SETTINGS VIEW */
          <div className="w-full bg-[#121921]/95 border border-white/5 rounded-2xl p-5 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2 border-b border-white/5 pb-3">
              <Key className="w-5 h-5 text-[#E2FF00]" />
              Firebase Account Key
            </h3>

            {credentialsStatus?.configured ? (
              <div className="space-y-4">
                <div className="bg-[#070b0f] border border-white/5 p-4 rounded-xl text-xs space-y-2.5">
                  <div className="flex justify-between items-center pb-2 border-b border-white/5">
                    <span className="text-slate-400 font-mono">Status:</span>
                    <span className="text-emerald-400 font-bold flex items-center gap-1 bg-emerald-950/20 px-2.5 py-1 rounded-full border border-emerald-500/20">
                      <CheckCircle className="w-3.5 h-3.5" /> Configured
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-mono">Project ID:</span>
                    <span className="font-semibold font-mono text-slate-200">{credentialsStatus.projectId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-mono">Client Email:</span>
                    <span className="font-mono text-slate-300 truncate max-w-[180px]" title={credentialsStatus.clientEmail}>
                      {credentialsStatus.clientEmail}
                    </span>
                  </div>
                </div>

                <div className="border-t border-white/5 pt-4 flex flex-col gap-3">
                  <p className="text-xs text-slate-400 leading-relaxed">
                    To overwrite the current key, paste a new Google service account JSON credential block below.
                  </p>

                  <form onSubmit={handleSaveCredentials} className="space-y-3.5">
                    <div className="relative">
                      <textarea
                        value={credentialsJson}
                        onChange={(e) => setCredentialsJson(e.target.value)}
                        placeholder='{"type": "service_account", "project_id": "...", ...}'
                        rows={6}
                        className="w-full bg-[#070b0f] border border-white/10 rounded-xl p-3.5 font-mono text-xs text-slate-200 focus:outline-none focus:border-[#E2FF00] focus:ring-1 focus:ring-[#E2FF00] transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowKeyText(!showKeyText)}
                        className="absolute bottom-3 right-3 p-1.5 text-slate-500 hover:text-slate-300 transition-colors"
                      >
                        {showKeyText ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                      </button>
                    </div>

                    {credError && (
                      <p className="text-xs text-rose-400 bg-rose-950/10 border border-rose-900/30 p-3 rounded-xl flex items-center gap-2">
                        <XCircle className="w-4.5 h-4.5 shrink-0 text-rose-500" />
                        {credError}
                      </p>
                    )}

                    <div className="flex justify-between items-center gap-3 pt-2">
                      <button
                        type="button"
                        onClick={handleDeleteCredentials}
                        className="bg-rose-950/20 hover:bg-rose-900/30 text-rose-400 px-4 py-2 rounded-xl text-xs font-bold border border-rose-900/20 transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                        Remove Key
                      </button>

                      <button
                        type="submit"
                        disabled={isSavingCreds || !credentialsJson.trim()}
                        className="bg-[#E2FF00] hover:bg-[#c2db00] disabled:bg-slate-800 disabled:text-slate-500 text-black font-extrabold text-xs px-5 py-2.5 rounded-xl transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
                      >
                        {isSavingCreds ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
                        Update Credentials
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSaveCredentials} className="space-y-4">
                <p className="text-xs text-slate-400 leading-relaxed">
                  Paste the content of your Firebase service account JSON key file (<code className="bg-[#070b0f] text-[#E2FF00] px-1.5 py-0.5 rounded font-mono text-[11px] border border-white/5">service-account.json</code>) to activate sending.
                </p>
                
                <div className="relative">
                  <textarea
                    value={credentialsJson}
                    onChange={(e) => setCredentialsJson(e.target.value)}
                    placeholder='{"type": "service_account", "project_id": "...", ...}'
                    rows={6}
                    className="w-full bg-[#070b0f] border border-white/10 rounded-xl p-3.5 font-mono text-xs text-slate-200 focus:outline-none focus:border-[#E2FF00] focus:ring-1 focus:ring-[#E2FF00] transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKeyText(!showKeyText)}
                    className="absolute bottom-3 right-3 p-1.5 text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    {showKeyText ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                  </button>
                </div>

                {credError && (
                  <p className="text-xs text-rose-400 bg-rose-950/10 border border-rose-900/30 p-3 rounded-xl flex items-center gap-2">
                    <XCircle className="w-4.5 h-4.5 shrink-0 text-rose-500" />
                    {credError}
                  </p>
                )}

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    disabled={isSavingCreds || !credentialsJson.trim()}
                    className="bg-[#E2FF00] hover:bg-[#c2db00] disabled:bg-slate-800 disabled:text-slate-500 text-black font-extrabold text-xs px-5 py-2.5 rounded-xl transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
                  >
                    {isSavingCreds ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
                    Save Credentials
                  </button>
                </div>
              </form>
            )}

            {/* Seed Database Option */}
            <div className="bg-[#070b0f] border border-[#E2FF00]/10 p-4 rounded-xl text-xs space-y-3 mt-4">
              <h4 className="text-xs font-bold text-[#E2FF00] flex items-center gap-1.5 uppercase tracking-wider">
                <SparklesIcon className="w-4 h-4" />
                Seed Matches Collection
              </h4>
              <p className="text-slate-400 leading-relaxed text-[11px]">
                If your Firestore database is brand new, seed the initial set of betting tips and categories directly. This writes free and VIP category schemas to your <code>categories</code> collection.
              </p>
              <button
                type="button"
                onClick={handleSeedDatabase}
                disabled={isSeeding}
                className="w-full bg-[#E2FF00] hover:scale-[1.01] active:scale-95 text-black py-2 rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                {isSeeding ? "Seeding Database..." : "Seed Initial Matches to Firestore"}
              </button>
            </div>
          </div>
        ) : activeTab === "notification" ? (
          /* NOTIFICATION FORM VIEW */
          <div className="w-full space-y-4">
            
            <div className="w-full bg-[#121921]/60 border border-white/5 rounded-xl p-3.5 text-xs text-slate-300 flex items-start gap-2.5">
              <Info className="w-4.5 h-4.5 text-[#E2FF00] shrink-0 mt-0.5 animate-pulse" />
              <p className="leading-relaxed">
                <strong className="text-[#E2FF00]">FCM Broadcaster:</strong> Deliver real-time notifications to all users subscribed to the <code className="bg-[#070b0f] px-1 py-0.5 rounded text-[#E2FF00]">all</code> topic instantly.
              </p>
            </div>

            <form onSubmit={handleSendNotification} className="bg-[#121921]/95 p-6 rounded-2xl border border-white/5 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <span className="text-xs font-mono font-black uppercase tracking-wider text-slate-400">Broadcast notification</span>
                <span className="text-[10px] text-[#E2FF00] bg-[#E2FF00]/10 font-mono px-2.5 py-1 rounded-full border border-[#E2FF00]/20 font-bold uppercase tracking-wider">
                  Topic: all
                </span>
              </div>

              {/* Title Input */}
              <div>
                <input
                  name="title"
                  required
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Notification Title"
                  className="w-full bg-[#070b0f] border border-white/10 hover:border-white/20 focus:border-[#E2FF00] rounded-xl p-3.5 text-base md:text-[14px] focus:outline-none focus:ring-1 focus:ring-[#E2FF00] transition-all font-medium text-slate-100 placeholder:text-slate-500"
                />
              </div>

              {/* Body Message Input */}
              <div>
                <textarea
                  name="body"
                  required
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Message text..."
                  rows={4}
                  className="w-full bg-[#070b0f] border border-white/10 hover:border-white/20 focus:border-[#E2FF00] rounded-xl p-3.5 text-base md:text-[14px] focus:outline-none focus:ring-1 focus:ring-[#E2FF00] transition-all resize-none min-h-[100px] text-slate-100 placeholder:text-slate-500"
                />
              </div>

              {/* Image URL Input */}
              <div>
                <input
                  name="image"
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="Image URL (optional)"
                  className="w-full bg-[#070b0f] border border-white/10 hover:border-white/20 focus:border-[#E2FF00] rounded-xl p-3.5 text-base md:text-[14px] focus:outline-none focus:ring-1 focus:ring-[#E2FF00] transition-all text-slate-100 placeholder:text-slate-500"
                />
              </div>

              {/* Send Button */}
              <button
                type="submit"
                disabled={isSending || !credentialsStatus?.configured}
                className="w-full bg-[#E2FF00] hover:bg-[#c2db00] disabled:bg-slate-800 disabled:text-slate-600 text-black font-extrabold text-sm py-3.5 rounded-xl shadow-lg transition-all active:scale-98 flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
              >
                {isSending ? (
                  <RefreshCw className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
                {isSending ? "Sending Notification..." : "Send Notification"}
              </button>

              {!credentialsStatus?.configured && (
                <div className="text-[11px] text-slate-300 bg-amber-950/10 border border-amber-900/20 p-3 rounded-xl flex items-start gap-2.5 font-medium mt-1">
                  <Sparkles className="w-4 h-4 shrink-0 text-amber-400 animate-bounce" />
                  <div>
                    Please configure your Firebase credentials first. Switch to the <strong className="text-amber-400">Settings</strong> page to add your key file.
                  </div>
                </div>
              )}
            </form>

            {/* Response panel */}
            {fcmResult && (
              <div className="space-y-1.5">
                <div className="flex justify-between items-center px-1">
                  <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">HTTP API Response Output</span>
                  <button
                    onClick={() => setFcmResult(null)}
                    className="text-[10px] text-slate-400 hover:text-slate-300 font-mono transition cursor-pointer"
                  >
                    [Clear Output]
                  </button>
                </div>
                <pre className="w-full bg-black text-[#00ff9d] p-4 rounded-xl text-xs font-mono overflow-x-auto shadow-inner border border-white/5 leading-relaxed max-h-[300px]">
                  {fcmResult}
                </pre>
              </div>
            )}
          </div>
        ) : activeTab === "proofs" ? (
          /* DUAL VIP PROOFS & SUBSCRIPTIONS PAGE */
          !isMainAdmin ? (
            /* USER VIEW: SUBMIT PROOF & TRANSACTION HISTORY */
            <div className="w-full space-y-6">
              {/* Header */}
              <div className="border-b border-white/5 pb-4">
                <h3 className="text-lg font-black text-slate-100 flex items-center gap-2">
                  <Camera className="w-5 h-5 text-[#E2FF00]" />
                  Submit Payment Proof
                </h3>
                <p className="text-xs text-slate-400 mt-1">Upload a screenshot of your successful transaction receipt or mobile money transfer confirmation slip to activate your VIP access.</p>
              </div>

              {/* Centered Upload Form */}
              <div className="max-w-xl mx-auto">
                {(() => {
                  const pendingProof = userProofs.find(p => p.categoryId === selectedProofCategory && p.status === "pending");
                  const rejectedProof = userProofs.find(p => p.categoryId === selectedProofCategory && p.status === "rejected");

                  if (pendingProof) {
                    return (
                      <div className="bg-slate-950/80 border border-[#E2FF00]/30 rounded-2xl p-6 flex flex-col items-center text-center gap-4 select-none">
                        <div className="w-14 h-14 rounded-full bg-[#E2FF00]/10 flex items-center justify-center border border-[#E2FF00]/20">
                          <Clock className="w-7 h-7 text-[#E2FF00] animate-pulse" />
                        </div>
                        <div>
                          <span className="text-xs font-black uppercase tracking-wider text-[#E2FF00] block mb-1">Receipt Under Review</span>
                          <span className="text-[10px] font-mono text-slate-500 font-bold uppercase tracking-wider">
                            Category: {selectedProofCategory.replace("vip_", "").replace("_today", "").replace("_", " ").toUpperCase()} VIP
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-300 font-medium leading-relaxed font-sans max-w-[320px]">
                          Your receipt has been submitted successfully and is currently pending verification. Admins review submissions in under 15 minutes.
                        </p>
                        <div className="w-full bg-black/40 border border-white/5 p-3 rounded-xl flex items-center justify-between text-xs font-mono">
                          <span className="text-slate-500">Submitted:</span>
                          <span className="text-slate-300 font-bold">
                            {pendingProof.createdAt ? new Date(pendingProof.createdAt).toLocaleString([], { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' }) : "Recently"}
                          </span>
                        </div>
                        <button
                          onClick={() => {
                            setSelectedProofCategory(selectedProofCategory === "vip_cs_today" ? "vip_htft_today" : "vip_cs_today");
                          }}
                          className="text-xs text-[#E2FF00] hover:underline cursor-pointer font-bold uppercase tracking-wider mt-2"
                        >
                          Check other package status
                        </button>
                      </div>
                    );
                  }

                  return (
                    <div className="bg-slate-950/80 border border-white/5 rounded-2xl p-5 flex flex-col gap-5 select-none">
                      <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                        <Camera className="w-4.5 h-4.5 text-[#E2FF00]" />
                        <span className="text-xs font-black uppercase tracking-wider text-[#E2FF00]">Upload Screenshot / Slip</span>
                      </div>

                      {/* Dropdown to select VIP package */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 font-sans">
                          Select VIP Package Paid For
                        </label>
                        <select
                          value={selectedProofCategory}
                          onChange={(e) => {
                            setSelectedProofCategory(e.target.value);
                            setProofSubmitError(null);
                            setProofSubmitSuccess(null);
                          }}
                          className="w-full bg-black/50 border border-white/10 hover:border-white/20 focus:border-[#E2FF00] rounded-xl p-3.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#E2FF00] transition-all font-medium text-slate-100 cursor-pointer"
                        >
                          <option value="vip_cs_today">Correct Score VIP ($1000/week)</option>
                          <option value="vip_htft_today">HT/FT VIP ($500/week)</option>
                        </select>
                      </div>

                      {rejectedProof && (
                        <div className="text-[10px] text-rose-400 bg-rose-950/20 border border-rose-900/30 p-3 rounded-xl font-medium text-center leading-relaxed">
                          <span className="font-bold block uppercase tracking-wider text-xs mb-1">❌ Previous Submission Rejected</span>
                          Your previous receipt upload was rejected by the administrator. Please make sure your new screenshot clearly displays the successful transaction confirmation.
                        </div>
                      )}

                      {proofSubmitError && (
                        <div className="text-[10px] text-rose-400 bg-rose-950/20 border border-rose-900/30 p-2.5 rounded-xl font-medium text-center">
                          {proofSubmitError}
                        </div>
                      )}

                      {proofSubmitSuccess && (
                        <div className="text-[10px] text-emerald-400 bg-emerald-950/20 border border-emerald-900/30 p-2.5 rounded-xl font-medium text-center">
                          {proofSubmitSuccess}
                        </div>
                      )}

                      {/* Drag-and-drop or select file box */}
                      {!proofImage ? (
                        <label className="flex flex-col items-center justify-center border-2 border-dashed border-white/10 hover:border-[#E2FF00]/40 rounded-xl p-8 bg-black/40 cursor-pointer transition-all duration-300">
                          <div className="p-3.5 bg-white/5 rounded-full mb-3 text-slate-400">
                            <Image className="w-6 h-6" />
                          </div>
                          <span className="text-[11px] font-bold text-slate-200">Tap to select or drop screenshot</span>
                          <span className="text-[9px] text-slate-500 font-mono mt-1">Supports PNG, JPG, JPEG (Max 2MB)</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                if (file.size > 2 * 1024 * 1024) {
                                  setProofSubmitError("Image size must be smaller than 2MB.");
                                  return;
                                }
                                setProofSubmitError(null);
                                const reader = new FileReader();
                                reader.onload = () => {
                                  setProofImage(reader.result as string);
                                };
                                reader.onerror = () => {
                                  setProofSubmitError("Failed to read image file.");
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                          />
                        </label>
                      ) : (
                        <div className="relative border border-white/10 rounded-xl overflow-hidden bg-black/40 p-2 flex flex-col gap-2">
                          <img
                            src={proofImage}
                            alt="Payment Proof Preview"
                            className="w-full max-h-[180px] object-contain rounded-lg"
                            referrerPolicy="no-referrer"
                          />
                          <button
                            onClick={() => setProofImage(null)}
                            className="absolute top-2 right-2 p-1.5 bg-black/80 rounded-full text-slate-300 hover:text-white hover:bg-black border border-white/10 transition-all cursor-pointer"
                          >
                            <X className="w-4 h-4" />
                          </button>
                          <span className="text-[9px] text-slate-500 text-center font-mono font-bold">Preview Selected Screenshot</span>
                        </div>
                      )}

                      {proofImage && (
                        <button
                          onClick={async () => {
                            if (!currentUser) return;
                            setUploadingProof(true);
                            setProofSubmitError(null);
                            setProofSubmitSuccess(null);
                            try {
                              const proofId = "proof_" + Math.random().toString(36).substring(2, 15);
                              const priceStr = selectedProofCategory === "vip_cs_today" ? "$1000 USD" : "$500 USD";
                              await setDoc(doc(db, "proofs", proofId), {
                                id: proofId,
                                userId: currentUser.uid,
                                username: userProfile?.username || currentUser.displayName || currentUser.email?.split("@")[0] || "User",
                                email: currentUser.email || "",
                                categoryId: selectedProofCategory,
                                screenshot: proofImage,
                                status: "pending",
                                createdAt: new Date().toISOString(),
                                amount: priceStr
                              });
                              setProofSubmitSuccess("Payment proof uploaded successfully!");
                              setProofImage(null);
                            } catch (err: any) {
                              console.error("Error saving proof:", err);
                              setProofSubmitError("Failed to submit: " + err.message);
                            } finally {
                              setUploadingProof(false);
                            }
                          }}
                          disabled={uploadingProof}
                          className="w-full bg-[#E2FF00] hover:bg-[#c2db00] disabled:bg-slate-800 disabled:text-slate-500 text-black font-extrabold text-xs py-3.5 rounded-xl shadow-lg transition-all active:scale-98 flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          {uploadingProof ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                          {uploadingProof ? "Submitting Proof..." : "Submit Proof as Payment Receipt"}
                        </button>
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* USER TRANSACTION HISTORY LIST */}
              <div className="bg-[#121921]/40 border border-white/5 rounded-2xl p-5 select-none">
                <div className="flex items-center gap-2 border-b border-white/5 pb-3.5 mb-4">
                  <Clock className="w-4.5 h-4.5 text-[#E2FF00]" />
                  <span className="text-xs font-black uppercase tracking-wider text-slate-100">My Uploaded Receipts & Statuses</span>
                </div>

                {userProofs.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 text-xs font-mono">
                    You have not uploaded any payment proofs yet.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {userProofs.map((proof) => {
                      return (
                        <div key={proof.id} className="bg-black/30 border border-white/5 rounded-xl p-3.5 flex flex-col gap-3 relative overflow-hidden">
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] font-mono font-bold text-slate-500 uppercase">
                              {proof.createdAt ? new Date(proof.createdAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : "Recently"}
                            </span>
                            <span
                              className={`text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                                proof.status === "approved"
                                  ? "bg-emerald-950/20 text-emerald-400 border-emerald-500/20"
                                  : proof.status === "rejected"
                                  ? "bg-rose-950/20 text-rose-400 border-rose-500/20"
                                  : "bg-amber-950/20 text-[#E2FF00] border-[#E2FF00]/20 animate-pulse"
                              }`}
                            >
                              {proof.status === "approved" ? "Approved ✓" : proof.status === "rejected" ? "Rejected ✗" : "Pending ⏳"}
                            </span>
                          </div>

                          <div className="space-y-1.5 text-xs font-sans">
                            <div className="flex justify-between">
                              <span className="text-slate-500 text-[11px]">VIP Package:</span>
                              <span className="font-bold text-slate-200 uppercase">
                                {proof.categoryId.replace("vip_", "").replace("_today", "").replace("_", " ")} VIP
                              </span>
                            </div>
                            {proof.amount && (
                              <div className="flex justify-between">
                                <span className="text-slate-500 text-[11px]">Amount Listed:</span>
                                <span className="text-emerald-400 font-extrabold">{proof.amount}</span>
                              </div>
                            )}
                          </div>

                          {proof.screenshot && (
                            <div className="relative group border border-white/5 rounded-lg overflow-hidden bg-black/40 aspect-video flex items-center justify-center h-24">
                              <img
                                src={proof.screenshot}
                                alt="Your Uploaded Screenshot"
                                className="w-full h-full object-cover"
                                referrerPolicy="no-referrer"
                              />
                              <div 
                                onClick={() => setViewingScreenshot(proof.screenshot)}
                                className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                              >
                                <Eye className="w-3.5 h-3.5 text-[#E2FF00]" />
                                <span className="text-[10px] font-bold text-white uppercase tracking-wider">Expand</span>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Lightbox / Screenshot Modal viewer for past user proofs */}
              <AnimatePresence>
                {viewingScreenshot && (
                  <div className="fixed inset-0 bg-black/95 z-55 flex flex-col items-center justify-center p-4">
                    <motion.div
                      initial={{ scale: 0.95, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.95, opacity: 0 }}
                      className="relative max-w-full max-h-full flex flex-col gap-4"
                    >
                      <button
                        onClick={() => setViewingScreenshot(null)}
                        className="absolute -top-12 right-0 p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all cursor-pointer flex items-center justify-center"
                      >
                        <X className="w-6 h-6" />
                      </button>
                      
                      <img
                        src={viewingScreenshot}
                        alt="Full Payment Receipt"
                        className="max-w-[90vw] max-h-[80vh] object-contain rounded-2xl shadow-2xl border border-white/10"
                        referrerPolicy="no-referrer"
                      />
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            /* ADMIN VIEW: VIP MANAGEMENT DASHBOARD */
            <div className="w-full space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-4">
                <div>
                  <h3 className="text-lg font-black text-slate-100 flex items-center gap-2">
                    <UserCheck className="w-5 h-5 text-[#E2FF00]" />
                    VIP Management Dashboard
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">Review user payment screenshots and manually manage subscriber access tiers.</p>
                </div>
                
                <div className="flex bg-black/40 p-1 rounded-xl border border-white/5 self-start">
                  <button
                    onClick={() => setAdminSubTab("pending")}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      adminSubTab === "pending"
                        ? "bg-[#E2FF00] text-black shadow-[0_2px_8px_rgba(226,255,0,0.15)]"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Pending Proofs ({allProofs.filter(p => p.status === "pending").length})
                  </button>
                  <button
                    onClick={() => setAdminSubTab("users")}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      adminSubTab === "users"
                        ? "bg-[#E2FF00] text-black shadow-[0_2px_8px_rgba(226,255,0,0.15)]"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Manage Users ({allUsers.length})
                  </button>
                </div>
              </div>

              {adminSubTab === "pending" ? (
                /* PENDING PROOFS SUBTAB */
                <div className="space-y-4">
                  {allProofs.length === 0 ? (
                    <div className="bg-[#121921]/40 border border-white/5 rounded-2xl p-12 text-center text-slate-400">
                      <Clock className="w-8 h-8 text-slate-600 mx-auto mb-3 animate-pulse" />
                      <p className="font-bold text-xs uppercase tracking-wider text-slate-300">No Payment Proofs Submitted</p>
                      <p className="text-[10px] text-slate-500 mt-1 font-mono">User screenshot uploads will appear here in real-time.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {allProofs.map((proof) => {
                        const isPending = proof.status === "pending";
                        return (
                          <div
                            key={proof.id}
                            className={`bg-[#121921]/90 border rounded-2xl p-4 flex flex-col gap-3.5 transition-all relative overflow-hidden ${
                              isPending 
                                ? "border-[#E2FF00]/20 shadow-[0_0_15px_rgba(226,255,0,0.03)]" 
                                : "border-white/5"
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-mono text-slate-500 font-bold uppercase tracking-wider">
                                {new Date(proof.createdAt).toLocaleString()}
                              </span>
                              <span
                                className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                                  proof.status === "approved"
                                    ? "bg-emerald-950/20 text-emerald-400 border-emerald-500/20"
                                    : proof.status === "rejected"
                                    ? "bg-rose-950/20 text-rose-400 border-rose-500/20"
                                    : "bg-amber-950/20 text-[#E2FF00] border-[#E2FF00]/20 animate-pulse"
                                }`}
                              >
                                {proof.status}
                              </span>
                            </div>

                            <div className="bg-black/30 p-3 rounded-xl border border-white/5 space-y-1.5 text-xs">
                              <div className="flex justify-between">
                                <span className="text-slate-500 font-mono">Username:</span>
                                <span className="font-bold text-slate-200">{proof.username}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-500 font-mono">Email:</span>
                                <span className="text-slate-300 font-mono select-all">{proof.email}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-500 font-mono">Category:</span>
                                <span className="text-[#E2FF00] font-black uppercase font-sans tracking-wide">
                                  {proof.categoryId.replace("vip_", "").replace("_today", "").replace("_", " ")} VIP
                                </span>
                              </div>
                              {proof.amount && (
                                <div className="flex justify-between border-t border-white/5 pt-1.5 mt-1.5">
                                  <span className="text-slate-500 font-mono">Paid Amount:</span>
                                  <span className="text-emerald-400 font-extrabold">{proof.amount}</span>
                                </div>
                              )}
                            </div>

                            {proof.screenshot && (
                              <div className="relative group border border-white/10 rounded-xl overflow-hidden bg-black/50 aspect-video flex items-center justify-center">
                                <img
                                  src={proof.screenshot}
                                  alt="Payment Receipt Screenshot"
                                  className="w-full h-full object-cover"
                                  referrerPolicy="no-referrer"
                                />
                                <div 
                                  onClick={() => setViewingScreenshot(proof.screenshot)}
                                  className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                                >
                                  <Eye className="w-4 h-4 text-[#E2FF00]" />
                                  <span className="text-xs font-black text-white uppercase tracking-wider">View Full Size</span>
                                </div>
                              </div>
                            )}

                            {isPending && (
                              <div className="grid grid-cols-2 gap-2 mt-1">
                                <button
                                  onClick={() => handleRejectProof(proof.id)}
                                  className="bg-rose-950/20 hover:bg-rose-900/30 text-rose-400 border border-rose-900/20 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
                                >
                                  <XCircle className="w-4 h-4" />
                                  Reject Proof
                                </button>
                                <button
                                  onClick={() => handleApproveProof(proof)}
                                  className="bg-[#E2FF00] hover:bg-[#c2db00] text-black py-2.5 rounded-xl text-xs font-extrabold transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
                                >
                                  <CheckCircle className="w-4 h-4" />
                                  Approve VIP
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                /* MANAGE USERS SUBTAB */
                <div className="space-y-4">
                  <div className="relative">
                    <input
                      type="text"
                      value={userSearchQuery}
                      onChange={(e) => setUserSearchQuery(e.target.value)}
                      placeholder="Search users by email or username..."
                      className="w-full bg-[#070b0f] border border-white/10 hover:border-white/20 focus:border-[#E2FF00] rounded-xl p-3.5 pl-4 text-xs focus:outline-none focus:ring-1 focus:ring-[#E2FF00] transition-all font-medium text-slate-100 placeholder:text-slate-500"
                    />
                  </div>

                  <div className="bg-[#121921]/95 border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
                    {allUsers.length === 0 ? (
                      <div className="p-8 text-center text-slate-500 text-xs">
                        Loading users list...
                      </div>
                    ) : (
                      <div className="divide-y divide-white/5">
                        {allUsers
                          .filter(user => 
                            user.email?.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
                            user.username?.toLowerCase().includes(userSearchQuery.toLowerCase())
                          )
                          .map((u) => {
                            return (
                              <div key={u.uid} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-9 h-9 rounded-full bg-gradient-to-r from-red-500 to-amber-500 flex items-center justify-center text-black font-black text-xs uppercase shadow-md shrink-0">
                                    {u.username?.[0] || "U"}
                                  </div>
                                  <div className="flex flex-col min-w-0">
                                    <span className="text-xs font-bold text-slate-200 truncate">{u.username || "User"}</span>
                                    <span className="text-[10px] text-slate-500 font-mono truncate select-all">{u.email}</span>
                                  </div>
                                </div>

                                <div className="flex flex-wrap items-center gap-2">
                                  {[
                                    { id: "vip_cs_today", label: "Correct Score VIP" },
                                    { id: "vip_htft_today", label: "HT/FT VIP" }
                                  ].map((cat) => {
                                    const isActive = u.subscriptions?.[cat.id] === true;
                                    return (
                                      <button
                                        key={cat.id}
                                        onClick={() => handleToggleUserSubscription(u, cat.id)}
                                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider border transition-all cursor-pointer flex items-center gap-1 ${
                                          isActive
                                            ? "bg-emerald-950/20 text-emerald-400 border-emerald-500/20 shadow-[0_0_8px_rgba(16,185,129,0.1)]"
                                            : "bg-slate-900/40 text-slate-500 border-white/5 hover:border-white/10 hover:text-slate-300"
                                        }`}
                                      >
                                        {isActive ? <Check className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                                        {cat.label}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* FULL RESOLUTION SCREENSHOT LIGHTBOX/VIEWER MODAL */}
              <AnimatePresence>
                {viewingScreenshot && (
                  <div className="fixed inset-0 bg-black/95 z-55 flex flex-col items-center justify-center p-4">
                    <motion.div
                      initial={{ scale: 0.95, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.95, opacity: 0 }}
                      className="relative max-w-full max-h-full flex flex-col gap-4"
                    >
                      <button
                        onClick={() => setViewingScreenshot(null)}
                        className="absolute -top-12 right-0 p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all cursor-pointer flex items-center justify-center"
                      >
                        <X className="w-6 h-6" />
                      </button>
                      
                      <img
                        src={viewingScreenshot}
                        alt="Full Payment Receipt"
                        className="max-w-[90vw] max-h-[80vh] object-contain rounded-2xl shadow-2xl border border-white/10"
                        referrerPolicy="no-referrer"
                      />
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>
            </div>
          )
        ) : activeTab === "chats" ? (
          currentUser ? (
            <WhatsAppChat
              currentUser={currentUser}
              isMainAdmin={isMainAdmin}
              userProfile={userProfile}
              userMessages={userMessages}
              adminAllMessages={adminAllMessages}
              allUsers={allUsers}
              db={db}
              sendFCMNotificationProgrammatic={sendFCMNotificationProgrammatic}
              selectedUserId={selectedChatUserId}
              setSelectedUserId={setSelectedChatUserId}
            />
          ) : (
            <div className="bg-[#121921]/90 border border-white/5 p-8 rounded-2xl text-center space-y-4 max-w-md mx-auto my-12 shadow-2xl">
              <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto text-red-400">
                <Lock className="w-8 h-8" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-sm font-black uppercase tracking-wider text-white">Authentication Required</h3>
                <p className="text-xs text-slate-400 leading-relaxed font-sans">
                  Please register or log in to your account from the top menu to initiate real-time support chat.
                </p>
              </div>
            </div>
          )
        ) : null}

      </main>

      {/* APK-Style Activity Window/Overlay for Selected Menu */}
      <AnimatePresence>
        {openedCategoryId && activeCategory && (
          <motion.div
            key="apk-details-overlay"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 220 }}
            style={{
              backgroundImage: `linear-gradient(rgba(48, 2, 2, 0.88), rgba(48, 2, 2, 0.97)), url("https://i.ibb.co/NdsrmZx0/2d4e211d-777e-4801-bd34-cdb12a906b44.jpg")`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              backgroundAttachment: "fixed"
            }}
            className="fixed inset-0 z-50 bg-[#300202] overflow-y-auto flex flex-col items-center pb-12 pt-[54px]"
          >
            {/* APK Fixed Header with Back Arrow on Left Edge */}
            <div className="fixed top-0 left-0 right-0 h-[54px] bg-gradient-to-r from-[#870404] via-[#a60606] to-[#870404]/98 backdrop-blur-xl text-white px-4 flex items-center justify-between border-b border-white/10 select-none shadow-[0_4px_30px_rgba(0,0,0,0.5)] z-50">
              {/* Glow Line underneath */}
              <div className="absolute bottom-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#E2FF00]/45 to-transparent opacity-80" />

              <div className="flex items-center gap-3">
                <button
                  id="apk-back-btn"
                  onClick={() => {
                    if (isStandaloneWindow) {
                      try {
                        window.close();
                      } catch (e) {
                        console.error(e);
                      }
                      setOpenedCategoryId(null);
                    } else {
                      setOpenedCategoryId(null);
                    }
                  }}
                  className="p-1.5 rounded-lg text-slate-300 hover:text-[#E2FF00] hover:bg-white/5 active:scale-95 transition-all duration-300 cursor-pointer flex items-center justify-center"
                  aria-label="Go back"
                >
                  <ArrowLeft className="w-5.5 h-5.5" />
                </button>
                <span className="text-sm font-black tracking-wider uppercase text-white font-sans">
                  {activeCategory.title}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 bg-[#E2FF00]/10 px-2.5 py-1 rounded-full border border-[#E2FF00]/20">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#E2FF00] animate-pulse" />
                  <span className="text-[8px] font-mono font-bold uppercase tracking-wider text-[#E2FF00]">Active Tips</span>
                </div>
              </div>
            </div>

            {/* Ticket List Body */}
            <div className="w-full max-w-[480px] px-4 flex flex-col items-center gap-0 mt-2">
              {activeCategory.id.startsWith("vip_") && activeCategory.id.includes("today") && !isSubscribedToActiveCategory ? (
                // PREMIUM PAYMENT GATEWAY & CONVERSION WIZARD
                (() => {
                  let planName = "Elite VIP Weekly Access";
                  let planUsdPrice = 59;

                  if (activeCategory.id.includes("cs")) {
                    planName = "Correct Score VIP Weekly Access";
                    planUsdPrice = 1000;
                  } else if (activeCategory.id.includes("htft")) {
                    planName = "HT/FT VIP Weekly Access";
                    planUsdPrice = 500;
                  }

                  const paymentCountries = [
                    { code: "UG", name: "Uganda", currency: "UGX", flag: "🇺🇬", rateKey: "UGX", symbol: "USh" },
                    { code: "NG", name: "Nigeria", currency: "NGN", flag: "🇳🇬", rateKey: "NGN", symbol: "₦" },
                    { code: "CM", name: "Cameroon", currency: "XAF", flag: "🇨🇲", rateKey: "XAF", symbol: "FCFA" },
                    { code: "CI", name: "Cote d'Ivoire", currency: "XOF", flag: "🇨🇮", rateKey: "XOF", symbol: "FCFA" },
                    { code: "TZ", name: "Tanzania", currency: "TZS", flag: "🇹🇿", rateKey: "TZS", symbol: "TSh" },
                    { code: "OTHER", name: "Other Countries", currency: "USDT (BEP20)", flag: "🌐", rateKey: "USD", symbol: "$" }
                  ];

                  const currentCountry = paymentCountries.find(c => c.code === selectedCountryCode) || paymentCountries[0];
                  const rate = exchangeRates[currentCountry.rateKey] || 1;
                  const convertedPrice = planUsdPrice * rate;
                  const formattedPrice = new Intl.NumberFormat('en-US', {
                    maximumFractionDigits: 0
                  }).format(convertedPrice);

                  return (
                    <div className="w-full flex flex-col items-center gap-0">
                      {/* PLAN DETAILS CARD */}
                      <div className="w-full max-w-[360px] bg-gradient-to-br from-slate-900 via-slate-950 to-black border border-white/5 rounded-2xl p-5 mb-5 shadow-2xl flex flex-col select-none relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-[#E2FF00]/5 to-transparent pointer-events-none" />
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono font-black uppercase tracking-wider text-[#E2FF00] bg-[#E2FF00]/10 px-2.5 py-1 rounded-md border border-[#E2FF00]/20">
                            {planName}
                          </span>
                          <div className="flex items-center gap-1">
                            <Crown className="w-4 h-4 text-[#E2FF00] animate-pulse" />
                            <span className="text-[10px] font-mono font-bold text-slate-400 font-sans">VIP ACCESS</span>
                          </div>
                        </div>
                        <div className="mt-4 flex items-baseline gap-1.5">
                          <span className="text-3xl font-black tracking-tight text-white">{currentCountry.symbol} {formattedPrice}</span>
                          <span className="text-xs text-slate-400 font-medium">/ weekly</span>
                        </div>
                        <div className="mt-1.5 flex items-center gap-1">
                          <span className="text-[10px] font-mono text-slate-500">
                            Base Rate: ${planUsdPrice} USD (1 USD ≈ {rate.toFixed(1)} {currentCountry.rateKey})
                          </span>
                        </div>
                      </div>

                      {/* COUNTRY SELECTOR GRID */}
                      <div className="w-full max-w-[360px] flex flex-col gap-2.5 mb-6 select-none">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5 font-sans">
                          <Globe className="w-3.5 h-3.5 text-[#E2FF00]" />
                          Select Your Payment Country
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          {paymentCountries.map((c) => {
                            const isSelected = selectedCountryCode === c.code;
                            return (
                              <button
                                key={c.code}
                                onClick={() => setSelectedCountryCode(c.code)}
                                className={`flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all duration-300 cursor-pointer ${
                                  isSelected
                                    ? "border-[#E2FF00] bg-[#111921] shadow-[0_0_12px_rgba(226,255,0,0.15)] text-white font-extrabold"
                                    : "border-white/5 bg-slate-900/60 hover:border-white/10 hover:bg-slate-800/40 text-slate-300 font-medium"
                                }`}
                              >
                                <span className="text-lg">{c.flag}</span>
                                <div className="flex flex-col min-w-0">
                                  <span className="text-xs truncate">{c.name}</span>
                                  <span className="text-[9px] text-slate-500 font-mono font-bold">{c.currency}</span>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* METHOD SPECIFIC BILLING CARD */}
                      {currentCountry.code === "TZ" ? (
                        <div className="w-full max-w-[360px] bg-slate-950/80 border border-white/5 rounded-2xl p-5 flex flex-col gap-4 select-none mb-6">
                          <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                            <span className="text-xs font-black uppercase tracking-wider text-[#E2FF00]">Halopesa Transfer Instruction</span>
                          </div>

                          <div className="flex flex-col gap-3">
                            <div className="flex flex-col gap-1 bg-black/40 border border-white/5 p-3 rounded-xl">
                              <span className="text-[9px] font-mono font-black uppercase tracking-wider text-slate-500">Halopesa Number</span>
                              <div className="flex items-center justify-between">
                                <span className="text-base font-black text-white font-mono">0620370435</span>
                                <button
                                  onClick={() => triggerCopy("0620370435", "number")}
                                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/5 text-slate-300 hover:text-white hover:bg-white/10 active:scale-95 transition text-[10px] cursor-pointer"
                                >
                                  {copiedText === "number" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                                  {copiedText === "number" ? "Copied" : "Copy"}
                                </button>
                              </div>
                            </div>

                            <div className="flex flex-col gap-1 bg-black/40 border border-white/5 p-3 rounded-xl">
                              <span className="text-[9px] font-mono font-black uppercase tracking-wider text-slate-500">Recipient Registered Name</span>
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-bold text-slate-200">Nyanga Shinhu</span>
                                <button
                                  onClick={() => triggerCopy("Nyanga Shinhu", "name")}
                                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/5 text-slate-300 hover:text-white hover:bg-white/10 active:scale-95 transition text-[10px] cursor-pointer"
                                >
                                  {copiedText === "name" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                                  {copiedText === "name" ? "Copied" : "Copy"}
                                </button>
                              </div>
                            </div>
                          </div>

                          <div className="text-[11px] text-slate-400 leading-relaxed bg-amber-500/5 border border-amber-500/10 p-3.5 rounded-xl flex items-start gap-2.5">
                            <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                            <div className="flex flex-col gap-1">
                              <strong className="text-slate-200">Instructions:</strong>
                              <span>1. Open your Mobile Money wallet.</span>
                              <span>2. Send exactly <strong className="text-white">{currentCountry.symbol} {formattedPrice}</strong> to the Halopesa number above.</span>
                              <span>3. Confirm the name is <strong className="text-white">Nyanga Shinhu</strong>.</span>
                              <span>4. Once sent, screenshot your proof and tap below to contact support for instant activation!</span>
                            </div>
                          </div>

                          <a
                            href={`https://wa.me/256782200000?text=I%20have%20paid%20${formattedPrice}%20TZS%20on%20Halopesa%20for%20${planName}`}
                            target="_blank"
                            rel="noreferrer"
                            className="w-full bg-[#E2FF00] hover:bg-[#c2db00] text-black font-extrabold text-xs py-3.5 rounded-xl shadow-lg transition-all active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
                          >
                            <span>💬 Contact Support to Activate</span>
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        </div>
                      ) : currentCountry.code === "OTHER" ? (
                        <div className="w-full max-w-[360px] bg-slate-950/80 border border-white/5 rounded-2xl p-5 flex flex-col gap-4 select-none mb-6">
                          <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                            <Coins className="w-5 h-5 text-[#E2FF00]" />
                            <span className="text-xs font-black uppercase tracking-wider text-[#E2FF00]">BEP-20 Cryptocurrency Payment</span>
                          </div>

                          <div className="flex flex-col gap-3">
                            <div className="flex flex-col gap-1 bg-black/40 border border-white/5 p-3 rounded-xl">
                              <span className="text-[9px] font-mono font-black uppercase tracking-wider text-slate-500">BEP-20 (USDT / USDC) Deposit Address</span>
                              <div className="flex items-center gap-2 justify-between mt-1">
                                <span className="text-[10px] font-mono text-slate-300 break-all select-all flex-1 font-sans">0xE6a19d217652577807feC3B9135A260179d41D16</span>
                                <button
                                  onClick={() => triggerCopy("0xE6a19d217652577807feC3B9135A260179d41D16", "crypto")}
                                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/5 text-slate-300 hover:text-white hover:bg-white/10 active:scale-95 transition text-[10px] shrink-0 cursor-pointer"
                                >
                                  {copiedText === "crypto" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                                  {copiedText === "crypto" ? "Copied" : "Copy"}
                                </button>
                              </div>
                            </div>
                          </div>

                          <div className="text-[11px] text-slate-400 leading-relaxed bg-amber-500/5 border border-amber-500/10 p-3.5 rounded-xl flex items-start gap-2.5 font-sans">
                            <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                            <div className="flex flex-col gap-1">
                              <strong className="text-slate-200">Instructions:</strong>
                              <span>1. Copy the BEP-20 address above.</span>
                              <span>2. Send exactly <strong className="text-white">${planUsdPrice} USDT or USDC</strong>.</span>
                              <span>3. Verify the network is <strong className="text-white">BNB Smart Chain (BEP20)</strong> or your payment will be lost.</span>
                              <span>4. Once sent, screenshot the transaction hash and tap below to activate.</span>
                            </div>
                          </div>

                          <a
                            href={`https://wa.me/256782200000?text=I%20have%20paid%20${planUsdPrice}%20USD%20on%20BEP20%20for%20${planName}`}
                            target="_blank"
                            rel="noreferrer"
                            className="w-full bg-[#E2FF00] hover:bg-[#c2db00] text-black font-extrabold text-xs py-3.5 rounded-xl shadow-lg transition-all active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
                          >
                            <span>💬 Contact Support to Verify</span>
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        </div>
                      ) : (
                        <div className="w-full max-w-[360px] flex flex-col gap-4 mb-6">
                          <div className="bg-red-950/30 border border-red-500/30 rounded-2xl p-5 flex flex-col gap-4 select-none shadow-xl relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-1.5 h-full bg-red-500 animate-pulse" />
                            <div className="flex items-center gap-2">
                              <ShieldAlert className="w-5 h-5 text-red-400 shrink-0" />
                              <span className="text-xs font-black uppercase tracking-wider text-red-400">CRITICAL PAYMENT NOTICE</span>
                            </div>
                            <p className="text-[11px] font-medium text-slate-300 leading-relaxed font-sans">
                              Do <strong className="text-red-300 underline font-extrabold">NOT</strong> change the email or name fields on the payment checkout page. If changed, your automatic account activation will fail, and you will lose your payment!
                            </p>
                            
                            {/* PRECISE CHECKOUT LINK IN NEW TAB */}
                            {(() => {
                              const countryObj = paymentCountries.find(c => c.code === selectedCountryCode);
                              const checkoutUrl = countryObj ? (countryObj.code === "UG" ? "https://flutterwave.com/pay/ugxeversend?email=paymentgateway1998@gmail.com&firstname=Jilala&lastname=Masanja" : countryObj.code === "NG" ? "https://flutterwave.com/pay/ngneversend?email=paymentgateway198@gmail.com&firstname=JOEL%20EKPO&lastname=ABEL" : countryObj.code === "CM" ? "https://flutterwave.com/pay/xafeversend?email=paymentgateway198@gmail.com&firstname=JOEL%20EKPO&lastname=ABEL" : "https://flutterwave.com/pay/xofeversend?email=paymentgateway198@gmail.com&firstname=JOEL%20EKPO&lastname=ABEL") : "";

                              return (
                                <a
                                  href={checkoutUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="w-full bg-[#E2FF00] hover:bg-[#c2db00] text-black font-black text-xs py-4 rounded-xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2.5 cursor-pointer text-center font-sans uppercase tracking-widest mt-1"
                                >
                                  <span>🚀 Proceed to Payment ({currentCountry.symbol} {formattedPrice})</span>
                                  <ExternalLink className="w-4.5 h-4.5" />
                                </a>
                              );
                            })()}
                          </div>
                        </div>
                      )}

                      {/* PROOF OF PAYMENT SCREENSHOT UPLOADER */}
                      {(() => {
                        const pendingProof = userProofs.find(p => p.categoryId === activeCategory.id && p.status === "pending");
                        const rejectedProof = userProofs.find(p => p.categoryId === activeCategory.id && p.status === "rejected");

                        if (pendingProof) {
                          return (
                            <div className="w-full max-w-[360px] bg-slate-950/80 border border-[#E2FF00]/30 rounded-2xl p-5 flex flex-col items-center text-center gap-3 select-none mb-6">
                              <div className="w-12 h-12 rounded-full bg-[#E2FF00]/10 flex items-center justify-center border border-[#E2FF00]/20">
                                <Clock className="w-6 h-6 text-[#E2FF00] animate-pulse" />
                              </div>
                              <span className="text-xs font-black uppercase tracking-wider text-[#E2FF00]">Proof Under Review</span>
                              <p className="text-[11px] text-slate-300 font-medium leading-relaxed font-sans">
                                Your screenshot has been submitted and is currently pending verification by our administrators. This process typically takes under 15 minutes.
                              </p>
                              <div className="w-full bg-black/40 border border-white/5 p-3 rounded-xl flex items-center justify-between text-xs mt-2">
                                <span className="text-slate-500 font-mono">Submitted:</span>
                                <span className="text-slate-300 font-mono font-bold">
                                  {pendingProof.createdAt ? new Date(pendingProof.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Recently"}
                                </span>
                              </div>
                            </div>
                          );
                        }

                        return (
                          <div className="w-full max-w-[360px] bg-slate-950/80 border border-white/5 rounded-2xl p-5 flex flex-col gap-4 select-none mb-6">
                            <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                              <Camera className="w-4.5 h-4.5 text-[#E2FF00]" />
                              <span className="text-xs font-black uppercase tracking-wider text-[#E2FF00]">Submit Payment Screenshot</span>
                            </div>

                            {rejectedProof && (
                              <div className="text-[10px] text-rose-400 bg-rose-950/20 border border-rose-900/30 p-2.5 rounded-xl font-medium text-center">
                                <span className="font-bold block uppercase tracking-wider text-xs mb-1">❌ Previous Submission Rejected</span>
                                The administrator rejected your payment proof. Please make sure the screenshot clearly displays the successful transaction confirmation.
                              </div>
                            )}

                            {proofSubmitError && (
                              <div className="text-[10px] text-rose-400 bg-rose-950/20 border border-rose-900/30 p-2.5 rounded-xl font-medium text-center">
                                {proofSubmitError}
                              </div>
                            )}

                            {proofSubmitSuccess && (
                              <div className="text-[10px] text-emerald-400 bg-emerald-950/20 border border-emerald-900/30 p-2.5 rounded-xl font-medium text-center">
                                {proofSubmitSuccess}
                              </div>
                            )}

                            {/* Drag-and-drop or select file box */}
                            {!proofImage ? (
                              <label className="flex flex-col items-center justify-center border-2 border-dashed border-white/10 hover:border-[#E2FF00]/40 rounded-xl p-6 bg-black/40 cursor-pointer transition-all duration-300">
                                <div className="p-3 bg-white/5 rounded-full mb-2.5 text-slate-400">
                                  <Image className="w-5 h-5" />
                                </div>
                                <span className="text-[11px] font-bold text-slate-200">Tap to select or drop screenshot</span>
                                <span className="text-[9px] text-slate-500 font-mono mt-1">Supports PNG, JPG, JPEG</span>
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      if (file.size > 2 * 1024 * 1024) {
                                        setProofSubmitError("Image size must be smaller than 2MB.");
                                        return;
                                      }
                                      setProofSubmitError(null);
                                      const reader = new FileReader();
                                      reader.onload = () => {
                                        setProofImage(reader.result as string);
                                      };
                                      reader.onerror = () => {
                                        setProofSubmitError("Failed to read image file.");
                                      };
                                      reader.readAsDataURL(file);
                                    }
                                  }}
                                />
                              </label>
                            ) : (
                              <div className="relative border border-white/10 rounded-xl overflow-hidden bg-black/40 p-2 flex flex-col gap-2">
                                <img
                                  src={proofImage}
                                  alt="Payment Proof Preview"
                                  className="w-full max-h-[160px] object-contain rounded-lg"
                                  referrerPolicy="no-referrer"
                                />
                                <button
                                  onClick={() => setProofImage(null)}
                                  className="absolute top-2 right-2 p-1.5 bg-black/80 rounded-full text-slate-300 hover:text-white hover:bg-black border border-white/10 transition-all cursor-pointer"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                                <span className="text-[9px] text-slate-500 text-center font-mono font-bold">Preview Selected Screenshot</span>
                              </div>
                            )}

                            {proofImage && (
                              <button
                                onClick={async () => {
                                  if (!currentUser) return;
                                  setUploadingProof(true);
                                  setProofSubmitError(null);
                                  setProofSubmitSuccess(null);
                                  try {
                                    const proofId = "proof_" + Math.random().toString(36).substring(2, 15);
                                    await setDoc(doc(db, "proofs", proofId), {
                                      id: proofId,
                                      userId: currentUser.uid,
                                      username: userProfile?.username || currentUser.displayName || currentUser.email?.split("@")[0] || "User",
                                      email: currentUser.email || "",
                                      categoryId: activeCategory.id,
                                      screenshot: proofImage,
                                      status: "pending",
                                      createdAt: new Date().toISOString(),
                                      amount: `${currentCountry.symbol} ${formattedPrice}`
                                    });
                                    setProofSubmitSuccess("Payment proof uploaded successfully!");
                                    setProofImage(null);
                                  } catch (err: any) {
                                    console.error("Error saving proof:", err);
                                    setProofSubmitError("Failed to submit: " + err.message);
                                  } finally {
                                    setUploadingProof(false);
                                  }
                                }}
                                disabled={uploadingProof}
                                className="w-full bg-[#E2FF00] hover:bg-[#c2db00] disabled:bg-slate-800 disabled:text-slate-500 text-black font-extrabold text-xs py-3.5 rounded-xl shadow-lg transition-all active:scale-98 flex items-center justify-center gap-1.5 cursor-pointer"
                              >
                                {uploadingProof ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                {uploadingProof ? "Submitting Proof..." : "Submit Proof as Payment Receipt"}
                              </button>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  );
                })()
              ) : (
                // NORMAL TICKETS / FREE TIPS / EXPIRED VIP MATCH LIST
                <>
                  {activeCategory.tickets.length === 0 && (
                    <div className="w-full max-w-[350px] bg-slate-900/40 border border-dashed border-white/10 rounded-2xl py-12 px-6 text-center text-slate-400 space-y-2.5 select-none mb-4">
                      <div className="w-10 h-10 rounded-full bg-slate-950 flex items-center justify-center mx-auto border border-white/5">
                        <Trophy className="w-5 h-5 text-slate-600 animate-pulse" />
                      </div>
                      <p className="font-sans font-bold text-xs uppercase tracking-wider text-slate-300">No Active Tickets</p>
                      <p className="text-[10px] text-slate-500 leading-relaxed font-mono">
                        {isMainAdmin 
                          ? "Click the '+' Floating Action Button at the bottom right to upload a match selection." 
                          : "Please check back later! Our analysts are preparing the highest accuracy selections."}
                      </p>
                    </div>
                  )}

                  {activeCategory.tickets.map((ticket, index) => {
                    // Filter matches based on the activeCategory type
                    const filteredMatchesWithIndices = (ticket.matches || []).map((match, mIdx) => ({
                      match,
                      originalIdx: mIdx,
                    })).filter(({ match, originalIdx }) => {
                      const status = match.status || getMatchStatus(ticket.date, originalIdx, index);
                      if (activeCategory.id.includes("today")) {
                        return status === "pending";
                      } else if (activeCategory.id.includes("results")) {
                        return status === "win" || status === "lose";
                      }
                      return true;
                    });

                    // If no matches match criteria, hide this ticket block (unless admin mode so they can add)
                    if (filteredMatchesWithIndices.length === 0 && !isMainAdmin) {
                      return null;
                    }

                    return (
                      <div key={index} className="vip-ticket-wrap w-full max-w-[340px] mb-2">
                        <span className="vip-tear vip-tear-top"></span>
                        <div className="vip-ticket">

                          {/* DATE HERO */}
                          <div className="vip-date-hero">
                            <span className="vip-date-big">{ticket.date}</span>
                          </div>

                          {/* perforation */}
                          <div className="vip-perf green">
                            <hr className="vip-perf-line" />
                          </div>

                          {/* MATCHES */}
                          <div className="vip-matches">
                            {filteredMatchesWithIndices.length === 0 ? (
                              <div className="py-4 text-center text-[10px] text-slate-400 font-mono">
                                No active matches in this group
                              </div>
                            ) : (
                              filteredMatchesWithIndices.map(({ match, originalIdx }, fIdx) => (
                                <React.Fragment key={originalIdx}>
                                  <div className="vip-match-row relative group/row">
                                    <div className="vip-num">{match.num}</div>
                                    <div className="vip-match-info">
                                      <div className="vip-match-name">{match.home} vs {match.away}</div>
                                      <div className="vip-pick flex items-center gap-1.5 flex-wrap">
                                        <span>{formatTip(match.score)}</span>
                                      </div>
                                    </div>
                                    <div className="result-group flex items-center gap-1.5 shrink-0 select-none">          
                                      {renderMatchStatusBadge(match.status || getMatchStatus(ticket.date, originalIdx, index))}
                                      <span className="vip-odds">{match.odds}</span>
                                    </div>

                                    {isMainAdmin && (
                                      <div className="flex items-center gap-1 ml-2 pl-1.5 border-l border-white/10 shrink-0">
                                        <button 
                                          onClick={() => startEditMatch(activeCategory.id, index, originalIdx, match)}
                                          className="p-1 rounded bg-[#E2FF00]/10 hover:bg-[#E2FF00]/20 text-[#E2FF00] transition-all cursor-pointer"
                                          title="Edit Match"
                                        >
                                          <Edit3 className="w-3.5 h-3.5" />
                                        </button>
                                        <button 
                                          onClick={() => duplicateMatch(activeCategory.id, index, originalIdx)}
                                          className="p-1 rounded bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 hover:text-indigo-300 transition-all cursor-pointer"
                                          title="Duplicate Match"
                                        >
                                          <Copy className="w-3.5 h-3.5" />
                                        </button>
                                        <button 
                                          onClick={() => deleteMatch(activeCategory.id, index, originalIdx)}
                                          className="p-1 rounded bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-all cursor-pointer"
                                          title="Delete Match"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                  {fIdx < filteredMatchesWithIndices.length - 1 && <hr className="vip-row-sep" />}
                                </React.Fragment>
                              ))
                            )}
                          </div>

                          {isMainAdmin && (
                            <div className="mt-3.5 pt-3 border-t border-white/10 flex items-center justify-between gap-2.5 px-1 pb-1">
                              <button
                                onClick={() => startAddMatch(activeCategory.id, index)}
                                className="flex-1 py-1 px-3 text-[10px] font-black uppercase tracking-wider text-black bg-[#E2FF00] rounded-lg hover:scale-[1.01] active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                              >
                                <Plus className="w-3.5 h-3.5" strokeWidth={3} />
                                Add Match
                              </button>
                              <button
                                onClick={() => deleteTicketGroup(activeCategory.id, index)}
                                className="py-1 px-3 text-[10px] font-black uppercase tracking-wider text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg hover:bg-red-500/20 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                Delete Group
                              </button>
                            </div>
                          )}

                        </div>
                        <span className="vip-tear vip-tear-bottom"></span>
                      </div>
                    );
                  })}
                </>
              )}
            </div>

          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Match Overlay Dialog */}
      <AnimatePresence>
        {editingMatch && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-[60] flex items-center justify-center p-4 overflow-y-auto"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-[#0b1017] border border-white/10 p-5 rounded-2xl w-full max-w-[350px] shadow-[0_20px_50px_rgba(0,0,0,0.8)] space-y-4 text-left"
            >
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <h3 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
                  <Edit3 className="text-[#E2FF00] w-4.5 h-4.5" />
                  Edit Match Details
                </h3>
                <span className="text-[9px] font-mono font-black text-[#E2FF00] bg-[#E2FF00]/10 px-2 py-0.5 rounded border border-[#E2FF00]/20">
                  🇹🇿 Admin Edit
                </span>
              </div>

              <div className="space-y-3">
                {/* Date & Time Picker */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Match Date 📅</label>
                    <input
                      type="date"
                      value={matchDate}
                      onChange={(e) => setMatchDate(e.target.value)}
                      className="w-full bg-[#121921] border border-white/10 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-[#E2FF00]/50 font-sans"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Start Time (EAT) 🕒</label>
                    <input
                      type="time"
                      value={matchTime}
                      onChange={(e) => setMatchTime(e.target.value)}
                      className="w-full bg-[#121921] border border-white/10 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-[#E2FF00]/50 font-sans"
                    />
                  </div>
                </div>

                {/* Teams */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Home Team</label>
                    <input
                      type="text"
                      value={matchHome}
                      onChange={(e) => setMatchHome(e.target.value)}
                      className="w-full bg-[#121921] border border-white/10 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-[#E2FF00]/50"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Away Team</label>
                    <input
                      type="text"
                      value={matchAway}
                      onChange={(e) => setMatchAway(e.target.value)}
                      className="w-full bg-[#121921] border border-white/10 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-[#E2FF00]/50"
                      required
                    />
                  </div>
                </div>

                {/* Pick / Score Tip */}
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Pick / Score Tip</label>
                  <input
                    type="text"
                    value={matchScore}
                    onChange={(e) => setMatchScore(e.target.value)}
                    className="w-full bg-[#121921] border border-white/10 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-[#E2FF00]/50"
                    required
                  />
                </div>

                {/* Odds & Status */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Odds</label>
                    <input
                      type="text"
                      value={matchOdds}
                      onChange={(e) => setMatchOdds(e.target.value)}
                      className="w-full bg-[#121921] border border-white/10 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-[#E2FF00]/50"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Status</label>
                    <select
                      value={matchStatus}
                      onChange={(e) => setMatchStatus(e.target.value as "pending" | "win" | "lose")}
                      className="w-full bg-[#121921] border border-white/10 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-[#E2FF00]/50 font-sans"
                    >
                      <option value="pending">PENDING</option>
                      <option value="win">WON</option>
                      <option value="lose">LOST</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingMatch(null)}
                  className="flex-1 py-2 border border-white/10 rounded-xl text-xs font-bold text-slate-400 hover:bg-white/5 active:scale-95 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveEditMatch}
                  className="flex-1 py-2 bg-[#E2FF00] rounded-xl text-xs font-black text-black hover:scale-[1.01] active:scale-95 transition-all cursor-pointer uppercase tracking-wider font-sans"
                >
                  Save Changes
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Action Button (FAB) for Match Upload */}
      {isMainAdmin && activeTab === "correct_score" && (
        <button
          onClick={() => {
            setUploadCategory(activeCategory?.id || "");
            setUploadDate(new Date().toISOString().split("T")[0]);
            setUploadTime("");
            setUploadHome("");
            setUploadAway("");
            setUploadScore("");
            setUploadOdds("");
            setUploadStatus("pending");
            setShowUploadForm(true);
          }}
          className="fixed bottom-6 right-6 z-50 bg-[#E2FF00] hover:bg-[#d6f000] text-black w-14 h-14 rounded-full flex items-center justify-center shadow-[0_4px_20px_rgba(226,255,0,0.4)] active:scale-95 hover:scale-105 transition-all cursor-pointer border border-black/10"
          title="Upload Match Selection"
        >
          <Plus className="w-6 h-6" strokeWidth={3} />
        </button>
      )}

      {/* Floating Action Button for WhatsApp Chat Support */}
      {currentUser && activeTab !== "chats" && !openedCategoryId && (
        <button
          onClick={() => setActiveTab("chats")}
          className={`fixed ${isMainAdmin ? "bottom-24" : "bottom-6"} right-6 z-50 bg-[#25D366] hover:bg-[#20ba5a] text-white w-14 h-14 rounded-full flex items-center justify-center shadow-[0_4px_25px_rgba(37,211,102,0.55)] active:scale-95 hover:scale-105 transition-all cursor-pointer border border-white/10`}
          title="Open WhatsApp Chat Support"
        >
          <div className="relative">
            <MessageSquare className="w-6 h-6 text-white" />
            {(() => {
              const count = isMainAdmin 
                ? adminAllMessages.filter(m => m.senderId !== "admin" && !m.readByAdmin).length
                : userMessages.filter(m => m.senderId === "admin" && !m.readByUser).length;
              return count > 0 ? (
                <span className="absolute -top-2.5 -right-2.5 bg-red-600 text-white text-[9px] w-5 h-5 rounded-full flex items-center justify-center font-black animate-bounce font-mono shadow-md border border-[#25D366]">
                  {count}
                </span>
              ) : (
                <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
              );
            })()}
          </div>
        </button>
      )}

      {/* Custom Confirmation Dialog for Deletions */}
      <AnimatePresence>
        {deleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/85 backdrop-blur-md z-[70] flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-[#0b1017] border border-white/10 p-5 rounded-2xl w-full max-w-[340px] shadow-[0_25px_60px_rgba(0,0,0,0.9)] space-y-4 text-center"
            >
              <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mx-auto border border-red-500/20 text-red-400">
                <Trash2 className="w-6 h-6" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-sm font-black uppercase tracking-wider text-white">
                  {deleteConfirm.title}
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed font-sans px-2">
                  {deleteConfirm.message}
                </p>
              </div>
              <div className="flex gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-bold text-slate-300 transition-all cursor-pointer active:scale-95"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={executeDelete}
                  className="flex-1 py-2 bg-red-600 hover:bg-red-500 rounded-xl text-xs font-black text-white transition-all cursor-pointer active:scale-95"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Unified Match Upload Modal */}
      <AnimatePresence>
        {showUploadForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-[60] flex items-center justify-center p-4 overflow-y-auto"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-[#0b1017] border border-white/10 p-5 rounded-2xl w-full max-w-[360px] shadow-[0_20px_50px_rgba(0,0,0,0.8)] space-y-4 text-left"
            >
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <h3 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
                  <Plus className="text-[#E2FF00] w-5 h-5" strokeWidth={3} />
                  Upload Match Selection
                </h3>
                <span className="text-[9px] font-mono font-black text-[#E2FF00] bg-[#E2FF00]/10 px-2 py-0.5 rounded border border-[#E2FF00]/20">
                  🇹🇿 Dar es Salaam Time
                </span>
              </div>

              <div className="space-y-3">
                {/* Category Selection */}
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Target Category</label>
                  <select
                    value={uploadCategory}
                    onChange={(e) => setUploadCategory(e.target.value)}
                    className="w-full bg-[#121921] border border-white/10 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-[#E2FF00]/50 font-sans"
                  >
                    <option value="" disabled>Select Category</option>
                    {[...freeCategories, ...vipCategories].map(cat => (
                      <option key={cat.id} value={cat.id}>
                        {cat.title} ({cat.id.startsWith("free") ? "FREE" : "VIP"})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Date & Time Picker */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Match Date 📅</label>
                    <input
                      type="date"
                      value={uploadDate}
                      onChange={(e) => setUploadDate(e.target.value)}
                      className="w-full bg-[#121921] border border-white/10 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-[#E2FF00]/50 font-sans"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Start Time (EAT) 🕒</label>
                    <input
                      type="time"
                      value={uploadTime}
                      onChange={(e) => setUploadTime(e.target.value)}
                      className="w-full bg-[#121921] border border-white/10 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-[#E2FF00]/50 font-sans"
                    />
                  </div>
                </div>

                {/* Teams */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Home Team</label>
                    <input
                      type="text"
                      value={uploadHome}
                      onChange={(e) => setUploadHome(e.target.value)}
                      placeholder="Home Team"
                      className="w-full bg-[#121921] border border-white/10 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-[#E2FF00]/50"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Away Team</label>
                    <input
                      type="text"
                      value={uploadAway}
                      onChange={(e) => setUploadAway(e.target.value)}
                      placeholder="Away Team"
                      className="w-full bg-[#121921] border border-white/10 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-[#E2FF00]/50"
                      required
                    />
                  </div>
                </div>

                {/* Pick / Score Tip */}
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Pick / Selection Tip</label>
                  <input
                    type="text"
                    value={uploadScore}
                    onChange={(e) => setUploadScore(e.target.value)}
                    placeholder="e.g. Correct Score 2-1 or Over 2.5"
                    className="w-full bg-[#121921] border border-white/10 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-[#E2FF00]/50"
                    required
                  />
                </div>

                {/* Odds & Status */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Odds</label>
                    <input
                      type="text"
                      value={uploadOdds}
                      onChange={(e) => setUploadOdds(e.target.value)}
                      placeholder="e.g. 1.85"
                      className="w-full bg-[#121921] border border-white/10 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-[#E2FF00]/50"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Status</label>
                    <select
                      value={uploadStatus}
                      onChange={(e) => setUploadStatus(e.target.value as "pending" | "win" | "lose")}
                      className="w-full bg-[#121921] border border-white/10 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-[#E2FF00]/50 font-sans"
                    >
                      <option value="pending">PENDING</option>
                      <option value="win">WON</option>
                      <option value="lose">LOST</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowUploadForm(false)}
                  className="flex-1 py-2 border border-white/10 rounded-xl text-xs font-bold text-slate-400 hover:bg-white/5 active:scale-95 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleUploadMatch(uploadCategory, uploadDate, uploadTime, uploadHome, uploadAway, uploadScore, uploadOdds, uploadStatus)}
                  className="flex-1 py-2 bg-[#E2FF00] rounded-xl text-xs font-black text-black hover:scale-[1.01] active:scale-95 transition-all cursor-pointer uppercase tracking-wider font-sans"
                >
                  Upload Match
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>



    </div>
  );
}
