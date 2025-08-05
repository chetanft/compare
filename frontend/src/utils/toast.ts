/**
 * Simple toast notification utility
 */

interface ToastOptions {
  title: string;
  description?: string;
  status: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
  isClosable?: boolean;
}

/**
 * Show a toast notification
 * This is a simple implementation that logs to console
 * In a real app, this would use a UI toast library
 */
export const toast = (options: ToastOptions) => {
  const { title, description, status, duration = 3000 } = options;
  
  console.log(`[TOAST - ${status.toUpperCase()}] ${title}${description ? ': ' + description : ''}`);
  
  // In a real app, this would show a UI toast
  // For now, we'll just log to console
  
  // You can replace this with a real toast library implementation
  // like react-toastify, react-hot-toast, or @chakra-ui/toast
};

export default toast; 