# 🚀 Deploy to Vercel - Step by Step

## Option 1: Deploy via Vercel CLI (Fastest)

### Step 1: Install Vercel CLI
```bash
npm install -g vercel
```

### Step 2: Login to Vercel
```bash
vercel login
```

### Step 3: Deploy
```bash
cd dpo-saas
vercel
```

Follow the prompts:
- Set up and deploy? **Y**
- Which scope? **Select your account**
- Link to existing project? **N**
- Project name? **dpo-saas** (or your choice)
- Directory? **./** (current)
- Override settings? **N**

### Step 4: Deploy to Production
```bash
vercel --prod
```

---

## Option 2: Deploy via GitHub (Recommended for ongoing development)

### Step 1: Push to GitHub
```bash
cd dpo-saas
git init
git add .
git commit -m "Initial commit - DPO SaaS POC"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/dpo-saas.git
git push -u origin main
```

### Step 2: Connect to Vercel
1. Go to [vercel.com](https://vercel.com)
2. Click "Add New Project"
3. Import your GitHub repository
4. Vercel auto-detects Next.js settings
5. Click "Deploy"

---

## Option 3: Deploy via Vercel Dashboard (No CLI)

1. Go to [vercel.com/new](https://vercel.com/new)
2. Click "Upload" tab
3. Drag and drop the `dpo-saas` folder
4. Click "Deploy"

---

## Environment Variables (Optional)

After deployment, add these in Vercel Dashboard → Settings → Environment Variables:

| Variable | Value | Required |
|----------|-------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase URL | No* |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon key | No* |
| `ANTHROPIC_API_KEY` | Your Claude API key | No* |

*App works with mock data without these

---

## After Deployment

Your app will be live at:
- Preview: `https://dpo-saas-xxx.vercel.app`
- Production: `https://dpo-saas.vercel.app` (or custom domain)

### Test URLs:
- Landing: `/`
- Login: `/login`
- Onboarding: `/onboarding`
- Dashboard: `/dashboard`
- DPO Panel: `/dpo`

### Demo Credentials:
- **Client**: `demo@company.co.il` / `123456`
- **DPO**: `dana@dpo-service.co.il` / `123456`

---

## Custom Domain (Optional)

1. Go to Project Settings → Domains
2. Add your domain (e.g., `dpo-pro.co.il`)
3. Update DNS records as instructed
4. SSL is automatic

---

## Troubleshooting

### Build fails?
- Check Node version is 18+
- Ensure all dependencies are in package.json

### Blank page?
- Check browser console for errors
- Verify environment variables are set

### Need help?
- Vercel docs: https://vercel.com/docs
- Next.js docs: https://nextjs.org/docs
