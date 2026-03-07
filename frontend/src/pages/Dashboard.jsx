import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { postsAPI } from '../api';
import RevisionsModal from '../components/RevisionsModal';
import ScheduleModal from '../components/ScheduleModal';

const StatusBadge = ({ status }) => (
    <span className={`badge badge-${status}`}>{status}</span>
);

export default function Dashboard() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [posts, setPosts] = useState([]);
    const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });
    const [loading, setLoading] = useState(true);
    const [revisionsPost, setRevisionsPost] = useState(null);
    const [schedulePost, setSchedulePost] = useState(null);
    const [alert, setAlert] = useState(null);

    const showAlert = (msg, type = 'success') => {
        setAlert({ msg, type });
        setTimeout(() => setAlert(null), 3000);
    };

    const fetchPosts = useCallback(async (page = 1) => {
        setLoading(true);
        try {
            const res = await postsAPI.list({ page, limit: 10 });
            setPosts(res.data.posts);
            setPagination(res.data.pagination);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchPosts(); }, [fetchPosts]);

    const handlePublish = async (id) => {
        try {
            await postsAPI.publish(id);
            showAlert('Post published!');
            fetchPosts(pagination.page);
        } catch (err) { showAlert(err.response?.data?.message || 'Publish failed', 'error'); }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this post?')) return;
        try {
            await postsAPI.delete(id);
            showAlert('Post deleted');
            fetchPosts(pagination.page);
        } catch (err) { showAlert('Delete failed', 'error'); }
    };

    const stats = {
        total: posts.length,
        draft: posts.filter(p => p.status === 'draft').length,
        scheduled: posts.filter(p => p.status === 'scheduled').length,
        published: posts.filter(p => p.status === 'published').length,
    };

    return (
        <div className="layout">
            {/* Sidebar */}
            <aside className="sidebar">
                <div className="sidebar-logo">
                    <h2>✍️ ContentFlow</h2>
                    <p>Author Dashboard</p>
                </div>
                <nav className="sidebar-nav">
                    <Link to="/dashboard" className="active">📝 My Posts</Link>
                    <Link to="/editor/new">✨ New Post</Link>
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
                    <button className="btn btn-secondary btn-sm" style={{ width: '100%', marginTop: '0.75rem' }} onClick={logout}>
                        Sign Out
                    </button>
                </div>
            </aside>

            {/* Main */}
            <main className="content-with-sidebar main-content">
                <div className="flex-between mb-4">
                    <div>
                        <h1 style={{ fontSize: '1.6rem' }}>My Posts</h1>
                        <p style={{ marginTop: '0.25rem' }}>Manage your content</p>
                    </div>
                    <button className="btn btn-primary" onClick={() => navigate('/editor/new')}>
                        + New Post
                    </button>
                </div>

                {alert && <div className={`alert alert-${alert.type}`}>{alert.msg}</div>}

                {/* Stats */}
                <div className="stats-grid">
                    {[
                        { label: 'Total', value: pagination.total || 0, color: 'var(--accent-primary)' },
                        { label: 'Drafts', value: stats.draft, color: 'var(--text-muted)' },
                        { label: 'Scheduled', value: stats.scheduled, color: 'var(--accent-orange)' },
                        { label: 'Published', value: stats.published, color: 'var(--accent-green)' },
                    ].map(s => (
                        <div key={s.label} className="stat-card">
                            <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
                            <div className="stat-label">{s.label}</div>
                        </div>
                    ))}
                </div>

                {/* Posts table */}
                <div className="card" style={{ padding: 0 }}>
                    <div className="table-wrap">
                        {loading ? (
                            <div className="loading">Loading posts…</div>
                        ) : posts.length === 0 ? (
                            <div className="empty-state">
                                <h3>No posts yet</h3>
                                <p>Create your first post to get started</p>
                                <button className="btn btn-primary" style={{ marginTop: '1rem' }} onClick={() => navigate('/editor/new')}>
                                    Create Post
                                </button>
                            </div>
                        ) : (
                            <table>
                                <thead>
                                    <tr>
                                        <th>Title</th>
                                        <th>Status</th>
                                        <th>Slug</th>
                                        <th>Created</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {posts.map(post => (
                                        <tr key={post.id}>
                                            <td style={{ fontWeight: 600, maxWidth: '260px' }}>
                                                <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                    {post.title}
                                                </div>
                                            </td>
                                            <td><StatusBadge status={post.status} /></td>
                                            <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontFamily: 'monospace' }}>
                                                {post.slug?.substring(0, 30)}{post.slug?.length > 30 ? '…' : ''}
                                            </td>
                                            <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                                                {new Date(post.created_at).toLocaleDateString()}
                                            </td>
                                            <td>
                                                <div className="gap-actions">
                                                    <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/editor/${post.id}`)}>Edit</button>
                                                    {post.status === 'draft' && (
                                                        <>
                                                            <button className="btn btn-success btn-sm" onClick={() => handlePublish(post.id)}>Publish</button>
                                                            <button className="btn btn-warning btn-sm" onClick={() => setSchedulePost(post)}>Schedule</button>
                                                        </>
                                                    )}
                                                    <button className="btn btn-secondary btn-sm" onClick={() => setRevisionsPost(post)}>History</button>
                                                    <button className="btn btn-danger btn-sm" onClick={() => handleDelete(post.id)}>Delete</button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                    <div className="pagination">
                        <button disabled={pagination.page === 1} onClick={() => fetchPosts(pagination.page - 1)}>‹</button>
                        {[...Array(pagination.totalPages)].map((_, i) => (
                            <button key={i} className={pagination.page === i + 1 ? 'active' : ''} onClick={() => fetchPosts(i + 1)}>{i + 1}</button>
                        ))}
                        <button disabled={pagination.page === pagination.totalPages} onClick={() => fetchPosts(pagination.page + 1)}>›</button>
                    </div>
                )}
            </main>

            {revisionsPost && <RevisionsModal post={revisionsPost} onClose={() => setRevisionsPost(null)} />}
            {schedulePost && <ScheduleModal post={schedulePost} onClose={() => setSchedulePost(null)} onScheduled={() => { setSchedulePost(null); fetchPosts(); showAlert('Post scheduled!'); }} />}
        </div>
    );
}
