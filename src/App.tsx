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
  Coins
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { freeTips, vipTips } from "./data/tipsData";
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
  getDoc
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
  Mail
} from "lucide-react";

type ActiveTab = "notification" | "setting" | "correct_score";

export default function App() {
  // Auth states
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authUsername, setAuthUsername] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [firestoreError, setFirestoreError] = useState<string | null>(null);

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

  // Navigation & Drawer States
  const [activeTab, setActiveTab] = useState<ActiveTab>("correct_score");
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

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
      if (user) {
        setAuthError(null);
        try {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists()) {
            setUserProfile(userDoc.data());
          } else {
            // Create user document if it does not exist
            const isMainAdmin = user.email === "jilalamasanja1998@gmail.com";
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
          const isMainAdmin = user.email === "jilalamasanja1998@gmail.com";
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
    });

    return () => unsubscribe();
  }, []);

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
      setAuthError(err.message || "Failed to sign in with Google. If the popup closed, please try again.");
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

  // 5. Delete Match from Firestore
  const deleteMatch = async (categoryId: string, ticketIndex: number, matchIndex: number) => {
    const category = [...freeCategories, ...vipCategories].find(c => c.id === categoryId);
    if (!category) return;

    if (!confirm("Are you sure you want to delete this match?")) return;

    const updatedTickets = JSON.parse(JSON.stringify(category.tickets));
    updatedTickets[ticketIndex].matches.splice(matchIndex, 1);

    if (updatedTickets[ticketIndex].matches.length === 0) {
      updatedTickets.splice(ticketIndex, 1);
    } else {
      updatedTickets[ticketIndex].matches.forEach((m: any, idx: number) => {
        m.num = idx + 1;
      });
    }

    try {
      await setDoc(doc(db, "categories", categoryId), {
        ...category,
        tickets: updatedTickets
      }, { merge: true });
    } catch (err: any) {
      alert("Failed to delete match: " + err.message);
    }
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
    const category = [...freeCategories, ...vipCategories].find(c => c.id === categoryId);
    if (!category) return;

    if (!confirm(`Are you sure you want to delete the entire ticket group: "${category.tickets[ticketIndex].date}"?`)) return;

    const updatedTickets = JSON.parse(JSON.stringify(category.tickets));
    updatedTickets.splice(ticketIndex, 1);

    try {
      await setDoc(doc(db, "categories", categoryId), {
        ...category,
        tickets: updatedTickets
      }, { merge: true });
    } catch (err: any) {
      alert("Failed to delete ticket group: " + err.message);
    }
  };

  const isMainAdmin = currentUser?.email === "jilalamasanja1998@gmail.com" || userProfile?.role === "admin";

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

  const fetchCredentialsStatus = async () => {
    try {
      const res = await fetch("/api/status");
      const data = await res.json();
      setCredentialsStatus(data);
    } catch (e) {
      console.error("Failed to fetch server credentials status:", e);
    }
  };

  // Save Service Account Credentials
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

      const res = await fetch("/api/credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsedJson)
      });

      const result = await res.json();
      if (!res.ok) {
        setCredError(result.error || "Failed to save credentials.");
      } else {
        setCredentialsJson("");
        fetchCredentialsStatus();
        setFcmResult(null);
        // Switch to notification view automatically to let them try it
        setActiveTab("notification");
      }
    } catch (err: any) {
      setCredError("Server connection error: " + err.message);
    } finally {
      setIsSavingCreds(false);
    }
  };

  // Delete credentials
  const handleDeleteCredentials = async () => {
    if (!confirm("Are you sure you want to remove the server-side Service Account key?")) {
      return;
    }
    try {
      const res = await fetch("/api/credentials", { method: "DELETE" });
      if (res.ok) {
        fetchCredentialsStatus();
        setFcmResult(null);
      }
    } catch (e) {
      console.error("Failed to delete credentials:", e);
    }
  };

  // Send Notification
  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      return;
    }

    setIsSending(true);
    setFcmResult(null);

    try {
      const res = await fetch("/api/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetType: "topic",
          topic: "all",
          title: title.trim(),
          body: message.trim(),
          imageUrl: imageUrl.trim(),
          replicateInData: true, // Matches send.php data replication
          androidPriority: "HIGH",
          androidChannelId: "default"
        })
      });

      const result = await res.json();
      
      // Format the result block nicely, matching PHP output
      const formattedResult = {
        http_code: res.status,
        curl_error: "",
        fcm_response: result.fcmResponse || result
      };

      setFcmResult(JSON.stringify(formattedResult, null, 4));
    } catch (err: any) {
      const errorResult = {
        http_code: 500,
        curl_error: err.message || "Failed to connect to backend",
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
    background: "linear-gradient(160deg, #0e1520 0%, #080c14 55%, #030508 100%)",
    boxShadow: "12px 0 40px -4px rgba(0,0,0,0.85)"
  };

  // Map category icons inside premium styled container wrappers
  function renderCategoryIcon(iconName: string, isActive: boolean) {
    const iconColor = isActive ? "text-[#E2FF00]" : "text-slate-300";
    const bgGlow = isActive ? "bg-[#E2FF00]/10 border border-[#E2FF00]/25 shadow-[0_0_8px_rgba(226,255,0,0.15)]" : "bg-white/5 border border-white/5";
    const iconWrapper = `p-2.5 rounded-xl ${bgGlow} transition-all duration-300 flex items-center justify-center shadow-inner`;
    
    switch (iconName) {
      case "ThumbsUp":
        return (
          <div className={iconWrapper}>
            <ThumbsUp className={`w-5.5 h-5.5 ${iconColor} transition-colors`} strokeWidth={1.8} />
          </div>
        );
      case "Calendar5":
        return (
          <div className={iconWrapper}>
            <div className="relative">
              <Calendar className={`w-5.5 h-5.5 ${iconColor} transition-colors`} strokeWidth={1.8} />
              <span className="absolute -bottom-1 -right-1.5 bg-[#E2FF00] text-black text-[7.5px] font-black px-1 py-0.5 rounded-sm shadow-[0_1px_3px_rgba(0,0,0,0.4)]">5+</span>
            </div>
          </div>
        );
      case "Calendar10":
        return (
          <div className={iconWrapper}>
            <div className="relative">
              <Calendar className={`w-5.5 h-5.5 ${iconColor} transition-colors`} strokeWidth={1.8} />
              <span className="absolute -bottom-1 -right-1.5 bg-[#E2FF00] text-black text-[7.5px] font-black px-1 py-0.5 rounded-sm shadow-[0_1px_3px_rgba(0,0,0,0.4)]">10+</span>
            </div>
          </div>
        );
      case "PlusMinus":
        return (
          <div className={iconWrapper}>
            <span className={`text-xs font-black tracking-tight ${iconColor} font-mono transition-colors`}>
              +/-
            </span>
          </div>
        );
      case "Wallet":
        return (
          <div className={iconWrapper}>
            <Layers className={`w-5.5 h-5.5 ${iconColor} transition-colors`} strokeWidth={1.8} />
          </div>
        );
      case "Tv":
        return (
          <div className={iconWrapper}>
            <Tv className={`w-5.5 h-5.5 ${iconColor} transition-colors`} strokeWidth={1.8} />
          </div>
        );
      case "Crown":
        return (
          <div className={isActive ? "p-2.5 rounded-xl bg-[#E2FF00]/15 border border-[#E2FF00]/30 shadow-[0_0_8px_rgba(226,255,0,0.2)] flex items-center justify-center" : "p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/15 flex items-center justify-center"}>
            <Crown className={`w-5.5 h-5.5 ${isActive ? "text-[#E2FF00]" : "text-amber-500/80"} transition-colors`} strokeWidth={1.8} />
          </div>
        );
      case "Target":
        return (
          <div className={isActive ? "p-2.5 rounded-xl bg-[#E2FF00]/15 border border-[#E2FF00]/30 shadow-[0_0_8px_rgba(226,255,0,0.2)] flex items-center justify-center" : "p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/15 flex items-center justify-center"}>
            <Target className={`w-5.5 h-5.5 ${isActive ? "text-[#E2FF00]" : "text-rose-500/80"} transition-colors`} strokeWidth={1.8} />
          </div>
        );
      case "Trophy":
        return (
          <div className={isActive ? "p-2.5 rounded-xl bg-[#E2FF00]/15 border border-[#E2FF00]/30 shadow-[0_0_8px_rgba(226,255,0,0.2)] flex items-center justify-center" : "p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/15 flex items-center justify-center"}>
            <Trophy className={`w-5.5 h-5.5 ${isActive ? "text-[#E2FF00]" : "text-emerald-500/80"} transition-colors`} strokeWidth={1.8} />
          </div>
        );
      case "Shuffle":
        return (
          <div className={isActive ? "p-2.5 rounded-xl bg-[#E2FF00]/15 border border-[#E2FF00]/30 shadow-[0_0_8px_rgba(226,255,0,0.2)] flex items-center justify-center" : "p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/15 flex items-center justify-center"}>
            <Shuffle className={`w-5.5 h-5.5 ${isActive ? "text-[#E2FF00]" : "text-cyan-500/80"} transition-colors`} strokeWidth={1.8} />
          </div>
        );
      case "Zap":
        return (
          <div className={iconWrapper}>
            <Zap className={`w-5.5 h-5.5 ${isActive ? "text-[#E2FF00]" : "text-[#E2FF00]/60"} transition-colors`} strokeWidth={1.8} />
          </div>
        );
      case "Timer":
        return (
          <div className={isActive ? "p-2.5 rounded-xl bg-[#E2FF00]/15 border border-[#E2FF00]/30 shadow-[0_0_8px_rgba(226,255,0,0.2)] flex items-center justify-center" : "p-2.5 rounded-xl bg-orange-500/10 border border-orange-500/15 flex items-center justify-center"}>
            <Timer className={`w-5.5 h-5.5 ${isActive ? "text-[#E2FF00]" : "text-orange-500/80"} transition-colors`} strokeWidth={1.8} />
          </div>
        );
      default:
        return (
          <div className={iconWrapper}>
            <Trophy className={`w-5.5 h-5.5 ${iconColor} transition-colors`} strokeWidth={1.8} />
          </div>
        );
    }
  }

  // Find active data to display tickets for
  const currentCategory: CategoryData | undefined = 
    toggleMode === "free"
      ? freeCategories.find(c => c.id === selectedFreeCat)
      : vipCategories.find(c => c.id === selectedVipCat);

  // Background style
  const backgroundStyle = activeTab === "correct_score" ? {
    backgroundImage: `linear-gradient(rgba(10, 15, 23, 0.72), rgba(10, 15, 23, 0.95)), url("https://i.ibb.co/NdsrmZx0/2d4e211d-777e-4801-bd34-cdb12a906b44.jpg")`,
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundAttachment: "fixed"
  } : {};

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#070b0f] text-slate-100 font-sans flex flex-col items-center justify-center relative overflow-hidden">
        {/* Elegant Header glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[240px] h-[150px] bg-[#E2FF00]/10 blur-[80px] pointer-events-none rounded-full" />
        <div className="flex flex-col items-center text-center space-y-4 select-none">
          <div className="w-12 h-12 rounded-2xl bg-[#E2FF00] flex items-center justify-center shadow-[0_0_20px_rgba(226,255,0,0.35)] animate-pulse">
            <Trophy className="w-7 h-7 text-black" strokeWidth={2.5} />
          </div>
          <h1 className="text-2xl font-black text-white tracking-widest uppercase font-sans">
            SURE<span className="text-[#E2FF00]">CHIPS</span>
          </h1>
          <RefreshCw className="w-5 h-5 animate-spin text-[#E2FF00]" />
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div 
        className="min-h-screen bg-[#070b0f] text-slate-100 font-sans flex flex-col items-center justify-center p-4 relative overflow-hidden"
        style={{
          backgroundImage: `linear-gradient(rgba(7, 11, 15, 0.88), rgba(7, 11, 15, 0.99)), url("https://i.ibb.co/NdsrmZx0/2d4e211d-777e-4801-bd34-cdb12a906b44.jpg")`,
          backgroundSize: "cover",
          backgroundPosition: "center"
        }}
      >
        {/* Dynamic visual ambient aura effects */}
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[50%] bg-[#E2FF00]/10 blur-[130px] rounded-full pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-emerald-500/5 blur-[120px] rounded-full pointer-events-none" />

        <motion.div
          initial={{ scale: 0.95, y: 12, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 100, damping: 15 }}
          className="w-full max-w-[365px] bg-slate-900/85 border border-white/10 rounded-3xl p-7 shadow-[0_30px_70px_rgba(0,0,0,0.85)] backdrop-blur-2xl space-y-6 relative z-10"
        >
          {/* Main Visual Logo and Accent Badge */}
          <div className="flex flex-col items-center text-center space-y-2 select-none">
            <div className="w-12 h-12 rounded-2xl bg-[#E2FF00] flex items-center justify-center shadow-[0_0_25px_rgba(226,255,0,0.4)] transform hover:rotate-6 transition-all duration-300">
              <Trophy className="w-6 h-6 text-black" strokeWidth={2.5} />
            </div>
            <h1 className="text-2xl font-black text-white tracking-widest uppercase mt-3 font-sans">
              SURE<span className="text-[#E2FF00]">CHIPS</span>
            </h1>
            <div className="px-3 py-1 rounded-full bg-slate-950/80 border border-white/10 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-[#E2FF00] rounded-full animate-ping" />
              <p className="text-[9px] font-mono text-slate-300 uppercase tracking-widest font-black">
                VIP Soccer Predictions
              </p>
            </div>
          </div>

          {/* Premium Sign-In Method Selector Tabs */}
          <div className="flex bg-slate-950/70 rounded-xl p-1 border border-white/5 relative">
            <button
              type="button"
              onClick={() => {
                setAuthMode("login");
                setAuthError(null);
              }}
              className={`flex-1 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                authMode === "login"
                  ? "bg-[#E2FF00] text-black shadow-[0_3px_12px_rgba(226,255,0,0.3)]"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              Log In
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode("register");
                setAuthError(null);
              }}
              className={`flex-1 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                authMode === "register"
                  ? "bg-[#E2FF00] text-black shadow-[0_3px_12px_rgba(226,255,0,0.3)]"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <User className="w-3.5 h-3.5" />
              Register
            </button>
          </div>

          {/* Interactive Secure Input Form */}
          <form onSubmit={handleAuth} className="space-y-4">
            {authMode === "register" && (
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1 pl-1">
                  Desired Username
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Winner2026"
                    value={authUsername}
                    onChange={(e) => setAuthUsername(e.target.value)}
                    className="w-full bg-slate-950/60 border border-white/10 hover:border-[#E2FF00]/30 rounded-xl py-3 pl-11 pr-4 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#E2FF00] focus:ring-1 focus:ring-[#E2FF00]/30 transition-all font-sans"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1 pl-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="email"
                  required
                  placeholder="e.g. mail@domain.com"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  className="w-full bg-slate-950/60 border border-white/10 hover:border-[#E2FF00]/30 rounded-xl py-3 pl-11 pr-4 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#E2FF00] focus:ring-1 focus:ring-[#E2FF00]/30 transition-all font-sans"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1 pl-1">
                Account Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  className="w-full bg-slate-950/60 border border-white/10 hover:border-[#E2FF00]/30 rounded-xl py-3 pl-11 pr-4 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#E2FF00] focus:ring-1 focus:ring-[#E2FF00]/30 transition-all font-sans"
                />
              </div>
            </div>

            {authError && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-[11px] text-rose-300 bg-rose-950/30 border border-rose-900/40 p-3 rounded-xl text-center leading-relaxed font-sans space-y-1"
              >
                <div className="font-bold uppercase tracking-wider text-[9px] text-rose-400">Security Alert</div>
                <div className="whitespace-pre-line">{authError}</div>
              </motion.div>
            )}

            <button
              type="submit"
              disabled={authSubmitting}
              className="w-full bg-[#E2FF00] hover:bg-[#d6f000] hover:scale-[1.01] active:scale-[0.99] disabled:bg-slate-800 disabled:text-slate-500 text-black py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 mt-4"
            >
              {authSubmitting ? (
                <RefreshCw className="w-4 h-4 animate-spin text-black" />
              ) : authMode === "login" ? (
                "Log In Account"
              ) : (
                "Create Account"
              )}
            </button>
          </form>

          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-white/10"></div>
            <span className="flex-shrink mx-4 text-slate-500 font-mono text-[9px] uppercase tracking-wider">Or</span>
            <div className="flex-grow border-t border-white/10"></div>
          </div>

          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={authSubmitting}
            className="w-full bg-slate-850 hover:bg-slate-800 border border-white/10 hover:scale-[1.01] active:scale-[0.99] disabled:bg-slate-800 disabled:text-slate-500 text-slate-100 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4 text-white" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6-4.53z"
              />
            </svg>
            Sign In with Google
          </button>

          {/* Support / Contact details */}
          <div className="pt-4 border-t border-white/5 text-center select-none text-slate-500 font-mono text-[8px] uppercase tracking-wider">
            Admin Contact: <span className="text-slate-400 font-bold">jilalamasanja1998@gmail.com</span>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div 
      style={backgroundStyle}
      className="min-h-screen bg-[#070b0f] text-slate-100 font-sans flex flex-col items-center justify-start selection:bg-yellow-500 selection:text-black pb-12 pt-14 relative overflow-x-hidden transition-all duration-500"
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
          background: #0d1f18;
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
          background: #0d1f18;
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
          background: #0d1f18;
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
          background: #0d1f18;
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
          background: #070b0f;
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
          background: #121921;
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
          background: #121921;
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
          background: #121921;
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
          background: #070b0f;
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
      <header className="fixed top-0 left-0 right-0 h-[54px] z-40 bg-gradient-to-r from-[#0a0e17] via-[#0e1420] to-[#0a0e17]/98 backdrop-blur-xl text-white px-4 flex items-center justify-between shadow-[0_4px_30px_rgba(0,0,0,0.5)] border-b border-white/10 select-none">
        {/* Glow Line underneath */}
        <div className="absolute bottom-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#E2FF00]/45 to-transparent opacity-80" />

        <div className="flex items-center gap-3">
          <button
            id="hamburger-btn"
            onClick={() => setIsDrawerOpen(true)}
            className="p-1.5 rounded-lg text-slate-300 hover:text-[#E2FF00] hover:bg-white/5 active:scale-95 transition-all duration-300 cursor-pointer"
            aria-label="Open navigation menu"
          >
            <Menu className="w-5.5 h-5.5" />
          </button>
          
          <span className="text-sm font-black tracking-[0.2em] font-sans uppercase text-white flex items-center gap-1.5">
            Negro Admin <span className="w-1.5 h-1.5 rounded-full bg-[#E2FF00] inline-block shadow-[0_0_8px_#E2FF00] animate-pulse" />
          </span>
        </div>

        <div className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border ${
          toggleMode === "free" 
            ? "bg-slate-500/10 border-slate-500/20 text-slate-400" 
            : "bg-yellow-500/10 border-[#E2FF00]/30 text-[#E2FF00] shadow-[0_0_10px_rgba(226,255,0,0.15)]"
        }`}>
          <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${
            toggleMode === "free" ? "bg-slate-400" : "bg-[#E2FF00]"
          }`} />
          <span className="text-[9px] font-mono font-bold uppercase tracking-wider">
            {toggleMode === "free" ? "FREE ACCESS" : (() => {
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
                <div className="h-[54px] px-4 flex items-center justify-between border-b border-white/10 bg-gradient-to-r from-[#0a0e17] via-[#0e1420] to-[#0a0e17]/98 relative select-none">
                  <span className="text-sm font-black tracking-[0.12em] uppercase bg-gradient-to-r from-white to-[#E2FF00] bg-clip-text text-transparent">Negro Suite</span>
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
                        setIsDrawerOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-xs font-bold border-l-4 cursor-pointer ${
                        activeTab === "correct_score"
                          ? "bg-gradient-to-r from-[#E2FF00] to-[#cbfa00] text-black shadow-[0_0_15px_rgba(226,255,0,0.3)] translate-x-1 font-extrabold border-white/60"
                          : "text-slate-300 hover:text-white hover:bg-white/5 hover:translate-x-1 border-transparent hover:border-[#E2FF00]/50"
                      }`}
                    >
                      <Trophy className="w-4 h-4 shrink-0" />
                      All Matches
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

                <div className="bg-slate-950/60 rounded-xl p-3 text-center border border-white/5 relative overflow-hidden shadow-inner">
                  <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] font-sans">
                    Console Engine
                  </p>
                  <div className="flex items-center justify-center gap-1.5 mt-1">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    <span className="text-[9px] text-[#E2FF00] font-mono font-bold uppercase tracking-wider">
                      v1.5.0 • Active
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <main className="w-full max-w-[480px] px-4 flex flex-col items-center z-10">

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
                        Today &amp; Onward Matches
                      </span>
                      <span className="text-[7px] font-black uppercase tracking-widest text-[#E2FF00] bg-[#E2FF00]/10 border border-[#E2FF00]/25 px-1.5 py-0.5 rounded ml-auto shadow-[0_1px_2px_rgba(0,0,0,0.3)]">
                        Active Fixtures
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      {(toggleMode === "free" ? freeCategories : vipCategories)
                        .filter((cat) => cat.id.includes("today"))
                        .map((cat) => {
                          const isActive = toggleMode === "free" ? selectedFreeCat === cat.id : selectedVipCat === cat.id;
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
                                  ? "border-[#E2FF00] bg-[#111921] shadow-[0_0_20px_rgba(226,255,0,0.25)] scale-[1.03]" 
                                  : "border-white/10 hover:border-white/18 hover:bg-slate-800/20 bg-gradient-to-b from-[#141b22] to-[#0a0e12]"
                              }`}
                            >
                              <span className="absolute top-1 right-1 text-[6px] font-black uppercase tracking-widest text-[#E2FF00]/90 bg-[#E2FF00]/10 border border-[#E2FF00]/20 px-1 py-0.2 rounded-sm">
                                TODAY
                              </span>

                              {isActive && (
                                <div className="absolute inset-0 bg-gradient-to-tr from-[#E2FF00]/5 to-transparent pointer-events-none" />
                              )}
                              
                              {renderCategoryIcon(cat.iconName, isActive)}
                              
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
                        Yesterday &amp; Before Results
                      </span>
                      <span className="text-[7px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 px-1.5 py-0.5 rounded ml-auto shadow-[0_1px_2px_rgba(0,0,0,0.3)]">
                        Finished
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      {(toggleMode === "free" ? freeCategories : vipCategories)
                        .filter((cat) => cat.id.includes("results"))
                        .map((cat) => {
                          const isActive = toggleMode === "free" ? selectedFreeCat === cat.id : selectedVipCat === cat.id;
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
                                  ? "border-emerald-500 bg-[#0e161c] shadow-[0_0_20px_rgba(16,185,129,0.25)] scale-[1.03]" 
                                  : "border-slate-800 hover:border-slate-700 hover:bg-slate-800/15 bg-gradient-to-b from-[#0e1318] to-[#070a0d] opacity-85 hover:opacity-100"
                              }`}
                            >
                              <span className="absolute top-1 right-1 text-[6px] font-black uppercase tracking-widest text-emerald-400/90 bg-emerald-500/10 border border-emerald-500/20 px-1 py-0.2 rounded-sm">
                                RESULTS
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
        ) : (
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
        )}

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
              backgroundImage: `linear-gradient(rgba(10, 15, 23, 0.72), rgba(10, 15, 23, 0.95)), url("https://i.ibb.co/NdsrmZx0/2d4e211d-777e-4801-bd34-cdb12a906b44.jpg")`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              backgroundAttachment: "fixed"
            }}
            className="fixed inset-0 z-50 bg-[#070b0f] overflow-y-auto flex flex-col items-center pb-12 pt-[68px]"
          >
            {/* APK Fixed Header with Back Arrow on Left Edge */}
            <div className="fixed top-0 left-0 right-0 h-[54px] bg-gradient-to-r from-[#0a0e17] via-[#0e1420] to-[#0a0e17]/98 backdrop-blur-xl text-white px-4 flex items-center justify-between border-b border-white/10 select-none shadow-[0_4px_30px_rgba(0,0,0,0.5)] z-50">
              {/* Glow Line underneath */}
              <div className="absolute bottom-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#E2FF00]/45 to-transparent opacity-80" />

              <div className="flex items-center gap-3">
                <button
                  id="apk-back-btn"
                  onClick={() => setOpenedCategoryId(null)}
                  className="p-1.5 rounded-lg text-slate-300 hover:text-[#E2FF00] hover:bg-white/5 active:scale-95 transition-all duration-300 cursor-pointer flex items-center justify-center"
                  aria-label="Go back"
                >
                  <ArrowLeft className="w-5.5 h-5.5" />
                </button>
                <span className="text-sm font-black tracking-wider uppercase text-white font-sans">
                  {activeCategory.title}
                </span>
              </div>
              <div className="flex items-center gap-1.5 bg-[#E2FF00]/10 px-2.5 py-1 rounded-full border border-[#E2FF00]/20">
                <div className="w-1.5 h-1.5 rounded-full bg-[#E2FF00] animate-pulse" />
                <span className="text-[8px] font-mono font-bold uppercase tracking-wider text-[#E2FF00]">Active Tips</span>
              </div>
            </div>

            {/* Ticket List Body */}
            <div className="w-full max-w-[480px] px-4 flex flex-col items-center gap-0 mt-4">
              {activeCategory.id.startsWith("vip_") && activeCategory.id.includes("today") && !isMainAdmin ? (
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
                    </div>
                  );
                })()
              ) : (
                // NORMAL TICKETS / FREE TIPS / EXPIRED VIP MATCH LIST
                <>
                  <div className="w-full max-w-[350px] px-2 mb-3 flex items-center justify-between">
                    <span className="text-[10px] font-mono font-black uppercase tracking-wider text-[#E2FF00] bg-black/45 px-2.5 py-1 rounded-md border border-white/5">
                      Category: {activeCategory.title}
                    </span>
                    <span className="text-[10px] font-mono font-bold text-slate-400">
                      {activeCategory.tickets.length} Tickets Active
                    </span>
                  </div>

                  {isMainAdmin && (
                    <div className="w-full max-w-[350px] mb-4 bg-gradient-to-r from-emerald-950/40 to-slate-900/50 border border-emerald-500/20 rounded-2xl p-4 flex flex-col gap-2.5 relative overflow-hidden shadow-xl text-left">
                      <div className="absolute -right-6 -bottom-6 w-20 h-20 bg-emerald-500/5 rounded-full blur-xl pointer-events-none" />
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">🇹🇿</span>
                          <div className="flex flex-col">
                            <span className="text-[10px] font-black uppercase tracking-widest text-[#E2FF00]">Dar es Salaam Admin</span>
                            <span className="text-[9px] font-mono text-slate-400">Tanzania (East Africa Time - EAT)</span>
                          </div>
                        </div>
                        <span className="text-[9px] font-mono font-bold bg-[#E2FF00]/10 border border-[#E2FF00]/20 px-2 py-0.5 rounded-full text-[#E2FF00] shrink-0">
                          ONLINE
                        </span>
                      </div>
                      
                      <button
                        onClick={() => {
                          setUploadCategory(activeCategory.id);
                          setUploadDate(new Date().toISOString().split("T")[0]);
                          setUploadTime("");
                          setUploadHome("");
                          setUploadAway("");
                          setUploadScore("");
                          setUploadOdds("");
                          setUploadStatus("pending");
                          setShowUploadForm(true);
                        }}
                        className="w-full bg-[#E2FF00] hover:bg-[#c2db00] text-black font-extrabold text-[10.5px] py-2.5 rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer shadow-lg uppercase tracking-wider font-sans"
                      >
                        <Plus className="w-4 h-4" strokeWidth={3} />
                        Upload Match Selection
                      </button>
                    </div>
                  )}

                  {isMainAdmin && (
                    <div className="w-full max-w-[350px] mb-4 bg-slate-950/60 p-4 border border-white/10 rounded-2xl flex flex-col gap-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-300 flex items-center gap-1.5">
                          <PlusCircle className="w-4.5 h-4.5 text-[#E2FF00]" />
                          Create Ticket Group (Date)
                        </span>
                        <button
                          onClick={() => setShowAddTicket(!showAddTicket)}
                          className="text-[10px] font-bold text-[#E2FF00] hover:underline cursor-pointer"
                        >
                          {showAddTicket ? "Cancel" : "Add Date"}
                        </button>
                      </div>

                      {showAddTicket && (
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="e.g. 25 JUNE 2026 or TODAY MATCHES"
                            value={newTicketDate}
                            onChange={(e) => setNewTicketDate(e.target.value)}
                            className="flex-1 bg-slate-900 border border-white/10 rounded-xl py-1.5 px-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#E2FF00]/50"
                          />
                          <button
                            onClick={() => addTicketGroup(activeCategory.id)}
                            className="bg-[#E2FF00] text-black font-extrabold px-3 rounded-xl text-xs uppercase tracking-wide cursor-pointer"
                          >
                            Create
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {activeCategory.tickets.length === 0 && (
                    <div className="w-full max-w-[350px] bg-slate-900/40 border border-dashed border-white/10 rounded-2xl py-12 px-6 text-center text-slate-400 space-y-2.5 select-none mb-4">
                      <div className="w-10 h-10 rounded-full bg-slate-950 flex items-center justify-center mx-auto border border-white/5">
                        <Trophy className="w-5 h-5 text-slate-600 animate-pulse" />
                      </div>
                      <p className="font-sans font-bold text-xs uppercase tracking-wider text-slate-300">No Active Tickets</p>
                      <p className="text-[10px] text-slate-500 leading-relaxed font-mono">
                        {isMainAdmin 
                          ? "Use the 'Create Ticket Group' button above to add a betting group/date." 
                          : "Please check back later! Our analysts are preparing the highest accuracy selections."}
                      </p>
                    </div>
                  )}

                  {activeCategory.tickets.map((ticket, index) => {
                    const isVip = activeCategory.id.startsWith("vip_");

                    if (isVip) {
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
                              {ticket.matches.map((match, mIdx) => (
                                <React.Fragment key={mIdx}>
                                  <div className="vip-match-row relative group/row">
                                    <div className="vip-num">{match.num}</div>
                                    <div className="vip-match-info">
                                      <div className="vip-match-name">{match.home} vs {match.away}</div>
                                      <div className="vip-pick flex items-center gap-1.5 flex-wrap">
                                        <span>{formatTip(match.score)}</span>
                                        {match.time && (
                                          <span className="text-[8px] font-mono opacity-80 bg-white/5 border border-white/10 px-1.5 py-0.5 rounded text-slate-300">
                                            🕒 {match.time} EAT
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    <div className="result-group flex items-center gap-1.5">          
                                      {renderMatchStatusBadge(match.status || getMatchStatus(ticket.date, mIdx, index))}
                                      <span className="vip-odds">{match.odds}</span>
                                    </div>

                                    {isMainAdmin && (
                                      <div className="flex items-center gap-1 ml-2 pl-1.5 border-l border-white/10 shrink-0">
                                        <button 
                                          onClick={() => startEditMatch(activeCategory.id, index, mIdx, match)}
                                          className="p-1 rounded bg-[#E2FF00]/10 hover:bg-[#E2FF00]/20 text-[#E2FF00] transition-all cursor-pointer"
                                          title="Edit Match"
                                        >
                                          <Edit3 className="w-3.5 h-3.5" />
                                        </button>
                                        <button 
                                          onClick={() => deleteMatch(activeCategory.id, index, mIdx)}
                                          className="p-1 rounded bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-all cursor-pointer"
                                          title="Delete Match"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                  {mIdx < ticket.matches.length - 1 && <hr className="vip-row-sep" />}
                                </React.Fragment>
                              ))}
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
                    }

                    return (
                      <div key={index} className="ticket-wrap w-full max-w-[350px] mb-2">
                        <span className="tear tear-top"></span>
                        <div className="ticket bg-slate-900/95 border-x border-white/5 py-2.5 px-3 rounded-xl flex flex-col">

                          {/* DATE HERO */}
                          <div className="date-hero">
                            <span className="date-big">{ticket.date}</span>
                          </div>

                          {/* Perforation */}
                          <div className="perf yellow">
                            <hr className="perf-line" />
                          </div>

                          {/* Matches List */}
                          <div className="matches flex flex-col gap-1.5">
                            {ticket.matches.map((match, mIdx) => (
                              <React.Fragment key={mIdx}>
                                <div className="match-row flex items-center justify-between gap-2.5 py-1 relative group/row">
                                  <div className="num font-mono text-xs font-bold text-slate-400 bg-slate-800/40 w-5 h-5 flex items-center justify-center rounded">{match.num}</div>
                                  <div className="match-info flex-1 min-w-0">
                                    <div className="match-name text-xs font-black text-white truncate font-sans uppercase tracking-wide">{match.home} vs {match.away}</div>
                                    <div className="pick flex items-center gap-1.5 flex-wrap">
                                      <span>{formatTip(match.score)}</span>
                                      {match.time && (
                                        <span className="text-[8px] font-mono opacity-80 bg-white/5 border border-white/10 px-1.5 py-0.5 rounded text-slate-300">
                                          🕒 {match.time} EAT
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  <div className="result-group flex items-center gap-2">          
                                    {renderMatchStatusBadge(match.status || getMatchStatus(ticket.date, mIdx, index))}
                                    <span className="odds font-mono text-xs font-bold text-[#E2FF00] border border-[#E2FF00]/30 rounded-full px-1.5 py-0.5 bg-[#E2FF00]/5">{match.odds}</span>
                                  </div>

                                  {isMainAdmin && (
                                    <div className="flex items-center gap-1 ml-2 pl-1.5 border-l border-white/10 shrink-0">
                                      <button 
                                        onClick={() => startEditMatch(activeCategory.id, index, mIdx, match)}
                                        className="p-1 rounded bg-[#E2FF00]/10 hover:bg-[#E2FF00]/20 text-[#E2FF00] transition-all cursor-pointer"
                                        title="Edit Match"
                                      >
                                        <Edit3 className="w-3.5 h-3.5" />
                                      </button>
                                      <button 
                                        onClick={() => deleteMatch(activeCategory.id, index, mIdx)}
                                        className="p-1 rounded bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-all cursor-pointer"
                                        title="Delete Match"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  )}
                                </div>
                                {mIdx < ticket.matches.length - 1 && <hr className="row-sep border-white/5" />}
                              </React.Fragment>
                            ))}
                          </div>

                          {isMainAdmin && (
                            <div className="mt-3.5 pt-3 border-t border-white/5 flex items-center justify-between gap-2.5">
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
                        <span className="tear tear-bottom"></span>
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
