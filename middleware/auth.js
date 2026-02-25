const jwt = require('jsonwebtoken');

// Verify JWT token
const verifyToken = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '') || 
                req.cookies?.token ||
                req.query.token;

  if (!token) {
    return res.status(401).json({ 
      success: false, 
      message: 'Access denied. No token provided.' 
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(400).json({ 
      success: false, 
      message: 'Invalid token.' 
    });
  }
};

// Check if user has required role
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required.' 
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        success: false, 
        message: 'Insufficient permissions.' 
      });
    }

    next();
  };
};

// Optional authentication - doesn't fail if no token
const optionalAuth = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '') || 
                req.cookies?.token ||
                req.query.token;

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;
    } catch (error) {
      // Continue without user if token is invalid
      console.warn('Invalid token provided:', error.message);
    }
  }
  
  next();
};

module.exports = {
  verifyToken,
  requireRole,
  optionalAuth
};