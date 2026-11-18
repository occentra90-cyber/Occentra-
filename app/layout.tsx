import Link from 'next/link';
import './globals.css';
import './cv-styles.css';
import './wedding-styles.css';
export const metadata = {
  title: 'Occentra | Design. Personalize. Celebrate.',
  description: 'Editable CVs and beautiful personalized invitations.',
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}<footer style={{background:'#14263d',color:'#fff',padding:'28px 18px',textAlign:'center'}}><nav aria-label="Legal information" style={{display:'flex',gap:18,justifyContent:'center',flexWrap:'wrap'}}><Link href="/privacy-policy" style={{color:'#fff'}}>Privacy Policy</Link><Link href="/terms-and-conditions" style={{color:'#fff'}}>Terms &amp; Conditions</Link><Link href="/refund-policy" style={{color:'#fff'}}>Refund Policy</Link><Link href="/disclaimer" style={{color:'#fff'}}>Disclaimer</Link></nav><p style={{fontSize:12,opacity:.8,marginTop:18}}>© 2026 Occentra. All rights reserved.</p></footer></body>
    </html>
  );
}
