export const API_BASE = 
  typeof window !== 'undefined' 
    ? (process.env.NEXT_PUBLIC_API_BASE || "http://localhost:4000/api")
    : (process.env.NEXT_PUBLIC_API_BASE || "http://localhost:4000/api");
