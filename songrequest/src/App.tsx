import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { Music2, Link2, Search, Loader2, CheckCircle2, AlertCircle, Plus } from "lucide-react";

interface PlaylistInfo {
  name: string;
  url: string;
  imageUrl: string | null;
  trackCount: number;
}

export default function App() {
  const [url, setUrl] = useState("");
  const [playlistInfo, setPlaylistInfo] = useState<PlaylistInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const lastCheckedUrl = useRef("");

  // Auto-recognize Spotify URL on paste or change
  useEffect(() => {
    const trimmed = url.trim();
    if (!trimmed || trimmed === lastCheckedUrl.current) return;

    // Standard check: is it a Spotify link or playlist ID?
    const hasSpotify = trimmed.toLowerCase().includes("spotify");
    const isBase62Id = /^[a-zA-Z0-9]{22}$/.test(trimmed);

    if (!hasSpotify && !isBase62Id) {
      setPlaylistInfo(null);
      return;
    }

    const timer = setTimeout(() => {
      fetchInfo(trimmed);
    }, 600);

    return () => clearTimeout(timer);
  }, [url]);

  const fetchInfo = async (inputUrl: string) => {
    if (!inputUrl) return;
    setError(null);
    setSuccess(null);
    setLoading(true);
    setPlaylistInfo(null);
    lastCheckedUrl.current = inputUrl;

    try {
      // Endpoint /api/playlist-info
      const res = await axios.get("/api/playlist-info", {
        params: { url: inputUrl }
      });
      if (res.data) {
        setPlaylistInfo({
          name: res.data.name,
          url: inputUrl,
          imageUrl: res.data.imageUrl,
          trackCount: res.data.trackCount
        });
      }
    } catch (err: any) {
      setError(
        err.response?.data?.error || 
        "ไม่พบข้อมูลเพลย์ลิสต์นี้ กรุณาตรวจสอบว่าเป็นเพลย์ลิสต์สาธารณะ (Public)"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleManualSearch = () => {
    fetchInfo(url.trim());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await axios.post("/api/playlists", { url: url.trim() });
      if (res.data.success) {
        setSuccess(
          `เพิ่มเพลย์ลิสต์ "${res.data.playlist.name}" เข้าสู่เกมเรียบร้อยแล้ว!`
        );
        // Clear inputs on success
        setUrl("");
        setPlaylistInfo(null);
        lastCheckedUrl.current = "";
      } else {
        setError(res.data.error || "เกิดข้อผิดพลาดในการบันทึกเพลย์ลิสต์");
      }
    } catch (err: any) {
      setError(err.response?.data?.error || "เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="card">
      <h1 className="gradient-title">🎵 Wutdasong</h1>
      <p className="subtitle">ขอเพลง / เพิ่มเพลย์ลิสต์ของคุณเข้าสู่ระบบเกม</p>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        <div className="form-group">
          <label className="input-label">
            <Link2 size={16} /> Spotify Playlist Link
          </label>
          <div className="input-container">
            <span className="input-icon">
              <Search size={18} />
            </span>
            <input
              type="text"
              className="text-input"
              placeholder="วางลิงก์ Spotify Playlist ที่นี่..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={submitting}
            />
          </div>
        </div>

        {/* Manual Search Button in case auto-detect is bypassed */}
        <button
          type="button"
          className="btn-primary"
          style={{ background: "rgba(255, 107, 53, 0.15)", color: "var(--orange-core)", boxShadow: "none" }}
          onClick={handleManualSearch}
          disabled={loading || submitting || !url.trim()}
        >
          {loading ? (
            <>
              <Loader2 size={18} className="loading-spinner" style={{ marginRight: "6px" }} /> กำลังตรวจสอบข้อมูล...
            </>
          ) : (
            <>
              <Search size={18} style={{ marginRight: "6px" }} /> ค้นหาเพลย์ลิสต์
            </>
          )}
        </button>

        {/* Error Alert */}
        {error && (
          <div className="status-alert status-error">
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {/* Success Alert */}
        {success && (
          <div className="status-alert status-success">
            <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
            <span>{success}</span>
          </div>
        )}

        {/* Playlist Info Preview Card */}
        {playlistInfo && (
          <div className="playlist-preview-card">
            {playlistInfo.imageUrl ? (
              <img
                src={playlistInfo.imageUrl}
                alt={playlistInfo.name}
                className="playlist-cover"
              />
            ) : (
              <div className="playlist-cover">
                <Music2 size={32} />
              </div>
            )}
            <div className="playlist-details">
              <span className="playlist-name">{playlistInfo.name}</span>
              <span className="playlist-meta">
                🎵 {playlistInfo.trackCount} เพลง • Spotify Public Playlist
              </span>
            </div>
          </div>
        )}

        <button
          type="submit"
          className="btn-primary"
          disabled={!playlistInfo || loading || submitting}
        >
          {submitting ? (
            <>
              <Loader2 size={18} className="loading-spinner" style={{ marginRight: "6px" }} /> กำลังบันทึกข้อมูล...
            </>
          ) : (
            <>
              <Plus size={18} style={{ marginRight: "6px" }} /> เพิ่มเข้าคลังเพลงของระบบ
            </>
          )}
        </button>
      </form>
    </div>
  );
}
