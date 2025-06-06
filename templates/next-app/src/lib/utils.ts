import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { bitmapOCI } from "./bitmap-oci"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export async function getBitmap(bitmapNumber: number): Promise<string> {
  console.log(`getBitmap called with bitmapNumber: ${bitmapNumber}`);
  
  if (isNaN(bitmapNumber) || bitmapNumber < 0) {
    const error = `Invalid bitmap number: ${bitmapNumber}`;
    console.error(error);
    throw new Error(error);
  }
  
  if (bitmapNumber >= 840000) {
    const error = `Bitmap #${bitmapNumber} is above validation limit`;
    console.error(error);
    throw new Error(error);
  }
  
  try {
    const inscriptionId = await bitmapOCI.getBitmapInscriptionId(bitmapNumber);
    console.log(`getBitmap result for ${bitmapNumber}: ${inscriptionId}`);
    return inscriptionId;
  } catch (error) {
    console.error(`Error getting bitmap inscription ID for ${bitmapNumber}:`, error);
    throw error;
  }
}

export const getBitmapInscriptionId = getBitmap;

// Base URL for ordinals API
const BASE_URL = 'https://ordinals.com';

// Bitmap validation status utilities using comprehensive validation
export type BitmapValidationStatus = 'valid' | 'invalid' | 'pending' | 'unknown';

export interface BitmapValidationResult {
  status: BitmapValidationStatus;
  message?: string;
  details?: {
    bitmapNumber?: number;
    parcelNumber?: number;
    inscriptionId?: string;
    isParcel?: boolean;
    validParcels?: Array<{
      id: string;
      content: string;
      height?: number;
    }>;
    allChildren?: string[];
  };
}

/**
 * Fetch inscription details from ordinals.com
 */
async function getInscriptionDetails(inscriptionId: string) {
  const url = `${BASE_URL}/r/inscription/${inscriptionId}`;
  console.log(`Fetching inscription details from ${url}`);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch inscription details: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Fetch children inscriptions for a given inscription
 */
async function getChildrenInscriptions(inscriptionId: string): Promise<string[]> {
  const children = [];
  let page = 0;
  
  while (true) {
    const url = page === 0 
      ? `${BASE_URL}/r/children/${inscriptionId}` 
      : `${BASE_URL}/r/children/${inscriptionId}/${page}`;
    console.log(`Fetching children inscriptions from ${url}`);
    
    try {
      const response = await fetch(url);
      if (!response.ok) {
        if (response.status === 404 && page === 0) {
          // No children found
          break;
        }
        throw new Error(`Failed to fetch children: ${response.statusText}`);
      }
      
      const data = await response.json();
      if (!data.ids || data.ids.length === 0) break;
      
      children.push(...data.ids);
      if (!data.more) break;
      page++;
    } catch (error) {
      console.warn(`Error fetching children page ${page}:`, error);
      break;
    }
  }
  
  return children;
}

/**
 * Fetch block info from ordinals.com
 */
async function getBlockInfo(blockHeight: number) {
  const url = `${BASE_URL}/r/blockinfo/${blockHeight}`;
  console.log(`Fetching block info from ${url}`);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Block info not available');
  }
  return response.json();
}

/**
 * Fetch inscription content from ordinals.com
 */
