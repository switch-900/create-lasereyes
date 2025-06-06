import { useState, useEffect, useCallback } from 'react';
import { 
  validateBitmapContent, 
  BitmapValidationResult, 
  BitmapValidationStatus 
} from '@/lib/utils';

interface UseBitmapValidationOptions {
  content?: string;
  inscriptionId?: string;
  autoValidate?: boolean;
}

interface UseBitmapValidationReturn {
  validationResult: BitmapValidationResult | null;
  isValidating: boolean;
  error: string | null;
  validateNow: () => Promise<void>;
  resetValidation: () => void;
}

/**
 * Hook for managing bitmap validation status
 * Provides real-time validation of bitmap content with caching
 */
export function useBitmapValidation(options: UseBitmapValidationOptions): UseBitmapValidationReturn {
  const { content, inscriptionId, autoValidate = true } = options;
  
  const [validationResult, setValidationResult] = useState<BitmapValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationCache] = useState(new Map<string, BitmapValidationResult>());

  const validateNow = useCallback(async () => {
    if (!content) {
      setValidationResult(null);
      return;
    }

    // Create cache key
    const cacheKey = `${content}:${inscriptionId || 'no-id'}`;
    
    // Check cache first
    const cachedResult = validationCache.get(cacheKey);
    if (cachedResult) {
      setValidationResult(cachedResult);
      return;
    }

    setIsValidating(true);
    setError(null);

    try {
      const result = await validateBitmapContent(content, inscriptionId);
      
      // Cache the result
      validationCache.set(cacheKey, result);
      setValidationResult(result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown validation error';
      setError(errorMessage);
      setValidationResult({
        status: 'invalid',
        message: errorMessage,
        details: { inscriptionId }
      });
    } finally {
      setIsValidating(false);
    }
  }, [content, inscriptionId, validationCache]);

  const resetValidation = useCallback(() => {
    setValidationResult(null);
    setError(null);
    setIsValidating(false);
  }, []);

  // Auto-validate when content or inscriptionId changes
  useEffect(() => {
    if (autoValidate && content) {
      validateNow();
    }
  }, [content, inscriptionId, autoValidate, validateNow]);

  return {
    validationResult,
    isValidating,
    error,
    validateNow,
    resetValidation
  };
}

/**
 * Simple hook that returns just the validation status for a given content
 * Useful when you only need the status without full validation details
 */
export function useBitmapValidationStatus(content?: string, inscriptionId?: string): BitmapValidationStatus {
  const { validationResult } = useBitmapValidation({ 
    content, 
    inscriptionId, 
    autoValidate: true 
  });
  
  return validationResult?.status || 'unknown';
}
