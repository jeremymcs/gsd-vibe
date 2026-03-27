import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '{{project_name}}',
  description: 'A Next.js application',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
