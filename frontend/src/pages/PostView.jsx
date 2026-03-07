import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { publicAPI } from '../api';

export default function PostView() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [post, setPost] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        publicAPI.get(id)
            .then(r => setPost(r.data.post))
            .catch(() => navigate('/blog'))
            .finally(() => setLoading(false));
    }, [id, navigate]);

    if (loading) return <div className="loading">Loading post…</div>;
    if (!post) return null;

    return (
        <div>
            <header className="blog-header">
                <div className="blog-header-inner">
                    <Link to="/blog" style={{ fontSize: '1.1rem', fontWeight: 700, background: 'linear-gradient(135deg,#6c63ff,#ff6584)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        ✍️ ContentFlow
                    </Link>
                    <Link to="/blog" className="btn btn-secondary btn-sm">← All Posts</Link>
                </div>
            </header>

            <main style={{ maxWidth: '780px', margin: '3rem auto', padding: '0 1.5rem 4rem' }}>
                <span className="badge badge-published" style={{ marginBottom: '1rem', display: 'inline-block' }}>Published</span>
                <h1 style={{ marginBottom: '1rem' }}>{post.title}</h1>
                <div style={{ display: 'flex', gap: '1.5rem', color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '2rem', paddingBottom: '1.5rem', borderBottom: '1px solid var(--border-subtle)' }}>
                    <span>✍️ {post.author?.username || 'Unknown'}</span>
                    <span>📅 {new Date(post.published_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                    <span style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>/{post.slug}</span>
                </div>
                <div style={{ lineHeight: 1.9, color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', wordWrap: 'break-word' }}>
                    {post.content}
                </div>
            </main>
        </div>
    );
}
