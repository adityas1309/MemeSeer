# MemeSeer - AI-Powered Memecoin Risk Scanner
## Demo Video [https://youtu.be/2BdKNocj8uA]
## Pitch Deck [https://www.canva.com/design/DAG23abwQ58/3F5TZT-HWseizzZf-pkjFA/edit?utm_content=DAG23abwQ58&utm_campaign=designshare&utm_medium=link2&utm_source=sharebutton]

A comprehensive web3 application for analyzing and monitoring memecoin risks on the Celo blockchain. Protect yourself from rug pulls with real-time AI-powered risk assessment.

<img width="2976" height="1720" alt="image" src="https://github.com/user-attachments/assets/9144f909-4408-47cd-813a-8fd00ecbf5a5" />


## Features

### Core Functionality
- **Token Scanner**: Analyze any Celo token with a comprehensive risk score (0-100)
- **Wallet Monitor**: Real-time monitoring of all tokens in your connected wallet
- **Watchlist**: Track specific tokens and get alerts on risk changes
- **Community Leaderboard**: View safest and most dangerous tokens scanned by the community
- **Browser Extension**: See risk scores directly on blockchain explorers

### Risk Analysis Components
- **Contract Risk Analysis**: Detects mint functions, ownership controls, pausable contracts, proxy patterns, and hidden functions
- **Social Sentiment**: Analyzes token characteristics and naming patterns for scam indicators
- **Whale Activity**: Monitors token concentration, suspicious wallets, and large transactions
- **Liquidity Health**: Tracks liquidity pairs, locked percentages, and volatility risks

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS 4
- **Web3**: Wagmi, RainbowKit, Viem
- **Blockchain**: Celo Sepolia Testnet
- **API**: Blockscout API for on-chain data
- **Extension**: Chrome Extension Manifest V3

## Installation

### Prerequisites
```bash
Node.js 20+
npm or yarn
```

### Setup

1. **Clone the repository**
```bash
git clone <repository-url>
cd memeseer
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment variables**
Create a `.env.local` file:
```env
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id_here
```

4. **Run development server**
```bash
npm run dev
```

5. **Open browser**
```
http://localhost:3000
```

## Project Structure

```
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   │   ├── scan/         # Token scanning endpoint
│   │   └── leaderboard/  # Leaderboard data
│   ├── leaderboard/      # Leaderboard page
│   ├── wallet-monitor/   # Wallet monitoring page
│   └── watchlist/        # Watchlist page
├── components/            # React components
├── hooks/                # Custom React hooks
├── lib/                  # Core libraries
│   ├── analyzers/       # Risk analysis modules
│   └── services/        # Business logic services
├── memeseer-extension/   # Browser extension
└── types/               # TypeScript definitions
```

## API Endpoints

### Scan Token
```
POST /api/scan
Body: { tokenAddress: "0x..." }
Returns: TokenAnalysis object
```

### Get Leaderboard
```
GET /api/leaderboard
Returns: { safe: Token[], danger: Token[] }
```

### Update Leaderboard
```
POST /api/leaderboard
Body: { tokenAddress, name, symbol, score }
```

## Risk Scoring

### Risk Levels
- **LOW (0-30)**: Safe to trade
- **MEDIUM (31-60)**: Proceed with caution
- **HIGH (61-85)**: Significant risks detected
- **CRITICAL (86-100)**: Extreme danger - likely scam

### Score Calculation
- Contract Risk: 40% weight
- Whale Activity: 25% weight
- Social Sentiment: 20% weight
- Liquidity Health: 15% weight

## Browser Extension

### Installation

1. **Navigate to extension directory**
```bash
cd memeseer-extension
```

2. **Load in Chrome**
- Open `chrome://extensions/`
- Enable "Developer mode"
- Click "Load unpacked"
- Select `memeseer-extension` folder

3. **Configure API endpoint**
Edit `content.js`:
```javascript
const MEMESEER_API = 'http://localhost:3000/api';
```

### Supported Explorers
- Celo Sepolia Blockscout
- Celoscan
- Celo Explorer

## Development

### Build for production
```bash
npm run build
npm start
```

### Linting
```bash
npm run lint
```

## Configuration Files

### `next.config.ts`
Next.js configuration with Turbopack support

### `tsconfig.json`
TypeScript compiler options

### `package.json`
Dependencies and scripts

## Network Configuration

### Celo Sepolia Testnet
- Chain ID: 11142220
- RPC: `https://forno.celo-sepolia.celo-testnet.org/`
- Explorer: `https://celo-sepolia.blockscout.com/`

## Key Components

### TokenScanner
Main scanning interface with real-time analysis display

### WalletMonitor
Monitors all tokens in connected wallet with bulk scanning

### Watchlist
Persistent storage using window.storage API for tracking tokens

### Leaderboard
Community-driven ranking of safest and most dangerous tokens

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/name`)
3. Commit changes (`git commit -m 'Add feature'`)
4. Push to branch (`git push origin feature/name`)
5. Open Pull Request

## License

MIT

## Support

For issues and questions:
- Open an issue on GitHub
- Check existing documentation
- Review code comments

## Roadmap

- [ ] Multi-chain support
- [ ] Advanced AI model integration
- [ ] Mobile app
- [ ] Automated protection features
- [ ] Historical trend analysis
- [ ] Social media integration




