import { useState } from 'react';
import { Link } from 'react-router-dom';
import { mediaAPI } from '../api';
import { useAuth } from '../contexts/AuthContext';

export default function MediaPage() {
    const { user } = useAuth();
    const [uploads, setUploads] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [alert, setAlert] = useState(null);
    const [dragging, setDragging] = useState(false);

    const showAlert = (msg, type = 'success') => {
        setAlert({ msg, type });
        setTimeout(() => setAlert(null), 3000);
    };

    const uploadFile = async (file) => {
        if (!file) return;
        setUploading(true);
        try {
            const res = await mediaAPI.upload(file);
            setUploads(prev => [res.data.media, ...prev]);
            showAlert('File uploaded successfully!');
        } catch (err) {
            showAlert(err.response?.data?.message || 'Upload failed', 'error');
        } finally {
            setUploading(false);
        }
    };

    const handleFileInput = (e) => uploadFile(e.target.files?.[0]);

    const handleDrop = (e) => {
        e.preventDefault();
        setDragging(false);
        uploadFile(e.dataTransfer.files?.[0]);
    };

    const copyToClipboard = (url) => {
        navigator.clipboard.writeText(url);
        showAlert('URL copied to clipboard!');
    };

    return (
        <div className="layout">
            <aside className="sidebar">
                <div className="sidebar-logo">
                    <h2>✍️ ContentFlow</h2>
                    <p>Author Dashboard</p>
                </div>
                <nav className="sidebar-nav">
                    <Link to="/dashboard">📝 My Posts</Link>
                    <Link to="/editor/new">✨ New Post</Link>
                    <Link to="/media" className="active">🖼️ Media</Link>
                    <Link to="/blog">🌐 Public Blog</Link>
                </nav>
                <div className="sidebar-bottom">
                    <div className="user-info">
                        <div className="user-avatar">{user?.username?.[0]?.toUpperCase()}</div>
                        <div>
                            <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>{user?.username}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{user?.role}</div>
                        </div>
                    </div>
                </div>
            </aside>

            <main className="content-with-sidebar main-content">
                <h1 style={{ fontSize: '1.6rem', marginBottom: '0.5rem' }}>Media Library</h1>
                <p style={{ marginBottom: '2rem' }}>Upload images to use in your posts</p>

                {alert && <div className={`alert alert-${alert.type}`}>{alert.msg}</div>}

                {/* Upload zone */}
                <label
                    className="upload-zone mb-4"
                    onDragOver={e => { e.preventDefault(); setDragging(true); }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={handleDrop}
                    style={{ display: 'block', borderColor: dragging ? 'var(--accent-primary)' : undefined, background: dragging ? 'rgba(108,99,255,0.08)' : undefined }}
                >
                    <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📁</div>
                    <strong style={{ color: 'var(--text-primary)' }}>{uploading ? 'Uploading...' : 'Click to upload or drag & drop'}</strong>
                    <p>JPG, PNG, GIF, WebP, SVG (max 10MB)</p>
                    <input type="file" accept="image/*" onChange={handleFileInput} style={{ display: 'none' }} disabled={uploading} />
                </label>

                {/* Uploaded files */}
                {uploads.length > 0 && (
                    <>
                        <h3 style={{ marginBottom: '1rem' }}>Uploaded This Session</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1rem' }}>
                            {uploads.map((m, i) => (
                                <div key={i} className="card" style={{ padding: '1rem' }}>
                                    <img src={m.url} alt={m.originalName} style={{ width: '100%', height: '150px', objectFit: 'cover', borderRadius: 'var(--radius-md)', marginBottom: '0.75rem' }} />
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', wordBreak: 'break-all' }}>{m.originalName}</div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                                        {(m.size / 1024).toFixed(1)} KB · {m.mimetype}
                                    </div>
                                    <button className="btn btn-secondary btn-sm" style={{ width: '100%' }} onClick={() => copyToClipboard(m.url)}>
                                        📋 Copy URL
                                    </button>
                                </div>
                            ))}
                        </div>
                    </>
                )}

                {uploads.length === 0 && !uploading && (
                    <div className="empty-state">
                        <h3>No uploads yet</h3>
                        <p>Upload your first image using the zone above</p>
                    </div>
                )}
            </main>
        </div>
    );
}
