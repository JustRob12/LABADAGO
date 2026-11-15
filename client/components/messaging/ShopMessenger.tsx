"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  ShopMessage,
  ShopConversation,
  UserProfile,
  LaundryShop,
} from "@/types/auth";
import {
  sendShopMessage,
  getShopMessages,
  getShopConversations,
  getCustomerConversations,
  markShopMessagesAsRead,
} from "@/lib/supabase/auth";
import {
  MessageSquare,
  Send,
  Search,
  Phone,
  Clock,
  CheckCheck,
  Check,
  Store,
  User,
  Users,
  ChevronLeft,
  Loader2,
  Sparkles,
  Building2,
  RefreshCw,
  X,
  MessageCircle,
} from "lucide-react";

interface ShopMessengerProps {
  mode: "owner" | "staff" | "customer";
  currentUser: UserProfile;
  assignedShop?: LaundryShop | null; // For staff mode
  shops?: LaundryShop[]; // For owner mode
  initialShopId?: string; // If customer opened from a specific shop
  initialCustomerId?: string; // If owner opened from a specific customer
}

// Preset quick inquiry templates
const STAFF_QUICK_RESPONSES = [
  "Yes, we are open and machines are ready for drop-off!",
  "Our current turnaround time is around 2 to 3 hours.",
  "Yes! We accept comforters and heavy blankets today.",
  "Your laundry is ready for pickup at our counter!",
];

const CUSTOMER_QUICK_INQUIRIES = [
  "Hi! Is there currently a queue at your branch?",
  "Do you accept comforter/blanket washing today?",
  "What is the estimated turnaround time right now?",
  "What time are you open until today?",
];

function formatTime(isoString: string): string {
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  } catch {
    return "";
  }
}

function formatDateHeader(isoString: string): string {
  try {
    const d = new Date(isoString);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) return "Today";
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
    return d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: d.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
    });
  } catch {
    return "";
  }
}

