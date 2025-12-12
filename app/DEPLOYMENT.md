# Vercel Deployment Guide

## Prerequisites

1. A GitHub account
2. Your code pushed to a GitHub repository
3. A Vercel account (free tier works fine)

## Step-by-Step Deployment

### Option 1: Deploy via Vercel Dashboard (Recommended)

1. **Push your code to GitHub**
   ```bash
   cd app
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/yourusername/your-repo-name.git
   git push -u origin main
   ```

2. **Sign in to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Sign in with your GitHub account

3. **Import Project**
   - Click "Add New..." → "Project"
   - Select your GitHub repository
   - Vercel will auto-detect it's a Next.js project

4. **Configure Project**
   - **Framework Preset**: Next.js (should be auto-detected)
   - **Root Directory**: Leave as `.` (or set to `app` if your repo root is the parent directory)
   - **Build Command**: `npm run build` (default)
   - **Output Directory**: `.next` (default)
   - **Install Command**: `npm install` (default)

5. **Environment Variables** (if needed)
   - Currently none required since we're using public Google Sheets
   - If you add authentication later, add them here

6. **Deploy**
   - Click "Deploy"
   - Wait for build to complete (~2-3 minutes)

7. **Custom Domain Setup**
   - After deployment, go to Project Settings → Domains
   - Add `app.jiggycapital.com`
   - Follow DNS configuration instructions
   - Update your DNS records at your domain provider

### Option 2: Deploy via Vercel CLI

1. **Install Vercel CLI**
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel**
   ```bash
   cd app
   vercel login
   ```

3. **Deploy**
   ```bash
   vercel
   ```
   - Follow prompts:
     - Set up and deploy? **Yes**
     - Which scope? **Your account**
     - Link to existing project? **No** (first time)
     - Project name? **jiggy-capital-app** (or your choice)
     - Directory? **./** (current directory)
     - Override settings? **No**

4. **Production Deploy**
   ```bash
   vercel --prod
   ```

5. **Link Custom Domain**
   ```bash
   vercel domains add app.jiggycapital.com
   ```

## Important Configuration

### Root Directory Setup

If your repository structure is:
```
investor-portfolio/
  ├── app/          ← Next.js app is here
  ├── index.html
  └── script.js
```

Then in Vercel:
- Set **Root Directory** to `app`
- This tells Vercel where your Next.js app lives

### Build Settings

Vercel should auto-detect these, but verify:
- **Framework**: Next.js
- **Build Command**: `npm run build`
- **Output Directory**: `.next` (auto)
- **Install Command**: `npm install`

## Post-Deployment

1. **Verify Deployment**
   - Visit your Vercel URL (e.g., `your-app.vercel.app`)
   - Test the Home and Analyze pages
   - Check that Google Sheets data loads

2. **Custom Domain**
   - Add `app.jiggycapital.com` in Vercel dashboard
   - Update DNS records:
     - Type: `CNAME`
     - Name: `app`
     - Value: `cname.vercel-dns.com` (or provided by Vercel)

3. **Environment Variables** (Future)
   - If you add Google Sheets API authentication:
     - Go to Project Settings → Environment Variables
     - Add `GOOGLE_SHEETS_API_KEY` (if needed)

## Troubleshooting

### Build Fails
- Check build logs in Vercel dashboard
- Ensure all dependencies are in `package.json`
- Verify TypeScript compilation passes locally

### Data Not Loading
- Check browser console for CORS errors
- Verify Google Sheets are publicly accessible
- Check network tab for failed requests

### Custom Domain Not Working
- Wait 24-48 hours for DNS propagation
- Verify DNS records are correct
- Check Vercel domain configuration

## Continuous Deployment

Once connected to GitHub:
- Every push to `main` branch = automatic production deploy
- Every pull request = preview deployment
- No manual deployment needed!

## Performance

Vercel automatically:
- Optimizes Next.js builds
- Provides CDN for static assets
- Handles serverless functions
- Enables edge caching

## Cost

- **Hobby Plan (Free)**: Perfect for personal projects
  - Unlimited deployments
  - 100GB bandwidth/month
  - Serverless functions included

