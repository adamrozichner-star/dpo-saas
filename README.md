# DPO-as-a-Service Platform

AI-powered privacy compliance platform for Israeli SMBs under Amendment 13 to the Privacy Protection Law.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account (free tier works)
- Anthropic API key (for AI features)

### 1. Install Dependencies

```bash
cd dpo-saas
npm install
```

### 2. Set Up Environment Variables

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
ANTHROPIC_API_KEY=your_anthropic_api_key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Set Up Supabase Database

1. Create a new Supabase project
2. Go to SQL Editor
3. Run the contents of `supabase/schema.sql`

### 4. Run Development Server

```bash
npm run dev
```

Open http://localhost:3000

## 📁 Project Structure

```
dpo-saas/
├── src/
│   ├── app/                 # Next.js App Router pages
│   │   ├── page.tsx         # Landing page
│   │   ├── login/           # Login page
│   │   ├── onboarding/      # Onboarding flow
│   │   ├── dashboard/       # Client dashboard
│   │   └── dpo/             # DPO dashboard
│   ├── components/
│   │   └── ui/              # Reusable UI components
│   ├── lib/
│   │   ├── store.ts         # Zustand state management
│   │   ├── supabase.ts      # Supabase client
│   │   └── utils.ts         # Utility functions
│   └── types/
│       └── index.ts         # TypeScript types
├── supabase/
│   └── schema.sql           # Database schema
└── public/                  # Static assets
```

## 🎯 Features

### Client Features

- ✅ Multi-step onboarding questionnaire
- ✅ AI-powered document generation
- ✅ Dashboard with compliance status
- ✅ Q&A bot for privacy questions
- ✅ Document management
- ✅ Escalation to human DPO

### DPO Features

- ✅ Multi-client management
- ✅ Escalation queue
- ✅ Time tracking per client
- ✅ Analytics dashboard

## 📝 License

Proprietary - All rights reserved.

## 🤝 Support

For questions or support, contact support@deepo.co.il
