// Validation utilities

export const validatePhone = (phone) => {
  // Indian phone number validation (10 digits starting with 6-9)
  const phoneRegex = /^[6-9]\d{9}$/;
  return phoneRegex.test(phone);
};

export const validatePassword = (password) => {
  // Minimum 6 characters
  return password && password.length >= 6;
};

export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validateNumber = (value) => {
  return !isNaN(value) && value > 0;
};

export const validateRequired = (value) => {
  return value !== undefined && value !== null && value.toString().trim() !== '';
};
