"use client";

import React, { useState, useEffect, useRef } from "react";
import { useOmniStore } from "@/stores/useOmniStore";
import { api } from "@/lib/api";
import { formatBytes } from "@/lib/utils";
import { 
  FolderTree, 
  Folder, 
  FileText, 
  FileCode, 
  FileImage, 
  File, 
  Upload, 
  Download, 
  Trash2, 
  Edit3, 
  FolderPlus, 
  ChevronRight, 
  RefreshCw, 
  Search, 
  ArrowLeft, 
  X, 
  AlertTriangle,
  Eye
} from "lucide-react";

export function FilesView() {
  const { addNotification } = useOmniStore();

  const [currentPath, setCurrentPath] = useState("");
  const [parentPath, setParentPath] = useState<string | null>(null);
  const [items, setItems] = useState<any[]>([]);
  const [bookmarks, setBookmarks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Modals & Inputs
  const [previewModal, setPreviewModal] = useState<{ open: boolean; data: any | null }>({ open: false, data: null });
  const [createFolderModal, setCreateFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [renameModal, setRenameModal] = useState<{ open: boolean; item: any | null; newName: string }>({ open: false, item: null, newName: "" });
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; item: any | null }>({ open: false, item: null });

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);

  const fetchDirectory = async (path = "") => {
    try {
      setLoading(true);
      const res = await api.files.browse(path);
      setCurrentPath(res.current_path);
      setParentPath(res.parent_path || null);
      setItems(res.items);
    } catch (e: any) {
      addNotification({ title: "Browse Error", message: e.message, type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const fetchBookmarks = async () => {
    try {
      const b = await api.files.getBookmarks();
      setBookmarks(b);
    } catch (_) {}
  };

  useEffect(() => {
    fetchBookmarks();
    fetchDirectory();
  }, []);

  const handleOpenItem = (item: any) => {
    if (item.is_dir) {
      fetchDirectory(item.path);
    } else {
      handlePreview(item.path);
    }
  };

  const handlePreview = async (path: string) => {
    try {
      const data = await api.files.preview(path);
      setPreviewModal({ open: true, data });
    } catch (e: any) {
      addNotification({ title: "Preview Error", message: e.message, type: "error" });
    }
  };

  const handleDownload = (path: string) => {
    const url = api.files.downloadUrl(path);
    window.open(url, "_blank");
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];

    try {
      setUploading(true);
      await api.files.upload(currentPath, file);
      addNotification({
        title: "File Uploaded",
        message: `Successfully uploaded '${file.name}' to laptop.`,
        type: "success"
      });
      fetchDirectory(currentPath);
    } catch (e: any) {
      addNotification({ title: "Upload Failed", message: e.message, type: "error" });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    try {
      await api.files.operations("create_folder", currentPath, newFolderName.trim());
      addNotification({ title: "Folder Created", message: `Folder '${newFolderName}' created.`, type: "success" });
      setCreateFolderModal(false);
      setNewFolderName("");
      fetchDirectory(currentPath);
    } catch (e: any) {
      addNotification({ title: "Create Failed", message: e.message, type: "error" });
    }
  };

  const handleRename = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renameModal.item || !renameModal.newName.trim()) return;
    try {
      await api.files.operations("rename", renameModal.item.path, renameModal.newName.trim());
      addNotification({ title: "Renamed", message: `Item renamed to '${renameModal.newName}'.`, type: "success" });
      setRenameModal({ open: false, item: null, newName: "" });
      fetchDirectory(currentPath);
    } catch (e: any) {
      addNotification({ title: "Rename Failed", message: e.message, type: "error" });
    }
  };

  const handleDelete = async () => {
    if (!deleteModal.item) return;
    try {
      await api.files.operations("delete", deleteModal.item.path);
      addNotification({ title: "Deleted", message: `'${deleteModal.item.name}' deleted.`, type: "info" });
      setDeleteModal({ open: false, item: null });
      fetchDirectory(currentPath);
    } catch (e: any) {
      addNotification({ title: "Delete Failed", message: e.message, type: "error" });
    }
  };

  const getFileIcon = (item: any) => {
    if (item.is_dir) return <Folder className="w-4 h-4 text-amber-400 fill-amber-400/20" />;
    const ext = item.extension;
    if ([".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg"].includes(ext)) {
      return <FileImage className="w-4 h-4 text-emerald-400" />;
    }
    if ([".js", ".ts", ".tsx", ".py", ".html", ".css", ".json"].includes(ext)) {
      return <FileCode className="w-4 h-4 text-omni-cyan" />;
    }
    return <FileText className="w-4 h-4 text-indigo-400" />;
  };

  const filteredItems = items.filter((i) =>
    i.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-4 pb-20 md:pb-6 animate-fade-in">
      {/* File Upload Hidden Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center space-x-2">
            <FolderTree className="w-6 h-6 text-omni-cyan" />
            <span>File Manager</span>
          </h1>
          <p className="text-xs text-omni-muted">Sandboxed remote filesystem management</p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="px-3.5 py-2 rounded-xl bg-omni-cyan text-black font-semibold text-xs flex items-center space-x-1.5 hover:opacity-90 shadow-md shadow-cyan-500/20"
          >
            <Upload className="w-4 h-4" />
            <span>{uploading ? "Uploading..." : "Upload File"}</span>
          </button>
          <button
            onClick={() => setCreateFolderModal(true)}
            className="p-2 rounded-xl bg-omni-surface hover:bg-omni-card border border-omni-border text-omni-muted hover:text-white"
            title="Create Folder"
          >
            <FolderPlus className="w-4 h-4" />
          </button>
          <button
            onClick={() => fetchDirectory(currentPath)}
            className="p-2 rounded-xl bg-omni-surface hover:bg-omni-card border border-omni-border text-omni-muted hover:text-white"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Storage Bookmarks Pills */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-1">
        {bookmarks.map((b, idx) => (
          <button
            key={idx}
            onClick={() => fetchDirectory(b.path)}
            className="px-3 py-1.5 rounded-xl bg-omni-surface hover:bg-omni-card border border-omni-border text-xs text-omni-muted hover:text-white whitespace-nowrap transition-colors flex items-center space-x-1.5"
          >
            <Folder className="w-3.5 h-3.5 text-amber-400" />
            <span>{b.name}</span>
          </button>
        ))}
      </div>

      {/* Path Breadcrumbs Bar & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 bg-omni-surface p-2.5 rounded-2xl border border-omni-border">
        <div className="flex items-center space-x-2 min-w-0 flex-1">
          {parentPath && (
            <button
              onClick={() => fetchDirectory(parentPath)}
              className="p-1.5 rounded-lg bg-omni-card hover:bg-omni-cardHover active:scale-95 text-omni-muted hover:text-white shrink-0"
              title="Up Directory"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div className="flex-1 font-mono text-xs text-white truncate">
            {currentPath || "Root"}
          </div>
        </div>
        <div className="relative w-full sm:w-48">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-omni-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search files..."
            className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-omni-card border border-omni-border text-xs text-white focus:outline-none"
          />
        </div>
      </div>

      {/* File & Folder List Grid */}
      <div className="rounded-3xl bg-omni-surface border border-omni-border overflow-hidden">
        {filteredItems.length === 0 ? (
          <div className="p-10 text-center text-xs text-omni-muted">
            {loading ? "Reading directory..." : "Directory is empty."}
          </div>
        ) : (
          <div className="divide-y divide-omni-border">
            {filteredItems.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3.5 hover:bg-omni-card/50 transition-colors group"
              >
                <div
                  onClick={() => handleOpenItem(item)}
                  className="flex items-center space-x-3 flex-1 min-w-0 cursor-pointer"
                >
                  <div className="p-2 rounded-xl bg-omni-card border border-omni-border">
                    {getFileIcon(item)}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-medium text-white truncate group-hover:text-omni-cyan transition-colors">
                      {item.name}
                    </div>
                    <div className="text-[10px] text-omni-muted">
                      {item.is_dir ? "Folder" : formatBytes(item.size_bytes)}
                    </div>
                  </div>
                </div>

                {/* File Action Buttons */}
                <div className="flex items-center space-x-1">
                  {!item.is_dir && (
                    <>
                      <button
                        onClick={() => handlePreview(item.path)}
                        className="p-1.5 rounded-lg text-omni-muted hover:text-white hover:bg-omni-card"
                        title="Preview"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDownload(item.path)}
                        className="p-1.5 rounded-lg text-omni-muted hover:text-omni-cyan hover:bg-omni-card"
                        title="Download to Phone"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => setRenameModal({ open: true, item, newName: item.name })}
                    className="p-1.5 rounded-lg text-omni-muted hover:text-white hover:bg-omni-card"
                    title="Rename"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setDeleteModal({ open: true, item })}
                    className="p-1.5 rounded-lg text-omni-muted hover:text-rose-400 hover:bg-rose-950/40"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Preview Modal */}
      {previewModal.open && previewModal.data && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-omni-surface border border-omni-border rounded-3xl p-6 shadow-2xl flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between pb-3 border-b border-omni-border mb-4">
              <span className="font-bold text-sm text-white truncate max-w-md">
                {previewModal.data.name}
              </span>
              <button
                onClick={() => setPreviewModal({ open: false, data: null })}
                className="p-1 rounded-full text-omni-muted hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-auto">
              {previewModal.data.preview_type === "image" && (
                <div className="flex items-center justify-center p-4">
                  <img src={previewModal.data.content} alt="Preview" className="max-h-[60vh] rounded-xl object-contain" />
                </div>
              )}
              {previewModal.data.preview_type === "text" && (
                <pre className="p-4 rounded-xl bg-omni-dark border border-omni-border text-xs font-mono text-gray-300 overflow-auto max-h-[60vh] leading-relaxed">
                  {previewModal.data.content}
                </pre>
              )}
              {previewModal.data.preview_type === "pdf" && (
                <div className="p-8 text-center text-xs text-omni-muted space-y-3">
                  <FileText className="w-12 h-12 mx-auto text-rose-400" />
                  <p>PDF document ready for download.</p>
                  <button
                    onClick={() => handleDownload(previewModal.data.path)}
                    className="px-4 py-2 rounded-xl bg-omni-cyan text-black font-semibold text-xs"
                  >
                    Download PDF
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create Folder Modal */}
      {createFolderModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleCreateFolder} className="w-full max-w-sm bg-omni-surface border border-omni-border rounded-3xl p-6 shadow-2xl space-y-4">
            <h3 className="font-bold text-sm text-white">New Folder</h3>
            <input
              type="text"
              autoFocus
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Folder Name"
              className="w-full px-3.5 py-2.5 rounded-xl bg-omni-card border border-omni-border text-xs text-white focus:outline-none focus:border-omni-cyan"
            />
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={() => setCreateFolderModal(false)}
                className="flex-1 py-2 rounded-xl bg-omni-card text-xs text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2 rounded-xl bg-omni-cyan text-black font-semibold text-xs"
              >
                Create
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModal.open && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-omni-surface border border-omni-border rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center space-x-3 text-rose-400">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="font-bold text-sm text-white">Delete Item?</h3>
            </div>
            <p className="text-xs text-omni-muted">
              Are you sure you want to permanently delete <strong className="text-white">{deleteModal.item?.name}</strong>?
            </p>
            <div className="flex space-x-2">
              <button
                onClick={() => setDeleteModal({ open: false, item: null })}
                className="flex-1 py-2 rounded-xl bg-omni-card text-xs text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
