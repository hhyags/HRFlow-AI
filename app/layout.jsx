import { Inter } from 'next/font/google'
import './globals.css'
import AuthSessionSync from '@/app/components/AuthSessionSync'
import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'

const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://hrflowai.app'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: 'HRFlow AI | Intelligent People Operations',
    template: '%s | HRFlow AI',
  },
  description: 'AI-powered human resource management for recruitment, workforce operations, payroll, and people analytics.',
  applicationName: 'HRFlow AI',
  keywords: ['HRMS', 'HR software', 'recruitment ATS', 'payroll', 'workforce analytics', 'Gemini AI'],
  authors: [{ name: 'HRFlow AI' }],
  creator: 'HRFlow AI',
  publisher: 'HRFlow AI',
  alternates: { canonical: '/' },
  icons: {
    icon: '/icon.svg',
    shortcut: '/icon.svg',
    apple: '/icon.svg',
  },
  openGraph: {
    type: 'website',
    url: '/',
    siteName: 'HRFlow AI',
    title: 'HRFlow AI | Intelligent People Operations',
    description: 'A secure AI-powered HR platform for modern organizations.',
    images: [{ url: '/opengraph-image', width: 1200, height: 630, alt: 'HRFlow AI' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'HRFlow AI | Intelligent People Operations',
    description: 'A secure AI-powered HR platform for modern organizations.',
    images: ['/opengraph-image'],
  },
  robots: { index: true, follow: true },
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        <AuthSessionSync />
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}
