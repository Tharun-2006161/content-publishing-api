const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
    title: { type: String, required: true, maxlength: 500 },
    slug: { type: String, required: true, unique: true, maxlength: 600 },
    content: { type: String, default: '' },
    status: { type: String, enum: ['draft', 'scheduled', 'published'], default: 'draft' },
    author_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    scheduled_for: { type: Date, default: null },
    published_at: { type: Date, default: null }
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

postSchema.index({ title: 'text', content: 'text' });
postSchema.virtual('id').get(function() { return this._id.toHexString(); });
postSchema.virtual('author', {
    ref: 'User',
    localField: 'author_id',
    foreignField: '_id',
    justOne: true
});
postSchema.set('toJSON', { virtuals: true });
postSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Post', postSchema);
