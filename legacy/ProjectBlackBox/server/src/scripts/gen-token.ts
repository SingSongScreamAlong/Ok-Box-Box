
import jwt from 'jsonwebtoken'; const { sign } = jwt;
import { v4 as uuidv4 } from 'uuid';

const JWT_SECRET = process.env.JWT_SECRET || 'development-secret-change-in-production';

const token = sign(
    {
        id: uuidv4(),
        email: 'admin@pitbox.com',
        role: 'admin'
    },
    JWT_SECRET,
    { expiresIn: '24h' }
);

console.log(token);
