# AgentDD - NBA Betting Platform

A modern NBA betting platform with a cyberpunk terminal aesthetic, featuring DARE points, real-time odds, and an integrated chat system.

## Features

- **NBA Betting System** with real-time odds and match data
- **DARE Points Economy** with automatic signup bonuses and configurable rewards
- **Dual Authentication** - Email and Web3 wallet support
- **Chat System** with match-specific and global channels
- **Terminal-inspired UI** with cyberpunk aesthetic
- **Real-time Updates** via Supabase
- **Responsive Design** for all devices

## Quick Start

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- Supabase account (for full functionality)

### Installation

1. **Clone and install**
   ```bash
   git clone <repository-url>
   cd agentdd
   npm install
   ```

2. **Environment Setup**
   ```bash
   cp src/env.example .env
   # Add your Supabase credentials to .env
   ```

3. **Database Setup**
   ```bash
   npx supabase db push
   ```
   
   See `docs/setup-database.md` for detailed instructions.

4. **Start Development**
   ```bash
   npm run dev
   ```

## Documentation

Comprehensive documentation is available in the `docs/` folder:

### System Documentation
- **[Points System](docs/POINTS_README.md)** - DARE points economy and rewards
- **[Database Setup](docs/setup-database.md)** - Database configuration and deployment
- **[User Accounts](docs/USER_ACCOUNTS_README.md)** - User account system and authentication
- **[Matches System](docs/MATCHES_TABLE_README.md)** - NBA match data and betting

### Technical Documentation  
- **[Points Configuration](docs/POINTS_CONFIG_README.md)** - Configurable point values and admin controls
- **[Points Transactions](docs/POINTS_TRANSACTIONS_README.md)** - Transaction system and audit trail
- **[Schema Design](docs/POINTS_SCHEMA_DESIGN.md)** - Database schema and relationships

## Key Features

### DARE Points System
- **Automatic Signup Bonus**: 500 points via database triggers
- **Betting Rewards**: Configurable bonuses for bets and wins
- **Audit Trail**: Complete transaction history
- **Dual Signup Support**: Email and wallet users both get bonuses

### Authentication
- **Email Authentication** via Supabase Auth
- **Web3 Wallet Connection** with automatic account creation
- **Unified User Experience** across both auth methods

### Database Architecture
- **PostgreSQL** with Supabase hosting
- **Database Triggers** for automatic bonus awarding
- **RPC Functions** for complex operations
- **Row Level Security** for data protection

## Technologies

- **Frontend**: React, TypeScript, Vite, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, Real-time)
- **State Management**: React Context API
- **Web3**: Wallet connection and authentication
- **Deployment**: Vercel

## Development

### Project Structure
```
agentdd/
├── docs/              # Documentation
├── src/
│   ├── components/    # React components
│   ├── context/       # React contexts
│   ├── services/      # API and business logic
│   ├── pages/         # Page components
│   └── types/         # TypeScript types
├── supabase/
│   └── migrations/    # Database migrations
└── public/           # Static assets
```

### Database Migrations
All database changes are managed through Supabase migrations:
```bash
npx supabase db diff     # See pending changes
npx supabase db push    # Apply migrations
npx supabase db reset   # Reset and reapply all
```

## Deployment

The application is deployed on Vercel with automatic deployments from the main branch.

**Live URL**: agentdd.vercel.app

## Contributing

1. Read the documentation in `docs/`
2. Set up your development environment
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Maintainer

Built and maintained by sedanoNPC 