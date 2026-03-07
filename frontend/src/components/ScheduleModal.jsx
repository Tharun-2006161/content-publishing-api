import { useState } from 'react';
import { postsAPI } from '../api';

export default function ScheduleModal({ post, onClose, onScheduled }) {
    const [scheduledFor, setScheduledFor] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Default to 1 hour from now
    const minDate = new Date(Date.now() + 60000).toISOString().slice(0, 16);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await postsAPI.schedule(post.id, new Date(scheduledFor).toISOString());
            onScheduled();
        } catch (err) {
            setError(err.response?.data?.message || 'Scheduling failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="modal" style={{ maxWidth: '420px' }}>
                <div className="modal-header">
                    <h3>🕐 Schedule Post</h3>
                    <button className="modal-close" onClick={onClose}>×</button>
                </div>
                <p style={{ marginBottom: '1.5rem', fontSize: '0.875rem' }}>
                    Schedule: <strong style={{ color: 'var(--text-primary)' }}>{post.title}</strong>
                </p>

                {error && <div className="alert alert-error">{error}</div>}

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Publish Date & Time</label>
                        <input
                            type="datetime-local"
                            value={scheduledFor}
                            min={minDate}
                            onChange={e => setScheduledFor(e.target.value)}
                            required
                        />
                    </div>
                    <div className="flex-gap">
                        <button type="submit" className="btn btn-warning" disabled={loading}>
                            {loading ? 'Scheduling...' : '📅 Schedule'}
                        </button>
                        <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
                    </div>
                </form>
            </div>
        </div>
    );
}
