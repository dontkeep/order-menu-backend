const db = require('../config/db');

const checkRole = (requiredRole) => {
  return (req, res, next) => {
    const userId = req.user.id;

    db.query('SELECT role_id FROM User WHERE id = ?', [userId], (err, results) => {
      if (err) return res.status(500).send('Server error');
      if (results.length === 0) return res.status(404).send('User not found');

      const userRole = results[0].role_id;
      if (userRole !== requiredRole) return res.status(403).send('Access denied');

      next();
    });
  };
};

module.exports = checkRole;
