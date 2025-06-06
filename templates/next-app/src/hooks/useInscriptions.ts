// Import necessary dependencies
import mempoolJS from "@mempool/mempool.js";
import { useState, useCallback } from 'react';
// Core interfaces for transaction and UTXO data
export interface UTXO {
  txid: string;
  vout: number;
  status: {
    confirmed: boolean;
    block_height: number;
    block_time: number;
  };
  value: number;
  formattedId: string;
}
// Add new interface for rune data
export interface RuneInfo {
  name: string;
  amount?: number;
  divisibility?: number;
  symbol?: string;
}
export interface RuneUtxo extends UTXO {
  runeInfo?: RuneInfo;
}
// Update Inscription interface with required fields
/** Represents an inscription with its metadata */
export interface Inscription {
  inscriptionId: string;   // Unique inscription identifier
  inscriptionNumber: string;
  txid: string;
  vout: number;
  value: number;
  utxo: UTXO;  // Update this to use the UTXO interface directly
  contentType?: string;
  preview?: string;
  content?: string | null;  // Update to allow null
}
interface ProcessedInscription extends Inscription {
  content: string;  // Make content required in processed inscriptions
  type?: 'bitmap' | 'parcel' | 'other';
}
interface OrdinalResponse {
  inscriptions: string[];
  contentType?: string;
  preview?: string;
}
interface UTXOCategories {
  inscriptions: UTXO[];
  runes: UTXO[];
  cardinals: UTXO[];
}
interface UseInscriptionsReturn {
  inscriptions: Inscription[];
  runes: UTXO[];
  cardinals: UTXO[];
  isLoading: boolean;
  error: string | null;
  total: number;
  fetchFromAddress: (address: string) => Promise<void>;
  resetState: () => void;  // Add resetState to the interface
  progress: number;  // Add progress to the interface
  filterInscriptions: (type: 'bitmap' | 'parcel' | 'all') => ProcessedInscription[];  // Add filterInscriptions to the interface
}
interface UTXOWithInscription {
  utxo: UTXO;
  inscriptionData: {
    inscriptionId: string;
    inscriptionNumber: string;
    contentType?: string;
    preview?: string;
  };
}
// Add MempoolUTXO interface to match mempool.js response
interface MempoolUTXO {
  txid: string;
  vout: number;
  status: {
    confirmed: boolean;
    block_height: number;
    block_hash: string;
    block_time: number;
  };
  value: number;
}
// Helper to create UTXO identifier directly from txid and vout
// This is only used for display purposes, inscription IDs come from API
const createUtxoDisplayId = (txid: string, vout: number) => `${txid}:${vout}`;
/**
 * Fetches and processes inscription content in batches
 * @param inscriptions Array of inscriptions to fetch content for
 * @returns Map of inscription IDs to their content
 */
