"use client";
import React, { useRef, useState } from "react";
import Navbar from "@/app/components/Navbar";
import { useParams } from "next/navigation";

export default function VaultPage() {
  const { vaultId } = useParams();
  type File = { id: string; name: string; url: string };
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [activeTab, setActiveTab] = useState<"chat" | "notes" | "maps">("chat");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Dummy chat and notes state
  const [chatMessages, setChatMessages] = useState([
    { sender: "ai", text: "Welcome! Ask me anything about your vault." },
  ]);
  const [notes, setNotes] = useState([
    "Summary and key points from your uploaded documents will appear here.",
  ]);
  const [userInput, setUserInput] = useState("");

  // Paste source as text state
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [pastedText, setPastedText] = useState("");
  const [pasteError, setPasteError] = useState("");

  React.useEffect(() => {
    fetch("/api/source")
      .then((res) => res.json())
      .then((data) => setUploadedFiles(data || []))
      .catch(() => setUploadedFiles([]));
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const formData = new FormData();
      Object.values(e.target.files).forEach((file) => {
        formData.append("file", file);
      });

      //formData.append("vaultId", vaultId as string);

      const response = await fetch(`/api/source/?vaultId=${vaultId}`, {
        method: "POST",
        body: formData,
      });

      const result = await response.json();
      console.log("Upload result:", result);
      if (result.success == true) {
        alert("Upload ok : " + result.name);
        setUploadedFiles([...uploadedFiles, result]);
      } else {
        alert("Upload failed");
      }
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInput.trim()) return;

    // Add user message to chat
    const userMessage = { sender: "user", text: userInput };
    setChatMessages((prev) => [...prev, userMessage]);

    // Clear input
    setUserInput("");

    try {
      const response = await fetch(`/api/chat/?vaultId=${vaultId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userInput }),
      });

      const result = await response.json();
      if (result.success) {
        // Add AI response to chat
        setChatMessages((prev) => [
          ...prev,
          { sender: "ai", text: result.answer },
        ]);
      } else {
        // Handle error
        setChatMessages((prev) => [
          ...prev,
          {
            sender: "ai",
            text: "Sorry, I encountered an error processing your request.",
          },
        ]);
      }
    } catch (error) {
      console.error("Chat error:", error);
      setChatMessages((prev) => [
        ...prev,
        {
          sender: "ai",
          text: "Sorry, I encountered an error processing your request.",
        },
      ]);
    }
  };

  const handlePasteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pastedText.trim()) {
      setPasteError("Text is required.");
      return;
    }
    setPasteError("");
    const response = await fetch(`/api/source/?vaultId=${vaultId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: pastedText }),
    });
    const result = await response.json();
    if (result.success) {
      alert("Text source saved: " + result.name);
      setUploadedFiles([...uploadedFiles, result]);
      setShowPasteModal(false);
      setPastedText("");
    } else {
      setPasteError(result.error || "Failed to save text source.");
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-6">
          Vault #{vaultId}
        </h1>
        {/* Upload Section */}
        <section className="mb-10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Upload Documents
            </h2>
            <div className="flex gap-2">
              <button
                className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-2 rounded-full font-semibold hover:from-blue-600 hover:to-purple-700 transition-all shadow"
                onClick={handleUploadClick}
              >
                Upload Files
              </button>
              <button
                className="bg-gradient-to-r from-purple-500 to-blue-600 text-white px-6 py-2 rounded-full font-semibold hover:from-purple-600 hover:to-blue-700 transition-all shadow"
                onClick={() => setShowPasteModal(true)}
              >
                Paste Source as Text
              </button>
            </div>
            <input
              type="file"
              multiple
              ref={fileInputRef}
              className="hidden"
              onChange={handleFileChange}
              name="file"
            />
          </div>
          {uploadedFiles.length > 0 && (
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 flex flex-wrap gap-3">
              {uploadedFiles.map((file, idx) => (
                <div
                  key={idx}
                  className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 rounded text-blue-700 dark:text-blue-200 text-sm"
                >
                  {file.name}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Tabs for Chat and Notes */}
        <div className="flex gap-4 mb-6 border-b border-gray-200 dark:border-gray-800">
          <button
            className={`px-6 py-2 font-semibold rounded-t-lg focus:outline-none transition-all ${
              activeTab === "chat"
                ? "bg-white dark:bg-gray-900 border-x border-t border-b-0 border-gray-200 dark:border-gray-800 text-blue-600 dark:text-blue-400"
                : "text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400"
            }`}
            onClick={() => setActiveTab("chat")}
          >
            Chat
          </button>
          <button
            className={`px-6 py-2 font-semibold rounded-t-lg focus:outline-none transition-all ${
              activeTab === "notes"
                ? "bg-white dark:bg-gray-900 border-x border-t border-b-0 border-gray-200 dark:border-gray-800 text-purple-600 dark:text-purple-400"
                : "text-gray-600 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400"
            }`}
            onClick={() => setActiveTab("notes")}
          >
            Notes
          </button>
          <button
            className={`px-6 py-2 font-semibold rounded-t-lg focus:outline-none transition-all ${
              activeTab === "maps"
                ? "bg-white dark:bg-gray-900 border-x border-t border-b-0 border-gray-200 dark:border-gray-800 text-purple-600 dark:text-purple-400"
                : "text-gray-600 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400"
            }`}
            onClick={() => setActiveTab("maps")}
          >
            Mind Maps
          </button>
        </div>

        {/* Tab Content */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-b-xl p-6 min-h-[300px]">
          {activeTab === "chat" ? (
            <div className="flex flex-col h-[300px]">
              <div className="flex-1 overflow-y-auto mb-4 space-y-3">
                {chatMessages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex ${
                      msg.sender === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`px-4 py-2 rounded-lg max-w-[70%] ${
                        msg.sender === "user"
                          ? "bg-blue-500 text-white"
                          : "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white"
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                ))}
              </div>
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <input
                  type="text"
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  className="flex-1 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Type your question..."
                />
                <button
                  type="submit"
                  className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-2 rounded-full font-semibold hover:from-blue-600 hover:to-purple-700 transition-all shadow"
                >
                  Send
                </button>
              </form>
            </div>
          ) : activeTab === "maps" ? (
            <div className="text-gray-600 dark:text-gray-300">
              <p className="mb-4">
                Mind maps will be displayed here. (Feature coming soon)
              </p>
              <button
                className="bg-gradient-to-r from-purple-500 to-blue-600 text-white px-6 py-2 rounded-full font-semibold hover:from-purple-600 hover:to-blue-700 transition-all shadow"
                onClick={() => alert("Mind map feature coming soon!")}
              >
                Generate MindMap
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {notes.map((note, idx) => (
                <div
                  key={idx}
                  className="bg-purple-100 dark:bg-purple-900/30 text-purple-900 dark:text-purple-200 rounded p-4"
                >
                  {note}
                </div>
              ))}
              <button
                className="mt-4 bg-gradient-to-r from-purple-500 to-blue-600 text-white px-6 py-2 rounded-full font-semibold hover:from-purple-600 hover:to-blue-700 transition-all shadow"
                onClick={() => setNotes([...notes, "(Generated note example)"])}
              >
                Generate Notes
              </button>
            </div>
          )}
        </div>

        {/* Paste Source Modal */}
        {showPasteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-8 w-full max-w-md relative">
              <button
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-2xl"
                onClick={() => setShowPasteModal(false)}
                aria-label="Close"
              >
                &times;
              </button>
              <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
                Paste Source as Text
              </h2>
              <form onSubmit={handlePasteSubmit} className="space-y-4">
                <textarea
                  value={pastedText}
                  onChange={(e) => setPastedText(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Paste your text here..."
                  rows={8}
                  required
                />
                {pasteError && (
                  <div className="text-red-500 text-sm">{pasteError}</div>
                )}
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition"
                    onClick={() => setShowPasteModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-gradient-to-r from-purple-500 to-blue-600 text-white px-6 py-2 rounded-full font-semibold hover:from-purple-600 hover:to-blue-700 transition-all shadow"
                  >
                    Save
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
