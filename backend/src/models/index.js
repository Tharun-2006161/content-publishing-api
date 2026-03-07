const User = require('./User');
const Post = require('./Post');
const PostRevision = require('./PostRevision');

// Associations
User.hasMany(Post, { foreignKey: 'author_id', as: 'posts' });
Post.belongsTo(User, { foreignKey: 'author_id', as: 'author' });

Post.hasMany(PostRevision, { foreignKey: 'post_id', as: 'revisions', onDelete: 'CASCADE' });
PostRevision.belongsTo(Post, { foreignKey: 'post_id', as: 'post' });

User.hasMany(PostRevision, { foreignKey: 'revision_author_id', as: 'revisions' });
PostRevision.belongsTo(User, { foreignKey: 'revision_author_id', as: 'revisionAuthor' });

module.exports = { User, Post, PostRevision };
