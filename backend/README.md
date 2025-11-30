# Club Transparency Backend

Express/TypeScript REST API for university club accounting transparency. Authenticates users with Google OAuth (ID token), creates a Biconomy Smart Account per user (gasless UX via paymaster), persists data in SQLite, and interacts with the deployed `ClubManager` contract.

## Tech Stack

- **Framework**: Express + TypeScript
- **Database**: SQLite (better-sqlite3)
- **Blockchain**: ethers v6 + Biconomy Smart Account v3 (bundler/paymaster)
- **Authentication**: Google ID Token verification (google-auth-library) + JWT
- **Additional**: CORS, Rate Limiting, viem

## Features

- Google OAuth authentication with Smart Account creation
- Gasless blockchain transactions via Biconomy Paymaster
- Rate limiting (100 requests per 15 minutes per IP)
- CORS protection with configurable origins
- Health check endpoint with database and RPC status
- Graceful shutdown handling
- Comprehensive error logging

## Getting Started

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Configure Environment

Create a `.env` file in the backend directory with the following variables:

```bash
# Server Configuration
PORT=4000
ALLOWED_ORIGINS=http://localhost:3000

# Blockchain Configuration
RPC_URL=https://sepolia.infura.io/v3/YOUR_PROJECT_ID
CONTRACT_ADDRESS=0xFEfc7EE54498294D3eEDFd00c769Cd92e9c76f7c

# Biconomy Configuration
BICONOMY_API_KEY=your_biconomy_api_key
BICONOMY_BUNDLER_URL=https://bundler.biconomy.io/api/v2/11155111/your_bundler_id
BICONOMY_PAYMASTER_URL=https://paymaster.biconomy.io/api/v1/11155111/your_paymaster_id

# Authentication
GOOGLE_CLIENT_ID=your_google_client_id
JWT_SECRET=your_jwt_secret
WALLET_MASTER_SECRET=your_wallet_master_secret

# Database
DATABASE_PATH=./data/app.db
```

### 3. Run the Server

**Development mode:**
```bash
npm run dev
```

**Production build:**
```bash
npm run build
npm start
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 4000 |
| `ALLOWED_ORIGINS` | Comma-separated CORS allowed origins | `http://localhost:3000` |
| `RPC_URL` | Ethereum RPC endpoint (required) | - |
| `CONTRACT_ADDRESS` | ClubManager contract address (required) | - |
| `BICONOMY_API_KEY` | Biconomy API key (required) | - |
| `BICONOMY_BUNDLER_URL` | Biconomy bundler endpoint (required) | - |
| `BICONOMY_PAYMASTER_URL` | Biconomy paymaster endpoint (required) | - |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID (required) | - |
| `JWT_SECRET` | JWT signing secret (required) | - |
| `WALLET_MASTER_SECRET` | Master secret for wallet derivation (required) | - |
| `DATABASE_PATH` | SQLite database file path | `./data/app.db` |

## API Endpoints

All endpoints return JSON responses. Auth-protected routes require `Authorization: Bearer <jwt>` header.

### Health Check

#### `GET /health`
- **Public endpoint**
- **Returns**: Server health status including database and RPC connectivity
- **Response example**:
  ```json
  {
    "status": "ok",
    "timestamp": "2025-01-15T12:00:00.000Z",
    "uptime": 123.456,
    "database": "ok",
    "rpc": "ok",
    "blockNumber": 12345678
  }
  ```

### Authentication

#### `POST /auth/google/callback`
- **Public endpoint**
- **Description**: Authenticates user with Google ID token, creates Smart Account on first login
- **Request body**:
  ```json
  {
    "idToken": "<google_id_token>"
  }
  ```
- **Response**:
  ```json
  {
    "token": "<jwt_token>",
    "user": {
      "id": 1,
      "email": "user@example.com",
      "name": "User Name",
      "smart_account_address": "0x..."
    }
  }
  ```

### Clubs

#### `POST /clubs`
- **Auth required**
- **Description**: Creates a new club on-chain and in database
- **Request body**:
  ```json
  {
    "name": "Club Name"
  }
  ```
- **Validation**: Name must be 1-100 characters
- **Response**:
  ```json
  {
    "clubId": 1,
    "txHash": "0x..."
  }
  ```

