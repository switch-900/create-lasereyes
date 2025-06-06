# 🚀 Lasereyes UTXO Management System

A sophisticated **Bitcoin UTXO management application** built with Next.js that provides comprehensive **bitmap and parcel validation** for Bitcoin Ordinals inscriptions. This tool allows users to connect their Bitcoin wallets, view UTXOs, and validate bitmap/parcel inscriptions with real-time validation status.

## 🎯 **App Purpose**

This application serves as a **UTXO explorer and validator** specifically designed for:

- **📊 UTXO Management**: View and manage Bitcoin UTXOs from connected wallets
- **🎨 Inscription Discovery**: Automatically detect and display Bitcoin Ordinals inscriptions
- **🗺️ Bitmap Validation**: Comprehensive validation of bitmap inscriptions (e.g., `177700.bitmap`)
- **📦 Parcel Validation**: Advanced validation of bitmap parcels (e.g., `0.177700.bitmap`)
- **🔍 Real-time Status**: Live validation with detailed error reporting and status indicators
- **⚡ Performance**: Efficient caching and parallel validation processing

## 🏗️ **Core Features**

### **UTXO Management**
- Connect Bitcoin wallets via LaserEyes
- Fetch and display UTXOs with inscription data
- Real-time UTXO filtering and search
- Support for inscriptions, runes, and cardinal UTXOs

### **Bitmap & Parcel Validation**
- **Bitmap Format**: `{block}.bitmap` (e.g., `177700.bitmap`)
- **Parcel Format**: `{parcel}.{block}.bitmap` (e.g., `0.177700.bitmap`)
- Comprehensive validation against Bitcoin block data
- Transaction count validation for parcel limits
- Children inscription discovery and validation

### **Advanced Validation Logic**
- **Tiebreaker System**: Multiple claimants resolved by block height + inscription ID
- **Edge Case Handling**: Invalid formats, missing blocks, network errors
- **Block 0 Special Case**: Genesis block handling with custom rules
- **Limits**: Bitmap validation up to block 840,000

## 🧮 **Validation Logic Deep Dive**

### **Bitmap Validation Process**
1. **Format Check**: Validate `{number}.bitmap` format
2. **Inscription ID Lookup**: Get canonical inscription ID via bitmap-oci
3. **Content Verification**: Ensure inscription content matches bitmap number
4. **Children Discovery**: Fetch all child inscriptions (parcels)
5. **Parcel Validation**: Validate each child as a legitimate parcel

### **Parcel Validation Rules**
```typescript
// Valid parcel format: {parcel}.{block}.bitmap
const validExamples = [
  "0.177700.bitmap",    // Parcel 0 of block 177700
  "5.177700.bitmap",    // Parcel 5 of block 177700
  "1.0.bitmap"          // Parcel 1 of genesis block
];

// Invalid examples
const invalidExamples = [
  "6.177700.bitmap",    // Exceeds transaction count (block 177700 has 6 transactions: 0-5)
  "0.177701.bitmap",    // Wrong block number
  "-1.177700.bitmap",   // Negative parcel number
  "abc.177700.bitmap"   // Non-numeric parcel number
];
```

### **Tiebreaker Logic**
When multiple inscriptions claim the same parcel:
1. **Primary**: Earlier block height wins (lower `height` value)
2. **Secondary**: Lexicographically smaller inscription ID wins

```typescript
// Example tiebreaker scenario for parcel "0.177700.bitmap"
const claimants = [
  { id: "abc123...i0", height: 177800 },  // Later block
  { id: "def456...i0", height: 177750 },  // Earlier block ← WINNER
  { id: "ghi789...i0", height: 177750 }   // Same block, alphabetical check
];
```

### **Edge Cases Handled**
- ❌ **Format Validation**: `0.177700` (missing `.bitmap`)
- ❌ **Block Mismatch**: `0.177701.bitmap` for bitmap 177700
- ❌ **Transaction Overflow**: Parcel numbers ≥ block transaction count
- ❌ **Invalid Numbers**: Non-numeric or negative parcel/bitmap numbers
- ✅ **Block 0 Special**: Genesis block with no transaction count validation
- ✅ **Network Resilience**: Graceful handling of API timeouts/errors

## 🚀 **Getting Started**

### **Prerequisites**
- Node.js 18+ 
- Bitcoin wallet compatible with LaserEyes
- Internet connection for ordinals.com API access

### **Installation & Setup**
```bash
# Clone the repository
git clone <repository-url>
cd Lasereyes-UTXO

# Install dependencies
npm install

# Start development server
npm run dev
```

### **Usage**
1. **Connect Wallet**: Click "Connect Wallet" and select your Bitcoin wallet
2. **View UTXOs**: Browse your UTXOs with automatic inscription detection
3. **Validation**: Bitmap/parcel inscriptions are automatically validated
4. **Status Indicators**: 
   - 🟢 **Valid**: Inscription is properly validated
   - 🔴 **Invalid**: Validation failed (hover for details)
   - 🟡 **Pending**: Validation in progress
   - ⚪ **Unknown**: No validation attempted

### **API Endpoints Used**
- `https://ordinals.com/r/utxo/{txid}:{vout}` - UTXO inscription data
- `https://ordinals.com/r/inscription/{id}` - Inscription details
- `https://ordinals.com/r/children/{id}` - Child inscriptions
- `https://ordinals.com/r/blockinfo/{height}` - Block transaction counts
- `https://ordinals.com/content/{id}` - Inscription content

## 🛠️ **Technical Stack**

- **Framework**: Next.js 14 with App Router
- **Styling**: Tailwind CSS + shadcn/ui components
- **Wallet**: LaserEyes Bitcoin wallet integration
- **State**: React hooks with custom validation logic
- **APIs**: ordinals.com REST endpoints
- **Validation**: Custom bitmap-oci module for inscription ID lookup

## 📁 **Project Structure**

```
src/
├── app/                    # Next.js app router
├── components/             # React components
│   ├── InscriptionsList.tsx    # Main UTXO/inscription display
│   ├── ValidationStatusIndicator.tsx  # Status indicators
│   └── ui/                     # shadcn/ui components
├── hooks/                  # Custom React hooks
│   ├── useInscriptions.ts      # UTXO fetching logic
│   └── useBitmapValidation.ts  # Validation hook with caching
├── lib/                    # Core utilities
│   ├── utils.ts               # Validation logic & tiebreakers
│   └── bitmap-oci.ts          # Bitcoin inscription ID lookup
└── types/                  # TypeScript definitions
```

## 🔧 **Development Scripts**

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run type-check   # TypeScript validation
```

## 🤝 **Contributing**

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📖 **Learn More**

- [Bitcoin Ordinals Documentation](https://docs.ordinals.com/)
- [LaserEyes Wallet Documentation](https://github.com/omnisat/lasereyes)
- [Next.js Documentation](https://nextjs.org/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)

---

**Built with ❤️ for the Bitcoin Ordinals community @switch-900**
