const DEFAULT_MESSAGE = 'Something went wrong. Please try again.'

const firebaseErrorMessages = {
  'auth/invalid-credential': 'Email or password is incorrect.',
  'auth/invalid-email': 'Enter a valid email address.',
  'auth/user-disabled': 'This account has been disabled. Contact support.',
  'auth/user-not-found': 'No account exists for this email address.',
  'auth/wrong-password': 'Email or password is incorrect.',
  'auth/too-many-requests': 'Too many attempts. Try again in a few minutes.',
  'auth/network-request-failed': 'Network error. Check your connection and try again.',
  'auth/email-already-in-use': 'An account already exists with this email.',
  'auth/weak-password': 'Password should be at least 6 characters.',
  'auth/missing-email': 'Email cannot be empty.',
  'auth/missing-password': 'Password cannot be empty.',
  'auth/operation-not-allowed': 'This sign-in method is disabled for now.',

  'storage/canceled': 'Upload was cancelled before it completed.',
  'storage/unauthorized': 'You do not have permission to upload this file.',
  'storage/quota-exceeded': 'Storage quota exceeded. Remove files or try later.',
  'storage/retry-limit-exceeded': 'Upload took too long. Try again.',

  'permission-denied': 'You do not have permission to perform this action.',
  'unavailable': 'Service is temporarily unavailable. Please retry shortly.',
  'cancelled': 'Request was cancelled before completing.',
  'deadline-exceeded': 'Request timed out. Please retry.',
  'not-found': 'Requested record was not found.',
  'resource-exhausted': 'Quota exceeded. Please try again later.',
  'aborted': 'Operation aborted due to a conflicting change. Reload the page.',
}

const firebasePrefix = /^Firebase: (?:Error )?/i
const firebaseCodeSuffix = /\((?:auth|firestore|storage|functions|messaging|database)\/[^(]+\)\.?$/i

const normalizeCode = (code) => (typeof code === 'string' ? code.toLowerCase() : '')

const sanitizeFirebaseString = (message) => {
  if (typeof message !== 'string' || !message.trim()) {
    return ''
  }
  if (!firebasePrefix.test(message)) {
    return message.trim()
  }
  const withoutPrefix = message.replace(firebasePrefix, '').trim()
  const withoutSuffix = withoutPrefix.replace(firebaseCodeSuffix, '').trim()
  return withoutSuffix || ''
}

export const resolveErrorMessage = (error, { fallbackMessage = DEFAULT_MESSAGE, overrides = {} } = {}) => {
  if (!error) {
    return fallbackMessage
  }

  if (typeof error === 'string') {
    return error
  }

  const normalizedCode = normalizeCode(error.code)
  if (normalizedCode) {
    if (overrides[normalizedCode]) {
      return overrides[normalizedCode]
    }
    if (firebaseErrorMessages[normalizedCode]) {
      return firebaseErrorMessages[normalizedCode]
    }
  }

  const cleaned = sanitizeFirebaseString(error.message)
  if (cleaned) {
    return cleaned
  }

  return fallbackMessage
}

export default resolveErrorMessage