#### `POST /clubs/:clubId/join`
- **Auth required**
- **Description**: Joins a club (on-chain transaction)
- **Response**:
  ```json
  {
    "txHash": "0x..."
  }
  ```

#### `POST /clubs/:clubId/pay`
- **Auth required**
- **Description**: Pays club fee (on-chain transaction with paymaster sponsorship)
- **Request body**:
  ```json
  {
    "amount": "0.1"
  }
  ```
- **Validation**: Amount must be a valid ETH value (e.g., "0.1", "1.5")
- **Response**:
  ```json
  {
    "txHash": "0x..."
  }
  ```

#### `GET /clubs/:clubId`
- **Public endpoint**
- **Description**: Retrieves club details from both on-chain and database
- **Response**:
  ```json
  {
    "onChain": {
      "name": "Club Name",
      "admin": "0x...",
      "balance": "1.5",
      "totalMembers": 10,
      "members": ["0x...", "0x..."]
    },
    "database": {
      "id": 1,
      "name": "Club Name",
      "creator_id": 1,
      "created_at": "2025-01-15T12:00:00.000Z",
      "memberships": [
        {
          "user_id": 1,
          "joined_at": "2025-01-15T12:00:00.000Z"
        }
      ]
    }
  }
  ```

## Architecture

### Smart Account Creation
Each user gets a deterministic Biconomy Smart Account:
- Owner key is derived from Google ID + `WALLET_MASTER_SECRET` + `JWT_SECRET`
- No private keys are stored in the database
- Smart Account address is stored in `users.smart_account_address`
- Account is created automatically on first login

### Gasless Transactions
All write operations (createClub, joinClub, payFee) are gasless through:
- Biconomy Bundler (ERC-4337 UserOperation submission)
- Biconomy Paymaster (transaction sponsorship)
- Ensure paymaster is configured to sponsor transactions for your dApp

### Database Schema

**users**
- `id`: Primary key
- `google_id`: Unique Google user identifier
- `email`: User email
- `name`: User name
- `smart_account_address`: Biconomy Smart Account address
- `created_at`: Timestamp

**clubs**
- `id`: Primary key (matches on-chain clubId)
- `name`: Club name
- `creator_id`: Foreign key to users
- `created_at`: Timestamp

**club_memberships**
- `club_id`: Foreign key to clubs
- `user_id`: Foreign key to users
- `joined_at`: Timestamp

### Security Features

- **CORS**: Configurable allowed origins
- **Rate Limiting**: 100 requests per 15 minutes per IP
- **JWT Authentication**: Secure token-based auth
- **Input Validation**: All user inputs are validated
- **Error Handling**: Comprehensive error logging with context
- **Graceful Shutdown**: Proper cleanup of database and server connections

## Development

### Project Structure

```
backend/
├── src/
│   ├── abi/              # Contract ABIs
│   ├── config/           # Configuration files
│   │   ├── biconomy.ts   # Biconomy Smart Account setup
│   │   ├── contract.ts   # Contract instances
│   │   ├── crypto.ts     # Cryptographic utilities
│   │   ├── db.ts         # Database setup
│   │   └── env.ts        # Environment variables
│   ├── middleware/       # Express middleware
│   │   └── auth.ts       # JWT authentication
│   ├── routes/           # API routes
│   │   ├── auth.ts       # Authentication routes
│   │   └── clubs.ts      # Club routes
│   ├── services/         # Business logic
│   │   ├── authService.ts
│   │   └── clubService.ts
│   ├── types/            # TypeScript type definitions
│   ├── utils/            # Utility functions
│   │   ├── timeout.ts    # Timeout helpers
│   │   └── validation.ts # Input validation
│   ├── app.ts            # Express app setup
│   └── server.ts         # Server entry point
├── data/                 # SQLite database location
├── package.json
├── tsconfig.json
└── README.md
```

### Scripts

- `npm run dev`: Start development server with hot reload
- `npm run build`: Build TypeScript to JavaScript
- `npm start`: Run production server

## Notes

- Contract address defaults to `0xFEfc7EE54498294D3eEDFd00c769Cd92e9c76f7c` (override via `CONTRACT_ADDRESS` env)
- All blockchain write operations use gasless transactions via Biconomy
- Database is automatically initialized on first run
- Server supports graceful shutdown (SIGTERM, SIGINT) with 10-second timeout
