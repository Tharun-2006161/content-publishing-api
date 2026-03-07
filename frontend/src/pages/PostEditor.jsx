import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { postsAPI, mediaAPI } from '../api';
import { useAuth } from '../contexts/AuthContext';

export default function PostEditor() {
    const { id } = useParams();
    const isNew = id === 'new';
    const navigate = useNavigate();
    const { user } = useAuth();

    const [form, setForm] = useState({ title: '', content: '' });
    const [post, setPost] = useState(null);
    const [loading, setLoading] = useState(!isNew);
    const [saving, setSaving] = useState(false);
    const [alert, setAlert] = useState(null);
    const [uploadedUrl, setUploadedUrl] = useState('');
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        if (!isNew) {
            postsAPI.get(id).then(res => {
                setPost(res.data.post);
                setForm({ title: res.data.post.title, content: res.data.post.content });
                setLoading(false);
            }).catch(() => navigate('/dashboard'));
        }
    }, [id, isNew, navigate]);

    const showAlert = (msg, type = 'success') => {
        setAlert({ msg, type });
        setTimeout(() => setAlert(null), 4000);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            if (isNew) {
                const res = await postsAPI.create(form);
                navigate(`/editor/${res.data.post.id}`);
                showAlert('Post created!');
            } else {
                await postsAPI.update(id, form);
                showAlert('Post saved! A revision was created.');
            }
        } catch (err) {
            showAlert(err.response?.data?.message || 'Save failed', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(true);
        try {
            const res = await mediaAPI.upload(file);
            const url = res.data.media.url;
            setUploadedUrl(url);
            setForm(f => ({ ...f, content: f.content + `\n\n![${file.name}](${url})` }));
            showAlert('Image uploaded and inserted!');
        } catch (err) {
            showAlert(err.response?.data?.message || 'Upload failed', 'error');
        } finally {
            setUploading(false);
        }
    };

    if (loading) return <div className="loading">Loading post…</div>;

    return (
        <div className="layout">
            <aside className="sidebar">
                <div className="sidebar-logo">
                    <h2>✍️ ContentFlow</h2>
                    <p>Author Dashboard</p>
                </div>
                <nav className="sidebar-nav">
                    <Link to="/dashboard">📝 My Posts</Link>
                    <Link to="/editor/new" className={isNew ? 'active' : ''}>✨ New Post</Link>
                    <Link to="/media">🖼️ Media</Link>
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
                <div className="flex-between mb-4">
                    <div>
                        <h1 style={{ fontSize: '1.6rem' }}>{isNew ? 'New Post' : 'Edit Post'}</h1>
                        {post && <span className={`badge badge-${post.status}`} style={{ marginTop: '0.5rem' }}>{post.status}</span>}
                    </div>
                    <Link to="/dashboard" className="btn btn-secondary">← Back</Link>
                </div>

                {alert && <div className={`alert alert-${alert.type}`}>{alert.msg}</div>}

                <form onSubmit={handleSave}>
                    <div className="form-group">
                        <label>Title</label>
                        <input
                            placeholder="Enter your post title..."
                            value={form.title}
                            onChange={e => setForm({ ...form, title: e.target.value })}
                            required
                            style={{ fontSize: '1.1rem' }}
                        />
                    </div>

                    <div className="form-group">
                        <label>Content</label>
                        <textarea
                            placeholder="Write your post content here... (Markdown supported)"
                            value={form.content}
                            onChange={e => setForm({ ...form, content: e.target.value })}
                            style={{ minHeight: '360px', fontFamily: 'monospace', fontSize: '0.9rem' }}
                        />
                    </div>

                    {/* Image upload */}
                    <div className="card mb-3" style={{ padding: '1rem' }}>
                        <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', marginBottom: 0 }}>
                            🖼️ {uploading ? 'Uploading...' : 'Upload & Insert Image'}
                            <input type="file" accept="image/*" onChange={handleFileUpload} style={{ display: 'none' }} disabled={uploading} />
                        </label>
                        {uploadedUrl && <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--accent-green)' }}>✓ {uploadedUrl}</div>}
                    </div>

                    <div className="flex-gap">
                        <button type="submit" className="btn btn-primary" disabled={saving}>
                            {saving ? 'Saving...' : isNew ? 'Create Post' : 'Save Changes'}
                        </button>
                        <Link to="/dashboard" className="btn btn-secondary">Cancel</Link>
                    </div>
                </form>
            </main>
        </div>
    );
}
