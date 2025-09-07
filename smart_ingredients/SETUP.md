# Smart Ingredients - Setup Guide

## Quick Start

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd smart_ingredients
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   Then edit `.env` with your Supabase credentials:
   - Get your Supabase URL and anon key from [supabase.com](https://supabase.com)
   - Replace the placeholder values in `.env`

4. **Start the development server**
   ```bash
   npx expo start
   ```

## Environment Variables

You need to set up these environment variables in your `.env` file:

- `EXPO_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anonymous key

## Troubleshooting

- **Metro bundler issues**: Try `npx expo start --clear`
- **Dependencies issues**: Delete `node_modules` and run `npm install` again
- **Environment variables not working**: Make sure your `.env` file is in the root directory

## Project Structure

- `app/` - Expo Router pages
- `lib/` - Utility functions and configurations
- `components/` - Reusable React components
- `assets/` - Images and static files
