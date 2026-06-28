const mongoose = require('mongoose');

const postRevisionSchema = new mongoose.Schema({
    post_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', required: true },
    title_snapshot: { type: String, required: true, maxlength: 500 },
    content_snapshot: { type: String, default: '' },
    revision_author_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    revision_timestamp: { type: Date, default: Date.now }
});

postRevisionSchema.virtual('id').get(function() { return this._id.toHexString(); });
postRevisionSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('PostRevision', postRevisionSchema);
