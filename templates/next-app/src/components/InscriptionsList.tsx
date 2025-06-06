/**
 * InscriptionsList Component
 * Renders a list of inscriptions with filtering and validation capabilities
 * Features:
 * - Displays inscriptions, runes, and cardinal UTXOs
 * - Supports filtering by type (bitmap, parcel)
 * - Validates bitmap inscriptions
 * - Virtual scrolling for performance
 * - Content caching
 */
// Import dependencies
import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuPortal,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { useInscriptions, type Inscription, type UTXO, type RuneUtxo } from '@/hooks/useInscriptions';
import { ValidationStatusIndicator } from '@/components/ValidationStatusIndicator';
import { useBitmapValidation } from '@/hooks/useBitmapValidation';
import { useLaserEyes } from "@omnisat/lasereyes";
import { useVirtualizer } from '@tanstack/react-virtual';
import UtxoFilter from './UtxoFilter';
import { FilterType, ShowTypes } from '@/types';

// Constants for UI configuration
const CONSTANTS = {
  ITEMS_PER_PAGE: 50,        // Number of items per page
  ITEM_HEIGHT: 100,         // Reduced height for more compact cards
  BASE_URL: 'https://ordinals.com',
  MOBILE_BREAKPOINT: 768    // Mobile breakpoint in pixels
} as const;

// Component interfaces
/** Represents cached inscription content */
interface InscriptionContent {
  id: string;               // Inscription ID
  content: string | null;   // Content or null if not loaded
  isLoading: boolean;       // Loading state
  error: string | null;     // Error message if fetch failed
}
interface InscriptionsListProps {
  walletAddress?: string;
}
interface UtxoItemProps {
  utxo: UTXO;
  type: 'inscription' | 'rune' | 'cardinal';
  inscription?: Inscription;  // Add this to pass inscription data
}
type UTXOType = 'inscription' | 'rune' | 'cardinal';
type ListType = 'inscriptions' | 'runes' | 'cardinals';
type VirtualizerType = ReturnType<typeof useVirtualizer<HTMLDivElement, Element>>;

// Add these utility functions at the top
const isBitmapContent = (content: string | null) => {
  if (!content) return false;
  const cleanContent = content.trim();
  return /^\d+\.bitmap$/.test(cleanContent);
};

