import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

const generateToken = (userId) => {
  const payload = { sub: userId };
  const secret = process.env.JWT_SECRET ;
  const options = { expiresIn: '1h' }; // Token expires in 1 hour

  return jwt.sign(payload, secret, options);
};

export default generateToken;