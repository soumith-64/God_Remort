import os
import shutil
import base64
import mimetypes
import string
from pathlib import Path
from typing import List, Dict, Any, Optional
from agent.core.config import settings

class FileManager:
    def __init__(self):
        pass

    def get_bookmarks(self) -> List[Dict[str, str]]:
        bookmarks = []
        # Add available drive letters
        for d in string.ascii_uppercase:
            drive_p = Path(f"{d}:\\")
            if drive_p.exists():
                bookmarks.append({
                    "name": f"Drive {d}:",
                    "path": str(drive_p)
                })

        # Add common user folders
        user_dirs = [
            ("Home", Path.home()),
            ("Documents", Path.home() / "Documents"),
            ("Downloads", Path.home() / "Downloads"),
            ("Desktop", Path.home() / "Desktop"),
        ]
        for name, p in user_dirs:
            if p.exists():
                bookmarks.append({
                    "name": name,
                    "path": str(p)
                })
        return bookmarks

    def resolve_safe_path(self, target_path_str: str) -> Path:
        """Resolves target path across all Windows drives."""
        if not target_path_str or target_path_str.strip() in ("", "/", "\\", "."):
            # Default to C:\ drive or first available drive
            for d in string.ascii_uppercase:
                dp = Path(f"{d}:\\")
                if dp.exists():
                    return dp
            return Path.home()

        target = Path(target_path_str).resolve()
        return target

    def list_directory(self, dir_path_str: str) -> Dict[str, Any]:
        """Lists files and folders with full metadata across all drives."""
        dir_path = self.resolve_safe_path(dir_path_str)
        if not dir_path.exists():
            raise FileNotFoundError(f"Directory not found: '{dir_path}'")
        if not dir_path.is_dir():
            raise NotADirectoryError(f"Path is not a directory: '{dir_path}'")

        items = []
        try:
            with os.scandir(dir_path) as entries:
                for entry in entries:
                    try:
                        stat = entry.stat()
                        is_dir = entry.is_dir()
                        ext = Path(entry.name).suffix.lower() if not is_dir else ""
                        mime, _ = mimetypes.guess_type(entry.name)

                        items.append({
                            "name": entry.name,
                            "path": str(Path(entry.path).resolve()),
                            "is_dir": is_dir,
                            "size_bytes": stat.st_size if not is_dir else 0,
                            "modified_time": stat.st_mtime,
                            "extension": ext,
                            "mime_type": mime or ("directory" if is_dir else "application/octet-stream")
                        })
                    except (PermissionError, FileNotFoundError, OSError):
                        continue
        except PermissionError:
            raise PermissionError(f"Permission denied accessing directory: '{dir_path}'")

        # Sort: directories first, then alphabetical
        items.sort(key=lambda x: (not x["is_dir"], x["name"].lower()))

        # Parent directory
        parent_path = None
        try:
            parent = dir_path.parent
            if parent != dir_path and parent.exists():
                parent_path = str(parent)
        except Exception:
            pass

        return {
            "current_path": str(dir_path),
            "parent_path": parent_path,
            "items": items,
            "total_items": len(items)
        }

    def create_directory(self, parent_dir_str: str, folder_name: str) -> Dict[str, Any]:
        parent = self.resolve_safe_path(parent_dir_str)
        new_dir = parent / folder_name
        new_dir.mkdir(parents=True, exist_ok=False)
        return {"status": "created", "path": str(new_dir)}

    def delete_item(self, target_path_str: str) -> Dict[str, Any]:
        target = self.resolve_safe_path(target_path_str)
        # Prevent deleting entire drive root
        if len(str(target).strip("\\/")) <= 2:
            raise PermissionError("Cannot delete entire root drive.")

        if target.is_dir():
            shutil.rmtree(target)
        else:
            target.unlink()

        return {"status": "deleted", "path": str(target)}

    def rename_item(self, source_path_str: str, new_name: str) -> Dict[str, Any]:
        source = self.resolve_safe_path(source_path_str)
        destination = source.parent / new_name

        if destination.exists():
            raise FileExistsError(f"Target '{new_name}' already exists.")

        source.rename(destination)
        return {"status": "renamed", "old_path": str(source), "new_path": str(destination)}

    def preview_file(self, file_path_str: str) -> Dict[str, Any]:
        """Provides preview for text, code, images, and PDF."""
        file_path = self.resolve_safe_path(file_path_str)
        if not file_path.exists() or file_path.is_dir():
            raise FileNotFoundError(f"File not found: '{file_path}'")

        stat = file_path.stat()
        mime, _ = mimetypes.guess_type(file_path.name)
        mime = mime or "application/octet-stream"

        preview_data = {
            "name": file_path.name,
            "path": str(file_path),
            "size_bytes": stat.st_size,
            "mime_type": mime,
            "preview_type": "binary",
            "content": None
        }

        # Text and code files (up to 300KB preview)
        text_extensions = {".txt", ".md", ".json", ".js", ".ts", ".tsx", ".py", ".html", ".css", ".yaml", ".yml", ".xml", ".log", ".env", ".sh", ".ps1", ".bat", ".rs", ".go", ".java", ".c", ".cpp", ".cs"}
        if file_path.suffix.lower() in text_extensions or (mime and mime.startswith("text/")):
            if stat.st_size <= 300 * 1024:
                try:
                    with open(file_path, "r", encoding="utf-8", errors="replace") as f:
                        preview_data["content"] = f.read()
                    preview_data["preview_type"] = "text"
                except Exception:
                    pass
            else:
                preview_data["preview_type"] = "text_too_large"

        # Images (up to 8MB preview)
        elif mime and mime.startswith("image/"):
            if stat.st_size <= 8 * 1024 * 1024:
                try:
                    with open(file_path, "rb") as f:
                        b64 = base64.b64encode(f.read()).decode()
                    preview_data["content"] = f"data:{mime};base64,{b64}"
                    preview_data["preview_type"] = "image"
                except Exception:
                    pass

        elif mime == "application/pdf":
            preview_data["preview_type"] = "pdf"

        return preview_data

file_manager = FileManager()