const fetchInscriptionContents = async (inscriptions: Inscription[]): Promise<Record<string, string | null>> => {
  const fetchPromises = inscriptions.map(async (inscription) => {
    try {
      const response = await fetch(`https://ordinals.com/content/${inscription.inscriptionId}`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const content = await response.text();
      return {
        inscriptionId: inscription.inscriptionId,
        content: content.trim()
      };
    } catch (error) {
      console.error(`Failed to fetch content for ${inscription.inscriptionId}:`, error);
      return {
        inscriptionId: inscription.inscriptionId,
        content: null
      };
    }
  });
  const contents = await Promise.all(fetchPromises);
  return contents.reduce((acc, { inscriptionId, content }) => {
    acc[inscriptionId] = content;
    return acc;
  }, {} as Record<string, string | null>);
};
/**
 * Hook for managing inscriptions and UTXOs
 * Provides functionality to:
 * - Fetch UTXOs for a given address
 * - Process and categorize UTXOs (inscriptions, runes, cardinals)
 * - Handle content fetching and validation
 * - Manage pagination and filtering
 */
export const useInscriptions = (): UseInscriptionsReturn => {
  const [categories, setCategories] = useState<UTXOCategories>({
    inscriptions: [],
    runes: [],
    cardinals: []
  });
  const [inscriptions, setInscriptions] = useState<Inscription[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  // Add batch processing state
  const [processedCount, setProcessedCount] = useState(0);
  const BATCH_SIZE = 20;
  const processUtxoBatch = async (utxos: MempoolUTXO[], startIndex: number) => {
    const batch = utxos.slice(startIndex, startIndex + BATCH_SIZE);
    const results = await Promise.all(
      batch.map(async (utxo) => {
        try {
          const response = await fetch(
            `https://ordinals.com/r/utxo/${utxo.txid}:${utxo.vout}`
          );
          if (!response.ok) return {
            type: 'cardinal',
            utxo: {
              ...utxo,
              formattedId: createUtxoDisplayId(utxo.txid, utxo.vout)
            }
          };
          const data = await response.json();
          console.log('UTXO API response for', `${utxo.txid}:${utxo.vout}`, ':', data); // Debug log to verify data structure
          
          const hasRunes = data.runes && Object.keys(data.runes).length > 0;
          const hasInscriptions = data.inscriptions?.length > 0;
          const type = hasInscriptions ? 'inscription'
                    : hasRunes ? 'rune'
                    : 'cardinal';
                    
          // Log inscription ID when found
          if (hasInscriptions) {
            console.log('Found inscription ID from API:', data.inscriptions[0], 'for UTXO:', `${utxo.txid}:${utxo.vout}`);
          }
                    
          // Log inscription ID when found
          if (hasInscriptions) {
            console.log('Found inscription ID from API:', data.inscriptions[0], 'for UTXO:', `${utxo.txid}:${utxo.vout}`);
          }
          // Extract rune info if available
          let runeInfo: RuneInfo | undefined;
          if (hasRunes) {
            const runeName = Object.keys(data.runes)[0];
            runeInfo = {
              name: runeName,
              ...data.runes[runeName]
            };
          }
          return {
            type,
            utxo: {
              ...utxo,
              formattedId: createUtxoDisplayId(utxo.txid, utxo.vout),
              runeInfo // Add rune info to the UTXO
            },
            inscriptionData: type === 'inscription' ? {
              // Use inscription ID directly from UTXO API response - never generate it
              inscriptionId: data.inscriptions[0], // This is the actual inscription ID from ordinals.com
              inscriptionNumber: data.number || data.inscriptions[0], // Use actual inscription number if available
              contentType: data.contentType,
              preview: data.preview
            } : undefined
          };
        } catch (err) {
          return {
            type: 'cardinal',
            utxo: {
              ...utxo,
              formattedId: createUtxoDisplayId(utxo.txid, utxo.vout)
            }
          };
        }
      })
    );
    setProcessedCount(prev => prev + batch.length);
    return results;
  };
  const fetchFromAddress = useCallback(async (walletAddress: string) => {
    if (!walletAddress || isLoading) return;
    try {
      setIsLoading(true);
      setProcessedCount(0);
      console.log('Starting UTXO fetch for:', walletAddress);
      // Normalize the address format if needed
      const normalizedAddress = walletAddress.trim();
      const { bitcoin: { addresses } } = mempoolJS({
        hostname: 'mempool.space'
      });
      // Add retry logic for UTXO fetching with proper typing
      let utxos: MempoolUTXO[] = [];
      let retries = 3;
      while (retries > 0) {
        try {
          utxos = await addresses.getAddressTxsUtxo({ address: normalizedAddress });
          break;
        } catch (error) {
          console.warn(`UTXO fetch attempt failed, retries left: ${retries - 1}`);
          retries--;
          if (retries === 0) throw error;
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      console.log(`Found ${utxos.length} UTXOs for wallet:`, normalizedAddress);
      const inscribedUtxos: UTXOWithInscription[] = [];
      const runeUtxos: UTXO[] = [];
      const cardinalUtxos: UTXO[] = [];
      // Process UTXOs in smaller batches
      for (let i = 0; i < utxos.length; i += BATCH_SIZE) {
        const batchResults = await processUtxoBatch(utxos, i);
        // Update categories immediately after each batch
        batchResults.forEach(result => {
          if (result.type === 'inscription' && result.inscriptionData) {
            inscribedUtxos.push({
              utxo: result.utxo,
              inscriptionData: result.inscriptionData
            });
          } else if (result.type === 'rune') {
            runeUtxos.push(result.utxo);
          } else {
            cardinalUtxos.push(result.utxo);
          }
        });
        // Update state after each batch
        const processedInscriptions = inscribedUtxos.map(({ utxo, inscriptionData }) => ({
          inscriptionId: inscriptionData.inscriptionId,
          inscriptionNumber: inscriptionData.inscriptionNumber,
          txid: utxo.txid,
          vout: utxo.vout,
          value: utxo.value,
          contentType: inscriptionData.contentType,
          preview: inscriptionData.preview,
          utxo: utxo  // Just pass the complete UTXO object
        }));
        // Fetch contents for all inscriptions at once
        const contents = await fetchInscriptionContents(processedInscriptions);
        // Update inscriptions with their content
        const inscriptionsWithContent = processedInscriptions.map(insc => ({
          ...insc,
          content: contents[insc.inscriptionId] || undefined  // Convert null to undefined
        })) as Inscription[];  // Type assertion to match Inscription interface
        setInscriptions(inscriptionsWithContent);
        setCategories({
          inscriptions: inscribedUtxos.map(x => x.utxo),
          runes: runeUtxos,
          cardinals: cardinalUtxos
        });
        setTotal(processedInscriptions.length);
      }
    } catch (err) {
      console.error('Error in fetchFromAddress:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      resetState();
    } finally {
      setIsLoading(false);
      setProcessedCount(0);
    }
  }, [isLoading]);
  const resetState = useCallback(() => {
    setInscriptions([]);
    setCategories({ inscriptions: [], runes: [], cardinals: [] });
    setTotal(0);
    setError(null);
  }, []);
  const filterInscriptions = useCallback((type: 'bitmap' | 'parcel' | 'all'): ProcessedInscription[] => {
    return inscriptions.filter(inscription => {
      if (type === 'all') return true;
      const content = inscription.content;
      if (!content) return false;
      const cleanContent = content.trim();
      if (type === 'bitmap') {
        return /^\d+\.bitmap$/.test(cleanContent);
      }
      if (type === 'parcel') {
        return /^\d+\.\d+\.bitmap$/.test(cleanContent);
      }
      return false;
    }) as ProcessedInscription[];  // Type assertion since we've filtered out null content
  }, [inscriptions]);
  return {
    inscriptions,
    runes: categories.runes,
    cardinals: categories.cardinals,
    isLoading,
    error,
    total,
    fetchFromAddress,
    resetState,  // Include resetState in the return object
    progress: processedCount,  // Include progress in the return object
    filterInscriptions  // Include filterInscriptions in the return object
  };
};