async function fetchInscriptionContent(inscriptionId: string): Promise<string> {
  const url = `${BASE_URL}/content/${inscriptionId}`;
  console.log(`Fetching content from ${url}`);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch content: ${response.statusText}`);
  }
  const text = await response.text();
  return text.trim();
}

/**
 * Validates a child inscription as a parcel
 * @param childId - The ID of the child inscription
 * @param parentId - The bitmap number of the parent
 * @param txCount - The transaction count from the block info (optional for block 0)
 * @returns The valid parcel object or false if invalid
 */
async function isValidParcel(childId: string, parentId: number, txCount?: number): Promise<{ id: string; content: string } | false> {
  try {
    const content = await fetchInscriptionContent(childId);
    console.log(`Validating parcel content for ${childId}: "${content}"`);
    
    // Split and validate format
    const parts = content.split('.');
    console.log(`Content parts:`, parts);
    
    if (parts.length !== 3 || parts[2] !== 'bitmap') {
      console.log(`Invalid format: expected 3 parts ending with 'bitmap', got ${parts.length} parts: [${parts.join(', ')}]`);
      return false;
    }
    
    const [parcelNumber, blockNumber] = parts;
    console.log(`Parsed parcel number: "${parcelNumber}", block number: "${blockNumber}"`);
    
    // Validate block number matches parent
    if (blockNumber !== parentId.toString()) {
      console.log(`Block number mismatch: expected "${parentId}", got "${blockNumber}"`);
      return false;
    }
    
    // Validate parcel number is a valid integer
    const parcelNum = parseInt(parcelNumber, 10);
    if (isNaN(parcelNum) || parcelNum < 0) {
      console.log(`Invalid parcel number: "${parcelNumber}" -> ${parcelNum}`);
      return false;
    }
    
    // Validate parcel number against transaction count (skip for block 0)
    if (txCount !== undefined && parcelNum >= txCount) {
      console.log(`Parcel number ${parcelNum} exceeds transaction count ${txCount}`);
      return false;
    }
    
    console.log(`Valid parcel found: ${childId} -> "${content}"`);
    return { id: childId, content: content };
  } catch (error) {
    console.warn(`Error validating parcel ${childId}:`, error);
    return false;
  }
}

/**
 * Validates a bitmap based on its number and optional inscription ID using comprehensive validation
 * @param bitmapNumber - The bitmap number to validate
 * @param inscriptionId - Optional inscription ID for additional validation
 * @returns Validation result with status and details
 */
export async function validateBitmap(bitmapNumber: number, inscriptionId?: string): Promise<BitmapValidationResult> {
  try {
    console.log(`Validating bitmap number ${bitmapNumber}`);
    
    // Get the expected inscription ID for this bitmap
    const actualInscriptionId = await getBitmap(bitmapNumber);
    
    // If an inscription ID was provided, verify it matches
    if (inscriptionId && actualInscriptionId !== inscriptionId) {
      return {
        status: 'invalid',
        message: 'Inscription ID does not match bitmap number',
        details: { bitmapNumber, inscriptionId: actualInscriptionId }
      };
    }

    // Get inscription details
    const inscriptionDetails = await getInscriptionDetails(actualInscriptionId);

    // Validate bitmap inscription content
    const content = await fetchInscriptionContent(actualInscriptionId);
    if (!content.includes(bitmapNumber.toString()) || !content.endsWith('.bitmap')) {
      return {
        status: 'invalid',
        message: 'Invalid bitmap content',
        details: { bitmapNumber, inscriptionId: actualInscriptionId }
      };
    }

    // Get block info to validate parcels (skip for block 0)
    let txCount: number | undefined;
    if (bitmapNumber !== 0) {
      try {
        const blockInfo = await getBlockInfo(bitmapNumber);
        txCount = blockInfo.transaction_count;
      } catch (error) {
        console.warn(`Block info not available for bitmap ${bitmapNumber}:`, error);
      }
    }    // Get and validate children as parcels
    const childrenInscriptions = await getChildrenInscriptions(actualInscriptionId);
    console.log(`Fetched ${childrenInscriptions.length} children inscriptions for bitmap ${bitmapNumber}:`, childrenInscriptions);
    
    const validParcels = [];
    const parcelTimestamps: Record<string, any> = {};

    // Validate all children in parallel
    const validationPromises = childrenInscriptions.map(async (childId) => {
      console.log(`Processing child inscription: ${childId}`);
      const validParcel = await isValidParcel(childId, bitmapNumber, txCount);
      if (validParcel) {
        const parcelNumber = validParcel.content.split('.')[0];
        console.log(`Found valid parcel ${parcelNumber} with ID: ${validParcel.id}`);
        
        const childInscriptionDetails = await getInscriptionDetails(validParcel.id);

        // Tie-breaking logic: Use block height and then inscription ID order
        if (!parcelTimestamps[parcelNumber] ||
            childInscriptionDetails.height < parcelTimestamps[parcelNumber].height ||
            (childInscriptionDetails.height === parcelTimestamps[parcelNumber].height &&
                childInscriptionDetails.id < parcelTimestamps[parcelNumber].id)) {
          console.log(`Setting parcel ${parcelNumber} to ID ${validParcel.id} (height: ${childInscriptionDetails.height})`);
          parcelTimestamps[parcelNumber] = { 
            ...validParcel, 
            height: childInscriptionDetails.height 
          };
        } else {
          console.log(`Parcel ${parcelNumber} already has a better candidate, skipping ${validParcel.id}`);
        }
      } else {
        console.log(`Invalid parcel: ${childId}`);
      }
    });

    await Promise.all(validationPromises);

    // Collect valid parcels
    for (const parcelNumber in parcelTimestamps) {
      validParcels.push(parcelTimestamps[parcelNumber]);
    }

    console.log(`Bitmap ${bitmapNumber} validation complete. Found ${validParcels.length} valid parcels:`, validParcels.map(p => p.content));

    return {
      status: 'valid',
      message: `Bitmap ${bitmapNumber} is valid with ${validParcels.length} parcels`,
      details: { 
        bitmapNumber, 
        inscriptionId: actualInscriptionId,
        validParcels,
        allChildren: childrenInscriptions
      }
    };
  } catch (error) {
    console.error('Bitmap validation error:', error);
    return {
      status: 'invalid',
      message: error instanceof Error ? error.message : 'Unknown validation error',
      details: { bitmapNumber, inscriptionId }
    };
  }
}

/**
 * Validates a bitmap parcel using comprehensive validation
 * @param bitmapNumber - The bitmap number
 * @param parcelNumber - The parcel number
 * @param parcelInscriptionId - Optional inscription ID of the parcel itself
 * @returns Validation result
 */
export async function validateBitmapParcel(
  bitmapNumber: number, 
  parcelNumber: number, 
  parcelInscriptionId?: string
): Promise<BitmapValidationResult> {
  try {
    console.log(`Validating parcel ${parcelNumber} for bitmap ${bitmapNumber} with parcel inscription ID: ${parcelInscriptionId}`);
    
    // First validate the parent bitmap (without passing the parcel inscription ID)
    const bitmapResult = await validateBitmap(bitmapNumber);
    console.log(`Bitmap validation result for ${bitmapNumber}:`, bitmapResult);
    
    if (bitmapResult.status !== 'valid') {
      console.log(`Bitmap ${bitmapNumber} is not valid, returning invalid for parcel`);
      return {
        ...bitmapResult,
        details: {
          ...bitmapResult.details,
          parcelNumber,
          isParcel: true
        }
      };
    }

    // Check if the specific parcel exists and is valid
    const validParcels = bitmapResult.details?.validParcels || [];
    console.log(`Valid parcels for bitmap ${bitmapNumber}:`, validParcels.map(p => p.content));
    
    const targetParcel = validParcels.find(p => 
      p.content === `${parcelNumber}.${bitmapNumber}.bitmap`
    );
    
    console.log(`Looking for parcel content: ${parcelNumber}.${bitmapNumber}.bitmap`);
    console.log(`Target parcel found:`, targetParcel);

    // If we have a parcel inscription ID, verify it matches the found parcel
    if (parcelInscriptionId && targetParcel && targetParcel.id !== parcelInscriptionId) {
      console.log(`Parcel inscription ID mismatch. Expected: ${targetParcel.id}, Got: ${parcelInscriptionId}`);
      return {
        status: 'invalid',
        message: `Parcel inscription ID does not match expected ID`,
        details: { 
          bitmapNumber, 
          parcelNumber, 
          isParcel: true,
          inscriptionId: parcelInscriptionId
        }
      };
    }

    if (!targetParcel) {
      return {
        status: 'invalid',
        message: `Parcel ${parcelNumber} not found or invalid for bitmap ${bitmapNumber}`,
        details: { 
          bitmapNumber, 
          parcelNumber, 
          isParcel: true,
          inscriptionId: bitmapResult.details?.inscriptionId
        }
      };
    }

    return {
      status: 'valid',
      message: `Parcel ${parcelNumber}.${bitmapNumber}.bitmap is valid`,
      details: { 
        bitmapNumber, 
        parcelNumber, 
        isParcel: true,
        inscriptionId: targetParcel.id,
        validParcels: [targetParcel]
      }
    };
  } catch (error) {
    console.error('Parcel validation error:', error);
    return {
      status: 'invalid',
      message: error instanceof Error ? error.message : 'Unknown validation error',
      details: { bitmapNumber, parcelNumber, isParcel: true, inscriptionId: parcelInscriptionId }
    };
  }
}

/**
 * Parse and validate bitmap content string using comprehensive validation
 * @param content - The content string (e.g., "123.bitmap" or "123.45.bitmap")
 * @param inscriptionId - Optional inscription ID of the content being validated
 * @returns Validation result with parsed details
 */
export async function validateBitmapContent(content: string, inscriptionId?: string): Promise<BitmapValidationResult> {
  console.log(`Validating bitmap content: "${content}" with inscription ID: ${inscriptionId}`);
  
  const match = content.match(/^(\d+)(?:\.(\d+))?\.bitmap$/);
  if (!match) {
    return {
      status: 'invalid',
      message: 'Invalid bitmap format. Expected format: "number.bitmap" or "parcel.block.bitmap"'
    };
  }
  
  const firstNumber = parseInt(match[1]);
  const secondNumber = match[2] ? parseInt(match[2]) : undefined;
  
  // Check for parcel format (parcel.block.bitmap)
  if (secondNumber !== undefined) {
    // This is a parcel: parcel.block.bitmap
    const parcelNumber = firstNumber;
    const bitmapNumber = secondNumber;
    console.log(`Parsing parcel format: parcel=${parcelNumber}, bitmap=${bitmapNumber}`);
    // For parcels, the inscriptionId passed in is the parcel's inscription ID
    return validateBitmapParcel(bitmapNumber, parcelNumber, inscriptionId);
  } else {
    // This is a bitmap: bitmap.bitmap
    console.log(`Parsing bitmap format: bitmap=${firstNumber}`);
    // For bitmaps, the inscriptionId should match the bitmap's inscription ID
    return validateBitmap(firstNumber, inscriptionId);
  }
}

/**
 * Get validation status color classes for Tailwind CSS
 * @param status - The validation status
 * @returns Object with color classes for different UI elements
 */
export function getValidationStatusColors(status: BitmapValidationStatus) {
  switch (status) {
    case 'valid':
      return {
        background: 'bg-green-100',
        bg: 'bg-green-100',
        text: 'text-green-800',
        border: 'border-green-300',
        dot: 'bg-green-500'
      };
    case 'invalid':
      return {
        background: 'bg-red-100',
        bg: 'bg-red-100',
        text: 'text-red-800',
        border: 'border-red-300',
        dot: 'bg-red-500'
      };
    case 'pending':
      return {
        background: 'bg-yellow-100',
        bg: 'bg-yellow-100',
        text: 'text-yellow-800',
        border: 'border-yellow-300',
        dot: 'bg-yellow-500'
      };
    default:
      return {
        background: 'bg-gray-100',
        bg: 'bg-gray-100',
        text: 'text-gray-800',
        border: 'border-gray-300',
        dot: 'bg-gray-500'
      };
  }
}

/**
 * Get validation status icon
 * @param status - The validation status
 * @returns Icon character or emoji
 */
export function getValidationStatusIcon(status: BitmapValidationStatus): string {
  switch (status) {
    case 'valid':
      return '✓';
    case 'invalid':
      return '✗';
    case 'pending':
      return '⏳';
    default:
      return '?';
  }
}
 