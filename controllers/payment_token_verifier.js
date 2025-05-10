const jwt = require("jsonwebtoken");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();


async function verifyUserFromToken(authHeader) {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new Error("Unauthorized");
  }

  const token = authHeader.split(" ")[1];
  let sessionId;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    sessionId = decoded.sessionId; // Extract session_id from the token
  } catch (err) {
    throw new Error("Invalid token");
  }

  const session = await prisma.session.findUnique({
    where: { session_id: sessionId },
    select: { user_id: true, expires_at: true }
  });

  if (!session || new Date(session.expires_at) < new Date()) {
    throw new Error("Session not found or expired");
  }

  return session.user_id; // Return the user_id
}

module.exports = { verifyUserFromToken };