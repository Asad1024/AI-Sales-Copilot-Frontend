# AI Sales Copilot - Frontend

Next.js 14 + React + TypeScript frontend for the AI Sales Copilot Platform.

## 🚀 Quick Start

### Local Development

```bash
# Install dependencies
npm install

# Create and populate environment variables
echo "NEXT_PUBLIC_API_BASE=http://localhost:4000/api" > .env.local

# Run development server
npm run dev
```

Visit `http://localhost:3000`

## 📦 Environment Variables

- `NEXT_PUBLIC_API_BASE` - Backend API URL (e.g., `http://localhost:4000/api`)

## 🔧 Deployment

### Deploy to Vercel

1. Connect your GitHub repository
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to main

See `VERCEL_DEPLOY.md` for detailed instructions.

## 🏗️ Project Structure

```
frontend/
├── app/             # Next.js app router pages
│   ├── admin/      # Admin panel pages
│   ├── auth/       # Authentication pages
│   ├── dashboard/  # User dashboard
│   └── ...
├── components/     # React components
│   ├── auth/      # Auth guards
│   ├── leads/     # Lead management
│   └── ui/        # UI components
├── lib/            # Utilities, API client
├── context/        # React context providers
└── styles/         # Global styles
```

## 🎨 Features

- ✅ Admin Panel with user management
- ✅ User Dashboard with leads and campaigns
- ✅ Authentication (login/signup)
- ✅ Role-based access control
- ✅ Responsive design
- ✅ Dark mode support

## 🔒 Security

- JWT token authentication
- Protected routes with AuthGuard
- Admin routes protected with AdminGuard
- API client with automatic token handling

## 🛠️ Tech Stack

- Next.js 14 (App Router)
- React 18
- TypeScript
- Tailwind CSS
- SWR for data fetching

