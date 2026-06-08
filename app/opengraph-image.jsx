import { ImageResponse } from 'next/og'

export const alt = 'HRFlow AI - Intelligent People Operations'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: 72,
          color: 'white',
          background: 'linear-gradient(135deg, #0f172a 0%, #312e81 48%, #7c3aed 100%)',
          fontFamily: 'Arial, sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, fontSize: 30, fontWeight: 700 }}>
          <div style={{ display: 'flex', width: 54, height: 54, alignItems: 'center', justifyContent: 'center', borderRadius: 15, background: '#4f46e5' }}>H</div>
          HRFlow AI
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', maxWidth: 900 }}>
          <div style={{ fontSize: 76, lineHeight: 1.03, fontWeight: 750, letterSpacing: '-3px' }}>
            Intelligent people operations.
          </div>
          <div style={{ marginTop: 28, color: '#c7d2fe', fontSize: 30 }}>
            Recruitment, workforce management, payroll, and AI insights in one secure platform.
          </div>
        </div>
        <div style={{ display: 'flex', gap: 16, color: '#ddd6fe', fontSize: 22 }}>
          Firebase Auth · PostgreSQL · Supabase · Gemini AI
        </div>
      </div>
    ),
    size,
  )
}
