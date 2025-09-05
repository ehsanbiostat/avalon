# Avalon Game - Deployment Guide

## 🚀 Vercel + Supabase Setup

### Prerequisites
- GitHub account
- Vercel account
- Supabase account

### Step 1: Set up Supabase Database

1. **Create Supabase Project**
   - Go to [supabase.com](https://supabase.com)
   - Create a new project
   - Note down your project URL and API keys

2. **Set up Database Schema**
   - Go to SQL Editor in your Supabase dashboard
   - Copy and paste the contents of `supabase-schema.sql`
   - Run the SQL to create all tables and functions

3. **Configure Authentication**
   - Go to Authentication > Settings
   - Enable email authentication
   - Configure email templates if needed

### Step 2: Configure Environment Variables

1. **Update Supabase Configuration**
   - Edit `supabase-config.js`
   - Replace `YOUR_SUPABASE_URL` with your project URL
   - Replace `YOUR_SUPABASE_ANON_KEY` with your anon key
   - Replace `YOUR_SUPABASE_SERVICE_ROLE_KEY` with your service role key

2. **Vercel Environment Variables** (Optional)
   - In Vercel dashboard, go to your project settings
   - Add environment variables:
     - `SUPABASE_URL`: Your Supabase project URL
     - `SUPABASE_ANON_KEY`: Your Supabase anon key

### Step 3: Deploy to Vercel

1. **Push to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/yourusername/avalon-game.git
   git push -u origin main
   ```

2. **Deploy to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Import your GitHub repository
   - Vercel will automatically detect it's a static site
   - Deploy!

3. **Custom Domain** (Optional)
   - In Vercel dashboard, go to your project
   - Go to Settings > Domains
   - Add your custom domain
   - Configure DNS as instructed

### Step 4: Update HTML to Use Supabase

Replace the old script imports in `index.html`:

```html
<!-- Replace these lines -->
<script src="js/auth.js"></script>
<script src="js/room.js"></script>

<!-- With these -->
<script type="module" src="js/supabase-auth.js"></script>
<script type="module" src="js/supabase-rooms.js"></script>
```

### Step 5: Test the Deployment

1. **Test Authentication**
   - Try registering a new account
   - Try logging in
   - Check if profile is created in Supabase

2. **Test Room Creation**
   - Create a room
   - Check if room appears in Supabase database
   - Test real-time updates

3. **Test Multiplayer**
   - Open in different browsers/devices
   - Create room in one, join in another
   - Test real-time synchronization

## 🔧 Development vs Production

### Development
- Use `npm run dev` for local development
- Use local Supabase instance or development project
- Hot reloading enabled

### Production
- Automatic deployment on git push
- Uses production Supabase project
- CDN distribution via Vercel
- HTTPS enabled by default

## 📊 Database Management

### Viewing Data
- Go to Supabase dashboard > Table Editor
- View all tables: profiles, game_rooms, room_players, games, etc.

### Monitoring
- Go to Supabase dashboard > Logs
- Monitor authentication, database, and real-time events

### Backups
- Supabase automatically backs up your database
- Manual backups available in dashboard

## 🚨 Troubleshooting

### Common Issues

1. **CORS Errors**
   - Check Supabase project settings
   - Ensure your domain is in allowed origins

2. **Authentication Issues**
   - Check email confirmation settings
   - Verify email templates

3. **Real-time Not Working**
   - Check Supabase real-time settings
   - Verify RLS policies

4. **Database Errors**
   - Check SQL schema was applied correctly
   - Verify RLS policies are enabled

### Debug Mode
- Open browser console
- Check for Supabase connection errors
- Monitor network requests

## 🔐 Security Considerations

1. **Row Level Security (RLS)**
   - All tables have RLS enabled
   - Policies restrict access appropriately

2. **API Keys**
   - Never expose service role key in client code
   - Use anon key for client-side operations

3. **Authentication**
   - Email confirmation required
   - Password requirements enforced

## 📈 Scaling Considerations

1. **Database**
   - Supabase scales automatically
   - Consider connection pooling for high traffic

2. **CDN**
   - Vercel provides global CDN
   - Static assets cached automatically

3. **Real-time**
   - Supabase real-time scales with usage
   - Consider rate limiting for high-frequency updates

## 🎯 Next Steps

1. **Analytics**
   - Add Google Analytics or similar
   - Track user engagement

2. **Features**
   - Add game statistics
   - Implement tournaments
   - Add mobile app

3. **Performance**
   - Optimize images
   - Implement service workers
   - Add offline support
