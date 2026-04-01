// VCCA - Shared Copy to Clipboard Hook
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { useState, useCallback } from 'react';
import { toast } from 'sonner';

interface UseCopyToClipboardOptions {
  /**
   * Duration in milliseconds to show visual feedback
   * @default 2000
   */
  feedbackDuration?: number;
  
  /**
   * Whether to show toast notifications on successful copy
   * @default true
   */
  showToast?: boolean;
  
  /**
   * Custom success message for toast. If not provided, will use "Copied to clipboard"
   */
  toastMessage?: string;
  
  /**
   * Whether to use document.execCommand as fallback for older browsers
   * @default true
   */
  useFallback?: boolean;
}

interface UseCopyToClipboardReturn {
  /**
   * Copy text to clipboard with visual feedback and error handling
   */
  copyToClipboard: (text: string, customMessage?: string) => Promise<boolean>;
  
  /**
   * Map of recently copied items (text -> copied state)
   * Useful for tracking visual feedback state per item
   */
  copiedItems: Map<string, boolean>;
  
  /**
   * Simple boolean for single-item scenarios
   */
  copied: boolean;
  
  /**
   * Last error that occurred during copy operation
   */
  error: string | null;
}

export function useCopyToClipboard(options: UseCopyToClipboardOptions = {}): UseCopyToClipboardReturn {
  const {
    feedbackDuration = 2000,
    showToast = true,
    toastMessage,
    useFallback = true,
  } = options;

  const [copiedItems, setCopiedItems] = useState<Map<string, boolean>>(new Map());
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const copyToClipboard = useCallback(async (text: string, customMessage?: string): Promise<boolean> => {
    try {
      setError(null);

      // Try modern clipboard API first
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else if (useFallback) {
        // Fallback for older browsers or insecure contexts
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'absolute';
        textArea.style.opacity = '0';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        
        if (!successful) {
          throw new Error('execCommand copy failed');
        }
      } else {
        throw new Error('Clipboard API not available');
      }

      // Update visual feedback state
      setCopied(true);
      setCopiedItems(prev => new Map(prev).set(text, true));

      // Show toast notification
      if (showToast) {
        const message = customMessage || toastMessage || 'Copied to clipboard';
        toast.success(message);
      }

      // Clear visual feedback after duration
      setTimeout(() => {
        setCopied(false);
        setCopiedItems(prev => {
          const next = new Map(prev);
          next.delete(text);
          return next;
        });
      }, feedbackDuration);

      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to copy to clipboard';
      setError(errorMessage);
      
      if (showToast) {
        toast.error(errorMessage);
      }
      
      console.error('Copy to clipboard failed:', err);
      return false;
    }
  }, [feedbackDuration, showToast, toastMessage, useFallback]);

  return {
    copyToClipboard,
    copiedItems,
    copied,
    error,
  };
}