export const ShopMessenger: React.FC<ShopMessengerProps> = ({
  mode,
  currentUser,
  assignedShop,
  shops = [],
  initialShopId,
  initialCustomerId,
}) => {
  const [conversations, setConversations] = useState<ShopConversation[]>([]);
  const [selectedConversation, setSelectedConversation] =
    useState<ShopConversation | null>(null);
  const [messages, setMessages] = useState<ShopMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [shopFilter, setShopFilter] = useState<string>("all");
  const [isLoadingThreads, setIsLoadingThreads] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [mobileShowChat, setMobileShowChat] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Active target shop (for staff, owner, or customer)
  const effectiveShopId =
    mode === "staff"
      ? assignedShop?.id
      : shopFilter !== "all"
      ? shopFilter
      : undefined;

  // Load conversation threads
  const loadConversations = useCallback(
    async (selectFirst = false) => {
      try {
        let threads: ShopConversation[] = [];

        if (mode === "customer") {
          threads = await getCustomerConversations(currentUser.id);
        } else if (mode === "staff") {
          if (assignedShop?.id) {
            threads = await getShopConversations(assignedShop.id);
          }
        } else {
          // Owner mode
          threads = await getShopConversations(
            effectiveShopId,
            currentUser.id
          );
        }

        // If customer just opened chat from a specific shop that has no prior messages yet
        if (mode === "customer" && initialShopId && !threads.some((t) => t.shop_id === initialShopId)) {
          const targetShop = shops.find((s) => s.id === initialShopId) || assignedShop;
          if (targetShop) {
            threads.unshift({
              shop_id: targetShop.id,
              shop_name: targetShop.name,
              customer_id: currentUser.id,
              customer_name: currentUser.full_name,
              customer_phone: currentUser.phone_number,
              last_message: "Start a conversation with " + targetShop.name,
              last_message_at: new Date().toISOString(),
              last_sender_name: targetShop.name,
              last_sender_role: "staff",
              unread_count: 0,
            });
          }
        }

        setConversations(threads);

        // Auto-select initial conversation or first thread
        if (selectFirst && threads.length > 0) {
          if (initialShopId) {
            const match = threads.find((t) => t.shop_id === initialShopId);
            if (match) {
              setSelectedConversation(match);
              setMobileShowChat(true);
              return;
            }
          }
          if (initialCustomerId) {
            const match = threads.find((t) => t.customer_id === initialCustomerId);
            if (match) {
              setSelectedConversation(match);
              setMobileShowChat(true);
              return;
            }
          }
          setSelectedConversation(threads[0]);
        }
      } catch (err) {
        console.error("Failed to load conversations:", err);
      } finally {
        setIsLoadingThreads(false);
      }
    },
    [mode, currentUser.id, currentUser.full_name, currentUser.phone_number, assignedShop, shops, effectiveShopId, initialShopId, initialCustomerId]
  );

  // Initial load
  useEffect(() => {
    setIsLoadingThreads(true);
    loadConversations(true);
  }, [loadConversations]);

  // Load messages for currently selected conversation
  const loadMessagesForSelected = useCallback(
    async (isBackgroundPoll = false) => {
      if (!selectedConversation) {
        setMessages([]);
        return;
      }

      if (!isBackgroundPoll) {
        setIsLoadingMessages(true);
      }

      try {
        const msgs = await getShopMessages(
          selectedConversation.shop_id,
          selectedConversation.customer_id
        );
        setMessages(msgs);

        // Mark incoming messages as read
        const readerRole = mode === "customer" ? "customer" : mode === "staff" ? "staff" : "owner";
        await markShopMessagesAsRead(
          selectedConversation.shop_id,
          selectedConversation.customer_id,
          readerRole
        );
      } catch (err) {
        console.error("Failed to load messages:", err);
      } finally {
        if (!isBackgroundPoll) {
          setIsLoadingMessages(false);
        }
      }
    },
    [selectedConversation, mode]
  );

  // Refresh messages when selected conversation changes
  useEffect(() => {
    loadMessagesForSelected(false);
  }, [loadMessagesForSelected]);

  // Periodic polling for live chat updates every 3.5 seconds
  useEffect(() => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);

    pollIntervalRef.current = setInterval(() => {
      if (selectedConversation) {
        loadMessagesForSelected(true);
      }
      loadConversations(false);
    }, 3500);

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [selectedConversation, loadMessagesForSelected, loadConversations]);

  // Auto scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Send message handler
  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend ?? inputText).trim();
    if (!text || !selectedConversation || isSending) return;

    setIsSending(true);
    setInputText("");

    const senderRole = mode === "customer" ? "customer" : mode === "staff" ? "staff" : "owner";
    const senderName =
      mode === "customer"
        ? currentUser.full_name
        : mode === "staff"
        ? `${currentUser.full_name} (${assignedShop?.name || "Staff"})`
        : `${currentUser.full_name} (Owner)`;

    try {
      const res = await sendShopMessage({
        shopId: selectedConversation.shop_id,
        shopName: selectedConversation.shop_name,
        customerId: selectedConversation.customer_id,
        customerName: selectedConversation.customer_name,
        customerPhone: selectedConversation.customer_phone,
        senderId: currentUser.id,
        senderName: senderName,
        senderRole: senderRole,
        message: text,
      });

      if (res.success && res.data) {
        setMessages((prev) => [...prev, res.data!]);
        // Update thread snippet
        setConversations((prev) =>
          prev.map((c) =>
            c.shop_id === selectedConversation.shop_id &&
            c.customer_id === selectedConversation.customer_id
              ? {
                  ...c,
                  last_message: text,
                  last_message_at: res.data!.created_at,
                  last_sender_name: senderName,
                  last_sender_role: senderRole,
                }
              : c
          )
        );
      }
    } catch (err) {
      console.error("Error sending message:", err);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Filter conversations by search query
  const filteredConversations = conversations.filter((c) => {
    const query = searchQuery.toLowerCase();
    const matchName =
      mode === "customer"
        ? c.shop_name.toLowerCase().includes(query)
        : c.customer_name.toLowerCase().includes(query);
    const matchMsg = c.last_message.toLowerCase().includes(query);
    return matchName || matchMsg;
  });

  return (
    <div className="w-full bg-white border border-slate-200 rounded-3xl shadow-xs overflow-hidden flex flex-col md:flex-row h-[740px] max-h-[85vh]">
      {/* ===================================================================== */}
      {/* LEFT COLUMN: CONVERSATION THREADS LIST                                */}
      {/* ===================================================================== */}
      <div
        className={`w-full md:w-80 lg:w-96 border-r border-slate-200 flex flex-col bg-slate-50/60 shrink-0 ${
          mobileShowChat ? "hidden md:flex" : "flex"
        }`}
      >
        {/* Thread List Header */}
        <div className="p-4 border-b border-slate-200 bg-white space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                <MessageSquare size={17} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 tracking-tight">
                  {mode === "customer" ? "Shop Inquiries" : "Customer Messages"}
                </h3>
                <p className="text-[11px] text-slate-500 font-medium">
                  {conversations.length} active conversation
                  {conversations.length !== 1 ? "s" : ""}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => loadConversations(false)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              title="Refresh messages"
            >
              <RefreshCw size={15} />
            </button>
          </div>

          {/* Owner Shop Filter (if owner has multiple registered branches) */}
          {mode === "owner" && shops.length > 1 && (
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Branch Filter
              </label>
              <select
                value={shopFilter}
                onChange={(e) => setShopFilter(e.target.value)}
                className="w-full text-xs py-1.5 px-2.5 rounded-xl border border-slate-200 bg-white font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="all">All Registered Branches ({shops.length})</option>
                {shops.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Search Input */}
          <div className="relative">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                mode === "customer"
                  ? "Search by laundry shop..."
                  : "Search customer name or message..."
              }
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:border-blue-500 transition-all text-slate-800 placeholder:text-slate-400"
            />
          </div>
        </div>

        {/* Conversation List Scroll Area */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2 space-y-1">
          {isLoadingThreads ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400">
              <Loader2 className="animate-spin text-blue-600" size={24} />
              <p className="text-xs">Loading conversations...</p>
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="py-12 px-4 text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <MessageCircle size={22} />
              </div>
              <h4 className="text-xs font-bold text-slate-700">No Messages Found</h4>
              <p className="text-[11px] text-slate-400 max-w-xs mx-auto leading-relaxed">
                {mode === "customer"
                  ? "You haven't messaged any laundry shops yet. Inquire directly on any shop's service view!"
                  : "No customer inquiries recorded yet. When customers ask about queue status or turnaround, they appear here."}
              </p>
            </div>
          ) : (
            filteredConversations.map((thread) => {
              const isSelected =
                selectedConversation?.shop_id === thread.shop_id &&
                selectedConversation?.customer_id === thread.customer_id;

              const displayName =
                mode === "customer" ? thread.shop_name : thread.customer_name;
              const initial = displayName.charAt(0).toUpperCase();

              return (
                <button
                  key={`${thread.shop_id}-${thread.customer_id}`}
                  type="button"
                  onClick={() => {
                    setSelectedConversation(thread);
                    setMobileShowChat(true);
                  }}
                  className={`w-full text-left p-3 rounded-2xl transition-all cursor-pointer flex items-start gap-3 ${
                    isSelected
                      ? "bg-blue-50/90 border border-blue-200 shadow-2xs"
                      : "hover:bg-white border border-transparent"
                  }`}
                >
                  {/* Avatar */}
                  <div className="relative shrink-0">
                    <div
                      className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-sm shadow-2xs ${
                        mode === "customer"
                          ? "bg-blue-600 text-white"
                          : "bg-teal-600 text-white"
                      }`}
                    >
                      {initial}
                    </div>
                    {thread.unread_count > 0 && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white text-[9px] font-bold text-white rounded-full flex items-center justify-center animate-pulse">
                        {thread.unread_count}
                      </span>
                    )}
                  </div>

                  {/* Thread Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <h4
                        className={`text-xs truncate ${
                          thread.unread_count > 0
                            ? "font-extrabold text-slate-900"
                            : "font-semibold text-slate-800"
                        }`}
                      >
                        {displayName}
                      </h4>
                      <span className="text-[10px] text-slate-400 shrink-0 font-medium">
                        {formatTime(thread.last_message_at)}
                      </span>
                    </div>

                    {mode !== "customer" && thread.shop_name && (
                      <div className="flex items-center gap-1 text-[10px] text-blue-600 font-semibold mb-1 truncate">
                        <Store size={11} className="shrink-0" />
                        <span className="truncate">{thread.shop_name}</span>
                      </div>
                    )}

                    <p
                      className={`text-[11px] truncate ${
                        thread.unread_count > 0
                          ? "text-slate-900 font-bold"
                          : "text-slate-500"
                      }`}
                    >
                      {thread.last_sender_role !== "customer" && mode !== "customer"
                        ? "You: "
                        : ""}
                      {thread.last_message}
                    </p>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* ===================================================================== */}
      {/* RIGHT COLUMN: ACTIVE CHAT WINDOW                                      */}
      {/* ===================================================================== */}
      <div
        className={`flex-1 flex flex-col bg-white h-full ${
          !mobileShowChat ? "hidden md:flex" : "flex"
        }`}
      >
        {selectedConversation ? (
          <>
            {/* Active Chat Header */}
            <div className="px-4 py-3 border-b border-slate-200 bg-white flex items-center justify-between gap-3 shadow-2xs">
              <div className="flex items-center gap-2.5 min-w-0">
                {/* Mobile back to conversation list button */}
                <button
                  type="button"
                  onClick={() => setMobileShowChat(false)}
                  className="md:hidden p-1.5 -ml-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl"
                  title="Back to conversations"
                >
                  <ChevronLeft size={20} />
                </button>

                <div
                  className={`w-9 h-9 rounded-2xl flex items-center justify-center font-bold text-sm shadow-2xs shrink-0 ${
                    mode === "customer"
                      ? "bg-blue-600 text-white"
                      : "bg-teal-600 text-white"
                  }`}
                >
                  {(mode === "customer"
                    ? selectedConversation.shop_name
                    : selectedConversation.customer_name
                  )
                    .charAt(0)
                    .toUpperCase()}
                </div>

                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-slate-900 truncate">
                    {mode === "customer"
                      ? selectedConversation.shop_name
                      : selectedConversation.customer_name}
                  </h3>
                  <div className="flex items-center gap-2 text-[10px] text-slate-500">
                    {mode === "customer" ? (
                      <span className="flex items-center gap-1 font-semibold text-emerald-600">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                        Counter Active
                      </span>
                    ) : (
                      <span>
                        Customer Inquiry • {selectedConversation.customer_phone || "Contact"}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Direct Calling Quick Action */}
              {selectedConversation.customer_phone && mode !== "customer" && (
                <a
                  href={`tel:${selectedConversation.customer_phone}`}
                  className="px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 text-xs font-bold flex items-center gap-1.5 transition-colors shrink-0"
                >
                  <Phone size={13} />
                  <span className="hidden sm:inline">Call Customer</span>
                </a>
              )}
            </div>

            {/* Message Stream */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gradient-to-b from-slate-50/50 to-white">
              {isLoadingMessages ? (
                <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400">
                  <Loader2 className="animate-spin text-blue-600" size={24} />
                  <p className="text-xs">Loading message history...</p>
                </div>
              ) : messages.length === 0 ? (
                <div className="py-16 text-center space-y-2">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
                    <Sparkles size={22} />
                  </div>
                  <h4 className="text-xs font-bold text-slate-800">Start the Conversation</h4>
                  <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                    Type a message below or pick a quick inquiry to get in touch.
                  </p>
                </div>
              ) : (
                messages.map((msg, index) => {
                  const isViewer =
                    msg.sender_id === currentUser.id ||
                    (mode !== "customer" && msg.sender_role !== "customer") ||
                    (mode === "customer" && msg.sender_role === "customer");

                  const showDate =
                    index === 0 ||
                    formatDateHeader(messages[index - 1].created_at) !==
                      formatDateHeader(msg.created_at);

                  return (
                    <React.Fragment key={msg.id}>
                      {showDate && (
                        <div className="flex items-center justify-center my-3">
                          <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">
                            {formatDateHeader(msg.created_at)}
                          </span>
                        </div>
                      )}

                      <div
                        className={`flex flex-col ${
                          isViewer ? "items-end" : "items-start"
                        }`}
                      >
                        {/* Sender Label for Received Messages */}
                        {!isViewer && (
                          <span className="text-[10px] text-slate-500 font-semibold mb-1 ml-1 flex items-center gap-1">
                            {msg.sender_role !== "customer" ? (
                              <Store size={10} className="text-blue-600" />
                            ) : (
                              <User size={10} className="text-teal-600" />
                            )}
                            {msg.sender_name}
                          </span>
                        )}

                        {/* Message Bubble */}
                        <div
                          className={`p-3 rounded-2xl text-xs max-w-[82%] sm:max-w-[70%] leading-relaxed ${
                            isViewer
                              ? "bg-blue-600 text-white rounded-tr-xs shadow-2xs"
                              : "bg-slate-100 text-slate-900 rounded-tl-xs border border-slate-200/80"
                          }`}
                        >
                          <p className="whitespace-pre-wrap break-words">{msg.message}</p>
                        </div>

                        {/* Timestamp & Read Indicator */}
                        <div
                          className={`flex items-center gap-1 mt-1 text-[9px] text-slate-400 ${
                            isViewer ? "mr-1" : "ml-1"
                          }`}
                        >
                          <span>{formatTime(msg.created_at)}</span>
                          {isViewer && (
                            msg.is_read ? (
                              <CheckCheck size={12} className="text-blue-500" />
                            ) : (
                              <Check size={12} />
                            )
                          )}
                        </div>
                      </div>
                    </React.Fragment>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Inquiry / Response Presets */}
            <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1">
                Quick:
              </span>
              {(mode === "customer"
                ? CUSTOMER_QUICK_INQUIRIES
                : STAFF_QUICK_RESPONSES
              ).map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSendMessage(preset)}
                  disabled={isSending}
                  className="px-2.5 py-1 rounded-xl text-[11px] bg-white hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 border border-slate-200 text-slate-600 font-medium transition-colors shrink-0 shadow-2xs cursor-pointer disabled:opacity-50"
                >
                  {preset}
                </button>
              ))}
            </div>

            {/* Chat Input Bar */}
            <div className="p-3 border-t border-slate-200 bg-white">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={`Type a message to ${
                    mode === "customer"
                      ? selectedConversation.shop_name
                      : selectedConversation.customer_name
                  }...`}
                  className="flex-1 text-xs py-2.5 px-3.5 rounded-2xl bg-slate-50 border border-slate-200 focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-slate-900 transition-all placeholder:text-slate-400"
                />

                <button
                  type="button"
                  onClick={() => handleSendMessage()}
                  disabled={!inputText.trim() || isSending}
                  className="px-4 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer shrink-0"
                >
                  {isSending ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Send size={14} />
                  )}
                  <span className="hidden sm:inline">Send</span>
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-3 text-slate-400">
            <div className="w-14 h-14 rounded-3xl bg-slate-100 text-slate-400 flex items-center justify-center">
              <MessageSquare size={28} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-700">No Chat Selected</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
                Choose a conversation from the left to read inquiries and send replies.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
