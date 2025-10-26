"use client";
import React, { useEffect, useRef, useState } from "react";
import Navbar from "@/app/components/Navbar";
import { useParams, useSearchParams } from "next/navigation";
import Mindmap from "@/app/components/Mindmap";
import MarkdownRenderer from "@/app/components/MarkdownRenderer";
import { set } from "zod";

export default function VaultPage() {
  const { vaultId } = useParams();
  const searchParams = useSearchParams();
  const vaultName = searchParams.get("vaultName");
  type File = { id: string; name: string; url: string };
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [activeTab, setActiveTab] = useState<"chat" | "notes" | "maps">("chat");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Dummy chat and notes state
  const [chatMessages, setChatMessages] = useState([
    {
      role: "assistant",
      content: "Welcome! Ask me anything about your vault.",
    },
  ]);

  // Note state
  const [note, setNote] = useState(
    "Summary and key points from your uploaded documents will appear here."
  );
  const [userInput, setUserInput] = useState("");

  // Text Source Modal state
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [pastedText, setPastedText] = useState("");
  const [pasteError, setPasteError] = useState("");

  // Note generation loading state
  const [noteLoading, setNoteLoading] = useState(false);

  // Chat loading state
  const [chatLoading, setChatLoading] = useState(false);

  // File upload loading state
  const [uploadLoading, setUploadLoading] = useState(false);

  // Paste text loading state
  const [pasteLoading, setPasteLoading] = useState(false);

  // Initial data loading states
  const [filesLoading, setFilesLoading] = useState(true);
  const [notesLoading, setNotesLoading] = useState(true);

  // Mind map state
  const [mindMap, setMindMap] = useState([]);
  useEffect(() => {
    // Fetch mind map data when vaultId changes
    if (vaultId) {
      fetch(`/api/map/get/?vaultId=${vaultId}`)
        .then((res) => res.json())
        .then((data) => {
          const mindmapData = data.mindMap.data || [];
          console.log("Mind map data:", mindmapData);
          if (data.success) {
            setMindMap(mindmapData);
          }
        })
        .catch((error) => {
          console.log("Error get mind map:", error);
        });
    }
  }, [vaultId]);

  const [mapLoading, setMapLoading] = useState(false);

  // Fetch uploaded files and notes
  React.useEffect(() => {
    setFilesLoading(true);
    fetch("/api/source/?vaultId=" + vaultId)
      .then((res) => res.json())
      .then((data) => setUploadedFiles(data || []))
      .catch(() => setUploadedFiles([]))
      .finally(() => setFilesLoading(false));
  }, []);

  React.useEffect(() => {
    setNotesLoading(true);
    fetch("/api/notes/get?vaultId=" + vaultId)
      .then((res) => res.json())
      .then((data) => setNote(data.content || "No notes available."))
      .catch(() => setNote("No notes available."))
      .finally(() => setNotesLoading(false));
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setUploadLoading(true);
      const formData = new FormData();
      Object.values(e.target.files).forEach((file) => {
        formData.append("file", file);
      });

      //formData.append("vaultId", vaultId as string);

      try {
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
      } catch (error) {
        console.error("Upload error:", error);
        alert("Upload failed");
      } finally {
        setUploadLoading(false);
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
    const userMessage = { role: "user", content: userInput };
    setChatMessages((prev) => [...prev, userMessage]);

    // Clear input and set loading
    setUserInput("");
    setChatLoading(true);

    try {
      const response = await fetch(`/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: chatMessages.concat(userMessage),
          vaultId: vaultId,
        }), // Send all messages including user input
      });

      const result = await response.json();
      if (result.success) {
        // Add AI response to chat
        setChatMessages((prev) => [
          ...prev,
          { role: "assistant", content: result.answer },
        ]);
      } else {
        // Handle error
        setChatMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: "Sorry, I encountered an error processing your request.",
          },
        ]);
      }
    } catch (error) {
      console.error("Chat error:", error);
      setChatMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, I encountered an error processing your request.",
        },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  const handlePasteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pastedText.trim()) {
      setPasteError("Text is required.");
      return;
    }
    setPasteError("");
    setPasteLoading(true);

    try {
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
    } catch (error) {
      console.error("Paste error:", error);
      setPasteError("Failed to save text source.");
    } finally {
      setPasteLoading(false);
    }
  };

  // Generate notes function
  const handleGenerateNote = async () => {
    setNoteLoading(true);
    try {
      const response = await fetch(`/api/notes/generate/?vaultId=${vaultId}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      const result = await response.json();
      if (result.success) {
        setNote(result.notes || " ");
      } else {
        console.error("Failed to generate notes:", result.error);
        setNote("Failed to generate notes. Please try again.");
      }
    } catch (error) {
      console.error("Error generating notes:", error);
      setNote("An error occurred while generating notes.");
    } finally {
      setNoteLoading(false);
    }
  };

  // Generate mind map function
  const handleGenerateMap = async () => {
    setMapLoading(true);
    try {
      const response = await fetch(`/api/map/generate/?vaultId=${vaultId}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      const result = await response.json();
      const mindmapData = result.mindMap.data || [];

      if (result.success) {
        setMindMap(mindmapData || []);
      } else {
        console.error("Failed to generate mind map:", result.error);
      }
    } catch (error) {
      console.error("Error generating mind map:", error);
    } finally {
      setMapLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-6">
          Vault : {vaultName}
        </h1>
        {/* Upload Section */}
        <section className="mb-10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Upload Documents
            </h2>
            <div className="flex gap-2">
              <button
                className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-2 rounded-full font-semibold hover:from-blue-600 hover:to-purple-700 transition-all shadow disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleUploadClick}
                disabled={uploadLoading}
              >
                {uploadLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Uploading...
                  </div>
                ) : (
                  "Upload Files"
                )}
              </button>
              <button
                className="bg-gradient-to-r from-purple-500 to-blue-600 text-white px-6 py-2 rounded-full font-semibold hover:from-purple-600 hover:to-blue-700 transition-all shadow disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => setShowPasteModal(true)}
                disabled={pasteLoading}
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
          {uploadedFiles.length > 0 ? (
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
          ) : filesLoading ? (
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 flex items-center justify-center">
              <div className="flex items-center gap-2 text-gray-500">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-500"></div>
                Loading files...
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 flex items-center justify-center">
              <div className="text-center py-8">
                <div className="mb-4">
                  <svg
                    className="mx-auto h-12 w-12 text-gray-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  No documents uploaded yet
                </h3>
                <p className="text-gray-500 dark:text-gray-400 mb-4">
                  Upload PDF or text files, or paste text content to get started
                  with your knowledge vault.
                </p>
                <div className="flex flex-col sm:flex-row gap-2 justify-center">
                  <button
                    className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-2 rounded-full font-medium hover:from-blue-600 hover:to-purple-700 transition-all shadow text-sm"
                    onClick={handleUploadClick}
                    disabled={uploadLoading}
                  >
                    Upload Files
                  </button>
                  <button
                    className="bg-gradient-to-r from-purple-500 to-blue-600 text-white px-4 py-2 rounded-full font-medium hover:from-purple-600 hover:to-blue-700 transition-all shadow text-sm"
                    onClick={() => setShowPasteModal(true)}
                    disabled={pasteLoading}
                  >
                    Paste Text
                  </button>
                </div>
              </div>
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
        <div
          className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-b-xl p-6 min-h-[500px] flex flex-col"
          style={{ height: "600px" }}
        >
          {activeTab === "chat" ? (
            <div className="flex flex-col h-full">
              <div className="flex-1 overflow-y-auto mb-4 space-y-3">
                {chatMessages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex ${
                      msg.role === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-[80%] px-4 py-2 rounded-lg ${
                        msg.role === "user"
                          ? "bg-blue-500 text-white"
                          : "bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-white"
                      }`}
                    >
                      {msg.role === "user" ? (
                        msg.content
                      ) : (
                        <MarkdownRenderer content={msg.content} />
                      )}
                    </div>
                  </div>
                ))}
                {chatLoading && (
                  <div className="flex justify-start">
                    <div className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                      AI is thinking...
                    </div>
                  </div>
                )}
              </div>
              <form onSubmit={handleSendMessage} className="flex gap-2 mt-auto">
                <input
                  type="text"
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  className="flex-1 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                  placeholder="Type your question..."
                  disabled={chatLoading}
                />
                <button
                  type="submit"
                  className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-2 rounded-full font-semibold hover:from-blue-600 hover:to-purple-700 transition-all shadow disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={chatLoading}
                >
                  {chatLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    </div>
                  ) : (
                    "Send"
                  )}
                </button>
              </form>
            </div>
          ) : activeTab === "maps" ? (
            <div className="flex flex-col h-full">
              <div className="flex-1 bg-green-100 dark:bg-green-900/30 text-green-900 dark:text-green-200 rounded p-4 mb-4 overflow-hidden">
                <div className="whitespace-pre-wrap break-words font-sans text-sm leading-relaxed h-full">
                  <Mindmap data={mindMap || []} />
                </div>
              </div>
              <button
                className="bg-gradient-to-r from-purple-500 to-blue-600 text-white px-6 py-2 rounded-full font-semibold hover:from-purple-600 hover:to-blue-700 transition-all shadow mt-auto"
                onClick={handleGenerateMap}
                disabled={mapLoading}
              >
                {mapLoading ? "Generating..." : "Generate MindMap"}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-purple-100 dark:bg-purple-900/30 text-purple-900 dark:text-purple-200 rounded p-4 max-h-96 overflow-y-auto">
                {notesLoading ? (
                  <div className="flex items-center justify-center h-32">
                    <div className="flex items-center gap-2 text-purple-600">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-purple-600"></div>
                      Loading notes...
                    </div>
                  </div>
                ) : (
                  <MarkdownRenderer content={note} />
                )}
              </div>
              <button
                className="mt-4 bg-gradient-to-r from-purple-500 to-blue-600 text-white px-6 py-2 rounded-full font-semibold hover:from-purple-600 hover:to-blue-700 transition-all shadow disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleGenerateNote}
                disabled={noteLoading}
              >
                {noteLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Generating...
                  </div>
                ) : (
                  "Generate Notes"
                )}
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
                    className="bg-gradient-to-r from-purple-500 to-blue-600 text-white px-6 py-2 rounded-full font-semibold hover:from-purple-600 hover:to-blue-700 transition-all shadow disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={pasteLoading}
                  >
                    {pasteLoading ? (
                      <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Saving...
                      </div>
                    ) : (
                      "Save"
                    )}
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
