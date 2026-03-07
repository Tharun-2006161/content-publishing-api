import { useState, useEffect } from 'react';
import { postsAPI } from '../api';

export default function RevisionsModal({ post, onClose }) {
    const [revisions, setRevisions] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        postsAPI.revisions(post.id)
            .then(r => setRevisions(r.data.revisions))
            .finally(() => setLoading(false));
    }, [post.id]);

    return (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="modal">
                <div className="modal-header">
                    <h3>📜 Revision History</h3>
                    <button className="modal-close" onClick={onClose}>×</button>
                </div>
                <p style={{ marginBottom: '1.5rem', fontSize: '0.875rem' }}>
                    Post: <strong style={{ color: 'var(--text-primary)' }}>{post.title}</strong>
                </p>

                {loading ? (
                    <div className="loading">Loading revisions…</div>
                ) : revisions.length === 0 ? (
                    <div className="empty-state">
                        <p>No revisions yet. Revisions are created when you update a post.</p>
                    </div>
                ) : (
                    <div className="timeline">
                        {revisions.map((rev, i) => (
                            <div key={rev.revision_id} className="timeline-item">
                                <div className="timeline-meta">
                                    Revision {i + 1} &nbsp;·&nbsp;
                                    {rev.revision_author} &nbsp;·&nbsp;
                                    {new Date(rev.revision_timestamp).toLocaleString()}
                                </div>
                                <div className="timeline-content">
                                    <div className="timeline-title">"{rev.title_snapshot}"</div>
                                    <div className="timeline-body">{rev.content_snapshot || '(empty content)'}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
