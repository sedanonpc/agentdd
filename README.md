# NBA Betting System

A modern NBA betting platform with a cyberpunk terminal aesthetic, providing odds, match information, and betting capabilities.

## Features

- NBA match data with simulated odds
- Terminal-inspired UI with cyberpunk aesthetic
- User betting system with transaction tracking
- Match chat rooms and global chat
- Responsive design for all devices

## Setup Instructions

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn

### Installation

1. Clone the repository
   ```
   git clone <repository-url>
   cd nba-betting-system
   ```

2. Install dependencies
   ```
   npm install
   ```

### Supabase Setup (Optional)

The application uses Supabase for authentication and database storage. To enable this functionality:

1. Create a Supabase account at [https://supabase.com](https://supabase.com) and start a new project
   
2. Create the required tables in Supabase:

   - Create a `user_profiles` table with the following columns:
     - `id` (uuid, primary key)
     - `user_id` (uuid, foreign key to auth.users, not null)
     - `email` (text)
     - `wallet_address` (text)
     - `created_at` (timestamp with time zone, default: now())
     - `updated_at` (timestamp with time zone, default: now())

3. Create a `.env` file in the project root with the following variables:
   ```
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```
   
   You can find these values in your Supabase dashboard under Project Settings > API.

4. Set up Row Level Security (RLS) policies for the `user_profiles` table:
   
   ```sql
   -- Enable read access for authenticated users to their own profile
   CREATE POLICY "Users can view their own profile"
   ON user_profiles
   FOR SELECT
   USING (auth.uid() = user_id);
   
   -- Enable insert access for authenticated users
   CREATE POLICY "Users can insert their own profile"
   ON user_profiles
   FOR INSERT
   WITH CHECK (auth.uid() = user_id);
   
   -- Enable update access for authenticated users to their own profile
   CREATE POLICY "Users can update their own profile"
   ON user_profiles
   FOR UPDATE
   USING (auth.uid() = user_id);
   ```

5. Enable Email Auth in Supabase:
   - Go to Authentication > Providers
   - Enable Email provider
   - Configure any additional settings as needed

If Supabase is not configured, the application will fall back to using local storage for demonstration purposes.

### Running the Application

Start the development server:
```
npm run dev
```

The application will be available at http://localhost:5173 by default.

## Data Source

The application uses simulated NBA match data that closely resembles real-world data. The UI clearly indicates when mock data is being used with a "MOCK" label.

## Technologies Used

- React
- TypeScript
- Vite
- Tailwind CSS
- React Router
- Context API for state management

## License

This project is licensed under the MIT License - see the LICENSE file for details. 