export type UserRole = 'ADMIN' | 'USER'

export interface User {
  id: string
  email: string
  password: string
  name: string
  role: UserRole
  createdAt: Date
  updatedAt: Date
}

export interface PublicUser {
  id: string
  email: string
  name: string
  role: UserRole
  createdAt: Date
  updatedAt: Date
}

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  email: string
  password: string
  name: string
}

export interface AuthResponse {
  token: string
  user: {
    id: string
    email: string
    name: string
    role: UserRole
  }
}

export interface JwtPayload {
  sub: string
  email: string
  role: UserRole
  iat?: number
  exp?: number
}
