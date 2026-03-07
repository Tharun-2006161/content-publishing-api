import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { publicAPI } from '../api';

export default function PublicBlog() {
    const navigate = useNavigate();
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [searchResults, setSearchResults] = useState(null);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    useEffect(() => {
        if (searchResults !== null) return; // in search mode
        setLoading(true);
        publicAPI.list({ page, limit: 9 }).then(res => {
            setPosts(res.data.posts);
            setTotalPages(res.data.pagination.totalPages);
        }).finally(() => setLoading(false));
    }, [page, searchResults]);

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!search.trim()) { setSearchResults(null); return; }
        setLoading(true);
        try {
            const res = await publicAPI.search(search);
            setSearchResults(res.data.posts);
        } catch (e) { setSearchResults([]); }
        finally { setLoading(false); }
    };

    const clearSearch = () => { setSearch(''); setSearchResults(null); };
    const displayPosts = searchResults !== null ? searchResults : posts;

    const excerpt = (content) => content ? content.slice(0, 180).replace(/[#*`]/g, '') + (content.length > 180 ? '…' : '') : '';

    return (
        <div>
            {/* Header */}
            <header className="blog-header">
                <div className="blog-header-inner">
                    <h2 style={{ fontSize: '1.2rem', background: 'linear-gradient(135deg,#6c63ff,#ff6584)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        ✍️ ContentFlow
                    </h2>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', fontSize: '0.875rem' }}>
                        <Link to="/blog" style={{ color: 'var(--text-secondary)' }}>Blog</Link>
                        <Link to="/login" className="btn btn-primary btn-sm">Author Login</Link>
                    </div>
                </div>
            </header>

            {/* Hero */}
            <div className="blog-hero">
                <h1 style={{ marginBottom: '0.75rem' }}>Published Articles</h1>
                <p style={{ maxWidth: '500px', margin: '0 auto 1.5rem', color: 'var(--text-secondary)' }}>
                    Browse the latest published content from our authors
                </p>

                {/* Search */}
                <form onSubmit={handleSearch} style={{ maxWidth: '500px', margin: '0 auto', display: 'flex', gap: '0.75rem' }}>
                    <input
                        type="search"
                        placeholder="Search articles..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        style={{ flex: 1, background: 'var(--bg-tertiary)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', padding: '0.75rem 1rem', fontFamily: 'inherit', fontSize: '0.9rem', outline: 'none' }}
                    />
                    <button type="submit" className="btn btn-primary">Search</button>
                    {searchResults !== null && <button type="button" className="btn btn-secondary" onClick={clearSearch}>Clear</button>}
                </form>

                {searchResults !== null && (
                    <p style={{ marginTop: '1rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                        {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} for "{search}"
                    </p>
                )}
            </div>

            {/* Posts grid */}
            <main style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 1.5rem 3rem' }}>
                {loading ? (
                    <div className="loading">Loading posts…</div>
                ) : displayPosts.length === 0 ? (
                    <div className="empty-state">
                        <h3>{searchResults !== null ? 'No results found' : 'No published posts yet'}</h3>
                        <p>{searchResults !== null ? 'Try a different search term' : 'Check back later!'}</p>
                    </div>
                ) : (
                    <>
                        <div className="post-cards-grid">
                            {displayPosts.map(post => (
                                <article key={post.id} className="post-card-pub" onClick={() => navigate(`/blog/${post.id}`)}>
                                    <div className="post-title">{post.title}</div>
                                    <div className="post-excerpt">{excerpt(post.content)}</div>
                                    <div className="post-meta">
                                        <span>by {post.author?.username || 'Unknown'}</span>
                                        <span>{new Date(post.published_at).toLocaleDateString()}</span>
                                    </div>
                                </article>
                            ))}
                        </div>

                        {searchResults === null && totalPages > 1 && (
                            <div className="pagination">
                                <button disabled={page === 1} onClick={() => setPage(p => p - 1)}>‹</button>
                                {[...Array(totalPages)].map((_, i) => (
                                    <button key={i} className={page === i + 1 ? 'active' : ''} onClick={() => setPage(i + 1)}>{i + 1}</button>
                                ))}
                                <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>›</button>
                            </div>
                        )}
                    </>
                )}
            </main>
        </div>
    );
}
