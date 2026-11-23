import Link from 'next/link';
import './globals.css';
import './cv-styles.css';
import './wedding-styles.css';
export const metadata = {
  title: 'Occentra | Design. Personalize. Celebrate.',
  description: 'Editable CVs, cover letters and beautiful animated GIF invitations.',
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,700;1,400;1,700&family=Great+Vibes&family=Montserrat:wght@400;600;700&family=Playfair+Display:wght@400;700&display=swap" />
      </head>
      <body>{children}<footer style={{background:'#14263d',color:'#fff',padding:'28px 18px',textAlign:'center'}}><nav aria-label="Legal information" style={{display:'flex',gap:18,justifyContent:'center',flexWrap:'wrap'}}><Link href="/privacy-policy" style={{color:'#fff'}}>Privacy Policy</Link><Link href="/terms-and-conditions" style={{color:'#fff'}}>Terms &amp; Conditions</Link><Link href="/refund-policy" style={{color:'#fff'}}>Refund Policy</Link><Link href="/disclaimer" style={{color:'#fff'}}>Disclaimer</Link></nav><p style={{fontSize:12,opacity:.8,marginTop:18}}>© 2026 Occentra. All rights reserved.</p></footer></body>
    </html>
  );
}