/** Main component implementation */
export default function InscriptionsList({ walletAddress }: InscriptionsListProps) {
  /**
   * UtxoItem - Renders individual UTXO items
   * Displays:
   * - UTXO ID
   * - Validation status for bitmaps
   * - Value in satoshis
   */
  const UtxoItem = React.memo(({ utxo, type, inscription }: UtxoItemProps) => {
    if (!utxo?.formattedId) return null;
    const runeInfo = type === 'rune' ? (utxo as RuneUtxo).runeInfo : undefined;
    
    // Parse bitmap/parcel number from content
    const bitmapInfo = useMemo(() => {
      if (!inscription?.content) return null;
      const match = inscription.content.match(/^(\d+)(?:\.(\d+))?\.bitmap$/);
      if (!match) return null;
      
      // For parcel format: parcel.block.bitmap
      // match[1] = parcel number, match[2] = block/bitmap number
      if (match[2]) {
        const result = {
          bitmapNumber: parseInt(match[2]), // Second number is the bitmap/block number
          parcelNumber: parseInt(match[1]), // First number is the parcel number
          isParcel: true
        };
        console.log(`Parcel parsing for ${inscription.content}:`, result);
        return result;
      } else {
        // For bitmap format: bitmap.bitmap
        const result = {
          bitmapNumber: parseInt(match[1]),
          parcelNumber: null,
          isParcel: false
        };
        console.log(`Bitmap parsing for ${inscription.content}:`, result);
        return result;
      }
    }, [inscription?.content]);

    // Get validation status for bitmap content (auto-validate all bitmap content)
    const { validationResult, isValidating } = useBitmapValidation({
      content: inscription?.content || undefined,
      inscriptionId: inscription?.inscriptionId,
      autoValidate: !!bitmapInfo  // Auto-validate all bitmaps and parcels
    });

    const getTypeIcon = () => {
      switch (type) {
        case 'inscription':
          return 'Inscription';
        case 'rune':
          return 'Rune';
        case 'cardinal':
          return 'Cardinal';
        default:
          return 'UTXO';
      }
    };

    const getTypeColor = () => {
      switch (type) {
        case 'inscription':
          return 'border-l-orange-500 bg-orange-50 dark:bg-orange-950/20';
        case 'rune':
          return 'border-l-purple-500 bg-purple-50 dark:bg-purple-950/20';
        case 'cardinal':
          return 'border-l-blue-500 bg-blue-50 dark:bg-blue-950/20';
        default:
          return 'border-l-gray-500 bg-gray-50 dark:bg-gray-950/20';
      }
    };

    return (
      <div className={`group relative border-l-4 ${getTypeColor()} rounded-lg p-2 transition-all duration-200 hover:shadow-md hover:scale-[1.01] border border-gray-200 dark:border-gray-700`}>
        {/* Header with type icon, UTXO ID, and Inscription ID */}
        <div className="flex items-center justify-between mb-2 gap-2">
          <div className="flex flex-col gap-1 min-w-0 flex-1">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-xs font-semibold px-2 py-1 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 flex-shrink-0">{getTypeIcon()}</span>
              <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                <span className="font-mono text-xs text-gray-600 dark:text-gray-400 break-all">
                  UTXO: {utxo.formattedId}
                </span>
                {type === 'inscription' && inscription?.inscriptionId && (
                  <div className="flex flex-col gap-0.5">
                    <span className="font-mono text-xs text-orange-600 dark:text-orange-400 break-all">
                      Inscription: {inscription.inscriptionId}
                    </span>
                    {inscription.inscriptionNumber && inscription.inscriptionNumber !== inscription.inscriptionId && (
                      <span className="font-mono text-xs text-orange-500 dark:text-orange-300 break-all">
                        Number: {inscription.inscriptionNumber}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
              {utxo.value?.toLocaleString() || 0} sats
            </span>
          </div>
        </div>

        {/* Bitmap/Parcel Information - Single Line Display */}
        {type === 'inscription' && bitmapInfo && (
          <div className="bg-white dark:bg-gray-800 rounded-lg p-2 border border-gray-200 dark:border-gray-600">
            <div className="flex items-center justify-between gap-2">
              {/* Parcel/Bitmap Name and Type Badge */}
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <span className="font-bold text-sm text-orange-600 dark:text-orange-400 break-all">
                  {bitmapInfo.isParcel ? (
                    <>
                      {bitmapInfo.parcelNumber}
                      <span className="text-orange-500 dark:text-orange-300">.{bitmapInfo.bitmapNumber}</span>
                    </>
                  ) : (
                    bitmapInfo.bitmapNumber
                  )}
                  <span className="text-gray-500 dark:text-gray-400">.bitmap</span>
                </span>
                <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium ${
                  bitmapInfo.isParcel 
                    ? 'bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300' 
                    : 'bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300'
                }`}>
                  {bitmapInfo.isParcel ? 'Parcel' : 'Bitmap'}
                </span>
              </div>
              
              {/* Validation Status - Inline with red for invalid */}
              <div className="flex items-center gap-1 flex-shrink-0">
                {isValidating ? (
                  <span className="text-xs text-blue-500 dark:text-blue-400 animate-pulse">
                    Validating...
                  </span>
                ) : (
                  <>
                    <ValidationStatusIndicator
                      status={validationResult?.status || 'unknown'}
                      message={validationResult?.message}
                      variant="dot"
                    />
                    <span className={`text-xs font-medium ${
                      validationResult?.status === 'invalid' 
                        ? 'text-red-600 dark:text-red-400' 
                        : validationResult?.status === 'valid'
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-gray-500 dark:text-gray-400'
                    }`}>
                      {validationResult?.status === 'valid' ? 'Valid' :
                       validationResult?.status === 'invalid' ? 'Invalid' :
                       validationResult?.status === 'pending' ? 'Pending...' : 'Unknown'}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Rune Information */}
        {type === 'rune' && runeInfo && (
          <div className="bg-white dark:bg-gray-800 rounded-lg p-2 border border-gray-200 dark:border-gray-600">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold text-sm text-purple-600 dark:text-purple-400">
                  {runeInfo.name}
                </span>
                {runeInfo.symbol && (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300">
                    {runeInfo.symbol}
                  </span>
                )}
              </div>
              <div className="text-left sm:text-right">
                <div className="font-semibold text-purple-600 dark:text-purple-400 text-sm">
                  {runeInfo.amount?.toLocaleString()}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {runeInfo.divisibility === 0 ? 'units' : 'fractions'}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Cardinal UTXO - Simple display */}
        {type === 'cardinal' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg p-2 border border-gray-200 dark:border-gray-600">
            <div className="flex items-center justify-between">
              <span className="text-blue-600 dark:text-blue-400 font-medium text-sm">
                Cardinal UTXO
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Pure Bitcoin
              </span>
            </div>
          </div>
        )}
      </div>
    );
  });
  // State management
  const [filter, setFilter] = useState<FilterType>('all');
  const [contentCache, setContentCache] = useState<Record<string, InscriptionContent>>({});
  const [isContentLoading, setIsContentLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [hasInitialFetch, setHasInitialFetch] = useState(false);
  const [showTypes, setShowTypes] = useState<ShowTypes>({
    inscriptions: true,
    runes: true,
    cardinals: true
  });
  const [error, setError] = useState<string | null>(null);
  const { address, provider, isConnecting, disconnect } = useLaserEyes();
  const [currentAddress, setCurrentAddress] = useState<string | null>(null);
  const { inscriptions, runes, cardinals, isLoading, error: inscriptionsError, total, progress, fetchFromAddress, resetState } = useInscriptions();
  const displayAddress = useMemo(() => {
    if (!address) return '';
    const start = address.slice(0, 6);
    const end = address.slice(-6);
    return `${start}...${end}`;
  }, [address]);
  const filterStats = useMemo(() => ({
    total: inscriptions.length + runes.length + cardinals.length
  }), [inscriptions.length, runes.length, cardinals.length]);
  const dropdownContent = useMemo(() => ({
    inscriptions: inscriptions.length,
    runes: runes.length,
    cardinals: cardinals.length
  }), [inscriptions.length, runes.length, cardinals.length]);
  // Update the groupedUtxos memo
  const groupedUtxos = useMemo(() => {
    const filterInscriptions = (inscriptions: Inscription[]) => {
      console.log('Filtering inscriptions:', {
        total: inscriptions.length,
        filter,
        withContent: inscriptions.filter(i => i.content).length
      });
      if (filter === 'all') return inscriptions;
      return inscriptions.filter(insc => {
        const content = insc.content; // Use content directly from inscription
        console.log('Checking inscription:', {
          id: insc.inscriptionId,
          content,
          filter
        });
        if (!content) {
          console.log('No content for:', insc.inscriptionId);
          return false;
        }
        const cleanContent = content.trim();
        switch (filter) {
          case 'bitmap':
            const isBitmap = /^\d+\.bitmap$/.test(cleanContent);
            console.log('Bitmap check:', {
              id: insc.inscriptionId,
              content: cleanContent,
              isBitmap
            });
            return isBitmap;
          case 'parcel':
            const isParcel = /^\d+\.\d+\.bitmap$/.test(cleanContent);
            console.log('Parcel check:', {
              id: insc.inscriptionId,
              content: cleanContent,
              isParcel
            });
            return isParcel;
          default:
            return true;
        }
      });
    };
    const filtered = {
      inscriptions: showTypes.inscriptions ?
        filterInscriptions(inscriptions).filter(insc => insc.utxo?.formattedId) : [],
      runes: showTypes.runes ?
        runes.filter(utxo => utxo?.formattedId) : [],
      cardinals: showTypes.cardinals ?
        cardinals.filter(utxo => utxo?.formattedId) : []
    };
    console.log('Grouped UTXOs:', {
      filter,
      total: filtered.inscriptions.length + filtered.runes.length + filtered.cardinals.length,
      inscriptions: filtered.inscriptions.length,
      runes: filtered.runes.length,
      cardinals: filtered.cardinals.length,
      bitmapCount: filtered.inscriptions.filter(insc =>
        isBitmapContent(contentCache[insc.inscriptionId]?.content)
      ).length
    });
    return filtered;
  }, [inscriptions, runes, cardinals, showTypes, filter]);
  const handleFilterChange = useCallback((value: string) => {
    setFilter(value as FilterType);
  }, []);
  /**
   * Content fetching and validation
   * Handles:
   * - Fetching inscription content
   * - Content caching
   * - Bitmap validation
   * - Error handling
   */
  const fetchAndValidateContent = useCallback(async (inscriptionId: string) => {
    console.log('fetchAndValidateContent called with:', inscriptionId);
    try {
      // Check cache first
      const cachedContent = contentCache[inscriptionId]?.content;
      if (cachedContent) {
        console.log('Cache hit:', {
          inscriptionId,
          cachedContent
        });
        return cachedContent;
      }
      const url = `https://ordinals.com/content/${inscriptionId}`;
      console.log('Fetching from URL:', url);
      console.log('Request headers:', {
        'Accept': 'text/plain',
        'Cache-Control': 'no-cache'
      });
      const response = await fetch(url, {
        headers: {
          'Accept': 'text/plain',
          'Cache-Control': 'no-cache'
        }
      });
      console.log('Response status:', response.status);
      console.log('Response headers:', {
        contentType: response.headers.get('content-type'),
        contentLength: response.headers.get('content-length'),
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch content: ${response.status}`);
      }
      const rawContent = await response.text();
      console.log('Raw content received:', rawContent);
      // Clean and normalize content
      const cleanContent = rawContent.trim().replace(/\s+/g, '');
      console.log('Processed content:', {
        inscriptionId,
        rawContent,
        cleanContent,
        length: cleanContent.length
      });
      // Store in cache using functional update to ensure latest state
      setContentCache(prev => ({
        ...prev,
        [inscriptionId]: {
          id: inscriptionId,
          content: cleanContent,
          isLoading: false,
          error: null
        }
      }));
      return cleanContent;
    } catch (error) {
      console.error('=== Content fetch failed ===');
      console.error('Error details:', {
        inscriptionId,
        error: error instanceof Error ? {
          message: error.message,
          stack: error.stack
        } : error
      });
      setContentCache(prev => ({
        ...prev,
        [inscriptionId]: {
          id: inscriptionId,
          content: null,
          isLoading: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }));
      return null;
    }
  }, []); // Removed contentCache from dependencies
  // Update fetchContentBatch with better logging
  const fetchContentBatch = useCallback(async (inscriptionIds: string[]) => {
    console.log('=== Starting batch processing ===');
    console.log('Batch size:', inscriptionIds.length);
    console.log('Inscription IDs:', inscriptionIds);
    setIsContentLoading(true);
    try {
      const results = await Promise.allSettled(
        inscriptionIds.map(async (id) => {
          console.log(`Processing inscription: ${id}`);
          return fetchAndValidateContent(id);
        })
      );
      console.log('Batch results:', results.map((result, index) => ({
        inscriptionId: inscriptionIds[index],
        status: result.status,
        value: result.status === 'fulfilled' ? result.value : null,
        error: result.status === 'rejected' ? result.reason : null
      })));
      // Log success/failure statistics
      const succeeded = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;
      console.log('Batch processing statistics:', {
        total: inscriptionIds.length,
        succeeded,
        failed,
        successRate: `${((succeeded / inscriptionIds.length) * 1000).toFixed(1)}%`
      });
    } catch (error) {
      console.error('Batch processing failed:', error);
    } finally {
      setIsContentLoading(false);
      console.log('=== Batch processing completed ===');
    }
  }, [fetchAndValidateContent]);
  useEffect(() => {
    const handleWalletChange = async () => {
      if (!currentAddress || !provider || isConnecting) return;
      if (!hasInitialFetch) {
        console.log('Fetching inscriptions for wallet:', currentAddress);
        try {
          await fetchFromAddress(currentAddress);
          setHasInitialFetch(true);
        } catch (error) {
          console.error('Error fetching inscriptions:', error);
        }
      }
    };
    handleWalletChange();
  }, [currentAddress, provider, isConnecting, hasInitialFetch, fetchFromAddress]);
  useEffect(() => {
    if (!inscriptions?.length || isContentLoading || !hasInitialFetch) return;
    const unfetchedInscriptions = inscriptions.filter(inscription =>
      inscription.contentType?.includes('text/plain') &&
      !contentCache[inscription.inscriptionId]
    );
    if (unfetchedInscriptions.length > 0) {
      const inscriptionIds = unfetchedInscriptions.map(insc => insc.inscriptionId);
      fetchContentBatch(inscriptionIds);
    }
  }, [inscriptions, hasInitialFetch]);
  useEffect(() => {
    if (walletAddress) {
      console.log('Wallet address provided:', walletAddress);
      setCurrentAddress(walletAddress);
      setHasInitialFetch(false);
      setContentCache({});
      resetState();
    }
  }, [walletAddress, resetState]);
  useEffect(() => {
    const initializeFetch = async () => {
      if (!walletAddress) {
        console.log('No wallet address available');
        return;
      }
      if (!hasInitialFetch) {
        console.log('Initializing fetch for wallet:', walletAddress);
        try {
          await fetchFromAddress(walletAddress);
          setHasInitialFetch(true);
        } catch (error) {
          console.error('Error fetching inscriptions:', error);
        }
      }
    };
    initializeFetch();
  }, [walletAddress, hasInitialFetch, fetchFromAddress]);
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      console.error('InscriptionsList Error:', event.error);
      setError(event.error?.message || 'An unknown error occurred');
    };
    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);
  useEffect(() => {
    return () => {
      resetState();
      setContentCache({});
    };
  }, [resetState]);
  const inscriptionsRef = useRef<HTMLDivElement>(null);
  const runesRef = useRef<HTMLDivElement>(null);
  const cardinalsRef = useRef<HTMLDivElement>(null);
  const inscriptionsVirtualizer = useVirtualizer<HTMLDivElement, Element>({
    count: groupedUtxos.inscriptions.length,
    getScrollElement: () => inscriptionsRef.current,
    estimateSize: () => CONSTANTS.ITEM_HEIGHT,
    overscan: 5,
  });
  const runesVirtualizer = useVirtualizer<HTMLDivElement, Element>({
    count: groupedUtxos.runes.length,
    getScrollElement: () => runesRef.current,
    estimateSize: () => CONSTANTS.ITEM_HEIGHT,
    overscan: 5,
  });
  const cardinalsVirtualizer = useVirtualizer<HTMLDivElement, Element>({
    count: groupedUtxos.cardinals.length,
    getScrollElement: () => cardinalsRef.current,
    estimateSize: () => CONSTANTS.ITEM_HEIGHT,
    overscan: 5,
  });
  const renderUtxoList = useCallback((
    type: ListType,
    virtualizer: VirtualizerType,
    items: (Inscription | UTXO)[]
  ) => {
    if (!items.length) return null;
    
    const utxoType: UTXOType = type === 'inscriptions' ? 'inscription'
      : type === 'runes' ? 'rune'
      : 'cardinal';

    return (
      <>
        {items.map((item, index) => {
          const utxo = 'utxo' in item ? item.utxo : item;
          const inscription = 'inscriptionId' in item ? item : undefined;
          if (!utxo?.formattedId) return null;
          
          return (
            <UtxoItem
              key={`${utxoType}-${utxo.formattedId}-${index}`}
              utxo={utxo}
              type={utxoType}
              inscription={inscription}
            />
          );
        })}
      </>
    );
  }, []);
  const handleOpenChange = useCallback((open: boolean) => {
    // Only allow closing if not interacting with filters
    if (!isLoading) {
      setIsOpen(open);
    }
  }, [isLoading]);
  const isButtonDisabled = isLoading;
  // Fix the menu structure
  return (
    <div className="w-full">
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            disabled={isButtonDisabled}
            className="w-full mb-4 text-foreground font-semibold py-8 px-6 rounded-xl transition-all duration-300 bg-gradient-to-r from-white/90 to-gray-50/90 dark:from-gray-800/90 dark:to-gray-900/90 backdrop-blur-sm hover:from-gray-50 hover:to-gray-100 dark:hover:from-gray-700 dark:hover:to-gray-800 border-2 border-gray-200 dark:border-gray-700 hover:border-orange-300 dark:hover:border-orange-600 hover:shadow-lg hover:shadow-orange-100 dark:hover:shadow-orange-900/20 group"
          >
            <div className="flex flex-col items-center gap-2">
              {isLoading ? (
                <>
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-lg font-bold">Loading UTXOs...</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Progress: {progress}/{total}
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 mt-2 overflow-hidden">
                    <div 
                      className="bg-gradient-to-r from-orange-500 to-orange-600 h-full rounded-full transition-all duration-500 ease-out flex items-center justify-center relative"
                      style={{ width: `${total > 0 ? (progress / total) * 100 : 0}%` }}
                    >
                      {total > 0 && (
                        <span className="text-xs text-white font-medium absolute inset-0 flex items-center justify-center">
                          {Math.round((progress / total) * 100)}%
                        </span>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-3">
                    <span className="text-xl sm:text-2xl">🎯</span>
                    <span className="text-lg sm:text-xl font-bold">View My UTXOs</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {dropdownContent.inscriptions + dropdownContent.runes + dropdownContent.cardinals} UTXOs Retrieved
                  </div>
                </>
              )}
            </div>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuPortal>
          <DropdownMenuContent
            className="w-[95vw] max-w-[700px] max-h-[85vh] overflow-hidden bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-2 border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl"
            side="bottom"
            align="start"
            sideOffset={8}
          >
            {/* Header Section - Optimized for minimal vertical space */}
            <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-b border-gray-200 dark:border-gray-700">
              {/* Compact Header with Disconnect */}
              <div className="flex justify-between items-center px-3 py-2 border-b border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🎯</span>
                  <h2 className="text-base font-bold text-gray-900 dark:text-white">My UTXOs</h2>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => disconnect()}
                  className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors px-2 py-1 h-auto"
                >
                  Disconnect
                </Button>
              </div>

              {/* Compact Wallet Info */}
              <div className="px-3 py-2 bg-gradient-to-r from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 border-b border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-2">
                  <span className="text-base flex-shrink-0">Wallet</span>
                  <div className="min-w-0 flex-1">
                    <div className="font-mono text-xs text-orange-600 dark:text-orange-400 break-all">
                      {address}
                    </div>
                  </div>
                </div>
              </div>

              {/* Compact Stats Grid */}
              <div className="px-3 py-2 bg-gray-50 dark:bg-gray-800/50">
                <div className="flex justify-between items-center gap-2">
                  <div className="flex items-center gap-1 px-2 py-1 bg-white dark:bg-gray-800 rounded border border-orange-200 dark:border-orange-800">
                    <span className="text-xs font-semibold text-orange-600 dark:text-orange-400">
                      Inscriptions: {dropdownContent.inscriptions}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 px-2 py-1 bg-white dark:bg-gray-800 rounded border border-purple-200 dark:border-purple-800">
                    <span className="text-xs font-semibold text-purple-600 dark:text-purple-400">
                      Runes: {dropdownContent.runes}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 px-2 py-1 bg-white dark:bg-gray-800 rounded border border-blue-200 dark:border-blue-800">
                    <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                      Cardinals: {dropdownContent.cardinals}
                    </span>
                  </div>
                </div>
              </div>

              {/* Compact Filters Section */}
              <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700">
                <UtxoFilter
                  filter={filter}
                  setFilter={setFilter}
                  showTypes={showTypes}
                  setShowTypes={setShowTypes}
                />
              </div>
            </div>

            {/* Scrollable Content - Maximized space for inscriptions list */}
            <div className="max-h-[65vh] overflow-y-auto pb-4">
              {/* Loading State */}
              {isContentLoading && (
                <div className="p-4 text-center">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <div className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-sm font-medium">Loading content...</span>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Fetching and validating inscription data
                  </p>
                </div>
              )}

              {/* UTXO Lists - Compact layout */}
              <div className="space-y-3 p-3 pb-6">
                {showTypes.inscriptions && groupedUtxos.inscriptions.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm py-1 border-b border-gray-200 dark:border-gray-700">
                      <span className="text-base">Inscriptions</span>
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300">
                        {groupedUtxos.inscriptions.length}
                      </span>
                    </div>
                    <div className="space-y-2 pb-2">
                      {renderUtxoList('inscriptions', inscriptionsVirtualizer, groupedUtxos.inscriptions)}
                    </div>
                  </div>
                )}

                {showTypes.runes && groupedUtxos.runes.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm py-1 border-b border-gray-200 dark:border-gray-700">
                      <span className="text-base">Runes</span>
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300">
                        {groupedUtxos.runes.length}
                      </span>
                    </div>
                    <div className="space-y-2 pb-2">
                      {renderUtxoList('runes', runesVirtualizer, groupedUtxos.runes)}
                    </div>
                  </div>
                )}

                {showTypes.cardinals && groupedUtxos.cardinals.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm py-1 border-b border-gray-200 dark:border-gray-700">
                      <span className="text-base">Cardinals</span>
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
                        {groupedUtxos.cardinals.length}
                      </span>
                    </div>
                    <div className="space-y-2 pb-2">
                      {renderUtxoList('cardinals', cardinalsVirtualizer, groupedUtxos.cardinals)}
                    </div>
                  </div>
                )}

                {/* Empty State */}
                {!groupedUtxos.inscriptions.length &&
                 !groupedUtxos.runes.length &&
                 !groupedUtxos.cardinals.length && !isContentLoading && (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-2">🔍</div>
                    <h3 className="text-base font-medium text-gray-900 dark:text-white mb-1">
                      No UTXOs Found
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 max-w-md mx-auto">
                      No UTXOs match your current filter settings. Try adjusting the filters or check if your wallet contains any assets.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </DropdownMenuContent>
        </DropdownMenuPortal>
      </DropdownMenu>
    </div>
  );
}
