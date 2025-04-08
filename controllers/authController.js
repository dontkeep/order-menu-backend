const bcrypt = require('bcrypt');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const register = async (req, res, next) => {
  try {
    const { first_name, last_name, email, password, phone_number, address_detail, province, city, regency, district, role_id } = req.body;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) return res.status(400).send('User already exists');

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert new user
    await prisma.user.create({
      data: {
        first_name,
        last_name,
        email,
        password: hashedPassword,
        phone_number,
        address_detail,
        province,
        city,
        regency,
        district,
        role_id
      }
    });

    res.status(201).send('User registered');
  } catch (err) {
    next(err);
  }
};

const login = async (req, res, next) => {
  const { email, password } = req.body;

  try {
    // Check if user exists
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(400).send('Invalid email or password');

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).send('Invalid email or password');

    // Create session
    const sessionId = crypto.randomBytes(16).toString('hex');
    const expiresAt = new Date(Date.now() + 3600000); // 1 hour from now
    await prisma.session.create({
      data: {
        session_id: sessionId,
        user_id: user.id,
        expires_at: expiresAt
      }
    });

    const token = jwt.sign({ sessionId }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.json({ message: 'Login successful', token });
  } catch (err) {
    next(err);
  }
};

const logout = async (req, res, next) => {
  try {
    const token = req.headers.authorization.split(' ')[1];

    jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
      if (err) return res.status(401).send('Invalid token');

      await prisma.session.delete({ where: { session_id: decoded.sessionId } });
      res.status(200).send('Logout successful');
    });
  } catch (err) {
    next(err);
  }
};

const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  // Check if the Authorization header exists
  if (!authHeader) {
    return res.status(401).send('Access denied. No token provided.');
  }

  // Check if the Authorization header is properly formatted
  const token = authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).send('Access denied. Invalid token format.');
  }

  jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
    if (err) return res.status(401).send('Invalid token.');

    const session = await prisma.session.findUnique({
      where: { session_id: decoded.sessionId },
      include: { user: true } // Include user details
    });

    if (!session || new Date(session.expires_at) < new Date()) {
      return res.status(401).send('Session expired.');
    }

    req.user = {
      id: session.user.id, // Attach user ID
      role_id: session.user.role_id, // Attach user role
      email: session.user.email // Attach user email (optional)
    };
    next();
  });
};

const checkRole = (role) => (req, res, next) => {
  if (req.user.role_id !== role) return res.status(403).send('Access denied.');
  next();
}

module.exports = {
  register,
  login,
  logout,
  verifyToken,
  checkRole // Ensure checkRole is exported
};
