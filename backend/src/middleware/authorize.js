/**
 * Role-based authorization middleware factory.
 * Usage: authorize('author') or authorize('admin', 'author')
 */
function authorize(...roles) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ success: false, message: 'Authentication required' });
        }
        if (roles.length > 0 && !roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: `Access denied. Required role: ${roles.join(' or ')}`,
            });
        }
        next();
    };
}

module.exports = { authorize };
