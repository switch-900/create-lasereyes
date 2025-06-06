import React from 'react';
import { cn } from '@/lib/utils';
import { 
  BitmapValidationStatus, 
  getValidationStatusColors, 
  getValidationStatusIcon 
} from '@/lib/utils';

interface ValidationStatusIndicatorProps {
  status: BitmapValidationStatus;
  message?: string;
  showIcon?: boolean;
  showText?: boolean;
  variant?: 'dot' | 'badge' | 'inline';
  className?: string;
}

/**
 * Color-coded validation status indicator component
 * Displays bitmap validation status with appropriate colors and icons
 */
export function ValidationStatusIndicator({
  status,
  message,
  showIcon = true,
  showText = true,
  variant = 'inline',
  className
}: ValidationStatusIndicatorProps) {
  const colors = getValidationStatusColors(status);
  const icon = getValidationStatusIcon(status);
  
  const getStatusText = () => {
    switch (status) {
      case 'valid':
        return 'Valid';
      case 'invalid':
        return 'Invalid';
      case 'pending':
        return 'Pending';
      case 'unknown':
      default:
        return 'Unknown';
    }
  };

  if (variant === 'dot') {
    return (
      <div 
        className={cn(
          "w-2 h-2 rounded-full",
          colors.dot,
          className
        )}
        title={message || getStatusText()}
      />
    );
  }

  if (variant === 'badge') {
    return (
      <div 
        className={cn(
          "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border",
          colors.text,
          colors.bg,
          colors.border,
          className
        )}
        title={message}
      >
        {showIcon && (
          <span className="text-xs">{icon}</span>
        )}
        {showText && (
          <span>{getStatusText()}</span>
        )}
      </div>
    );
  }

  // Inline variant (default)
  return (
    <div 
      className={cn(
        "inline-flex items-center gap-1",
        colors.text,
        className
      )}
      title={message}
    >
      {showIcon && (
        <span className="text-xs">{icon}</span>
      )}
      {showText && (
        <span className="text-xs font-medium">{getStatusText()}</span>
      )}
    </div>
  );
}
