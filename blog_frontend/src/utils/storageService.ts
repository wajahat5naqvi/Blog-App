/**
 * Storage service for safely interacting with browser localStorage
 * Handles SSR by checking if window is defined
 */

/**
 * Gets a value from localStorage with type safety
 * @param key The key to retrieve from storage
 * @returns The parsed value or null if not found
 */
export function getLocalStorage<T>(key: string): T | null {
  if (typeof window === 'undefined') {
    return null;
  }
  
  try {
    const item = window.localStorage.getItem(key);
    return item ? JSON.parse(item) as T : null;
  } catch (e) {
    console.error(`Error retrieving ${key} from localStorage:`, e);
    return null;
  }
}

/**
 * Sets a value in localStorage with type safety
 * @param key The key to set
 * @param value The value to store
 */
export function setLocalStorage<T>(key: string, value: T): void {
  if (typeof window === 'undefined') {
    return;
  }
  
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error(`Error setting ${key} in localStorage:`, e);
  }
}

/**
 * Removes a value from localStorage
 * @param key The key to remove
 */
export function removeLocalStorage(key: string): void {
  if (typeof window === 'undefined') {
    return;
  }
  
  try {
    window.localStorage.removeItem(key);
  } catch (e) {
    console.error(`Error removing ${key} from localStorage:`, e);
  }
}

/**
 * Clears all data in localStorage
 */
export function clearLocalStorage(): void {
  if (typeof window === 'undefined') {
    return;
  }
  
  try {
    window.localStorage.clear();
  } catch (e) {
    console.error('Error clearing localStorage:', e);
  }
}