export const validateClubName = (name: string): { valid: boolean; error?: string } => {
  if (!name || typeof name !== 'string') {
    return { valid: false, error: 'Club name is required' };
  }

  const trimmed = name.trim();

  if (trimmed.length < 1) {
    return { valid: false, error: 'Club name cannot be empty' };
  }

  if (trimmed.length > 100) {
    return { valid: false, error: 'Club name must be 100 characters or less' };
  }

  // Allow alphanumeric, spaces, hyphens, underscores
  const validPattern = /^[a-zA-Z0-9\s\-_]+$/;
  if (!validPattern.test(trimmed)) {
    return { valid: false, error: 'Club name contains invalid characters' };
  }

  return { valid: true };
};

export const validateEthAmount = (amount: string): { valid: boolean; error?: string } => {
  if (!amount || typeof amount !== 'string') {
    return { valid: false, error: 'Amount is required' };
  }

  // Check if it's a valid number
  const num = parseFloat(amount);
  if (isNaN(num)) {
    return { valid: false, error: 'Amount must be a valid number' };
  }

  if (num <= 0) {
    return { valid: false, error: 'Amount must be greater than 0' };
  }

  // Limit to reasonable maximum (e.g., 1000 ETH)
  if (num > 1000) {
    return { valid: false, error: 'Amount exceeds maximum allowed (1000 ETH)' };
  }

  // Check decimal places (max 18 for ETH)
  const parts = amount.split('.');
  if (parts.length > 1 && parts[1].length > 18) {
    return { valid: false, error: 'Amount has too many decimal places (max 18)' };
  }

  return { valid: true };
};
