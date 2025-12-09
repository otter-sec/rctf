import { validate as emailValidator } from 'email-validator'

export const validateEmail = (email: string): boolean => {
  return emailValidator(email)
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

export function normalizeName(name: string): string {
  return name.trim()
}
