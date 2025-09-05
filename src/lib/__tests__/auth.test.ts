import { generateToken, verifyToken, hashPassword, comparePassword } from '../auth'
import jwt from 'jsonwebtoken'

// Mock jsonwebtoken
jest.mock('jsonwebtoken')
const mockedJwt = jwt as jest.Mocked<typeof jwt>

// Mock bcryptjs
jest.mock('bcryptjs', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}))

const bcrypt = require('bcryptjs')

describe('Auth Utils', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.JWT_SECRET = 'test-secret'
  })

  describe('generateToken', () => {
    it('should generate a JWT token with correct payload', () => {
      const mockToken = 'mock-jwt-token'
      mockedJwt.sign.mockReturnValue(mockToken)

      const payload = { userId: 'test-user-id', email: 'test@example.com' }
      const result = generateToken(payload)

      expect(mockedJwt.sign).toHaveBeenCalledWith(
        payload,
        'test-secret',
        { expiresIn: '1h' }
      )
      expect(result).toBe(mockToken)
    })

    it('should use custom expiration when provided', () => {
      const mockToken = 'mock-jwt-token'
      mockedJwt.sign.mockReturnValue(mockToken)

      const payload = { userId: 'test-user-id' }
      generateToken(payload, '24h')

      expect(mockedJwt.sign).toHaveBeenCalledWith(
        payload,
        'test-secret',
        { expiresIn: '24h' }
      )
    })
  })

  describe('verifyToken', () => {
    it('should verify a valid token', () => {
      const mockPayload = { userId: 'test-user-id', email: 'test@example.com' }
      mockedJwt.verify.mockReturnValue(mockPayload as any)

      const result = verifyToken('valid-token')

      expect(mockedJwt.verify).toHaveBeenCalledWith('valid-token', 'test-secret')
      expect(result).toEqual(mockPayload)
    })

    it('should return null for invalid token', () => {
      mockedJwt.verify.mockImplementation(() => {
        throw new Error('Invalid token')
      })

      const result = verifyToken('invalid-token')

      expect(result).toBeNull()
    })

    it('should return null when JWT_SECRET is not set', () => {
      delete process.env.JWT_SECRET

      const result = verifyToken('any-token')

      expect(result).toBeNull()
    })
  })

  describe('hashPassword', () => {
    it('should hash password with correct salt rounds', async () => {
      const hashedPassword = 'hashed-password'
      bcrypt.hash.mockResolvedValue(hashedPassword)

      const result = await hashPassword('plain-password')

      expect(bcrypt.hash).toHaveBeenCalledWith('plain-password', 12)
      expect(result).toBe(hashedPassword)
    })

    it('should handle hashing errors', async () => {
      bcrypt.hash.mockRejectedValue(new Error('Hashing failed'))

      await expect(hashPassword('password')).rejects.toThrow('Hashing failed')
    })
  })

  describe('comparePassword', () => {
    it('should return true for matching passwords', async () => {
      bcrypt.compare.mockResolvedValue(true)

      const result = await comparePassword('plain-password', 'hashed-password')

      expect(bcrypt.compare).toHaveBeenCalledWith('plain-password', 'hashed-password')
      expect(result).toBe(true)
    })

    it('should return false for non-matching passwords', async () => {
      bcrypt.compare.mockResolvedValue(false)

      const result = await comparePassword('wrong-password', 'hashed-password')

      expect(result).toBe(false)
    })

    it('should handle comparison errors', async () => {
      bcrypt.compare.mockRejectedValue(new Error('Comparison failed'))

      await expect(comparePassword('password', 'hash')).rejects.toThrow('Comparison failed')
    })
  })
})