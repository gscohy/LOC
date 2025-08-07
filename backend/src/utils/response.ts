export const successResponse = (data?: any, message?: string) => ({
  success: true,
  message: message || 'Opération réussie',
  data,
});

export const errorResponse = (message: string, details?: any) => ({
  success: false,
  message,
  error: details,
});