import Link from 'next/link';

const content = "**Effective date: 18 November 2026**\n\nOccentra provides editable digital templates for CVs, cover letters and invitations. The information and designs on this website are provided to help customers create their own documents and event materials.\n\n## CVs and cover letters\n\nOccentra does not guarantee job interviews, employment, admission, promotion or any particular result from using a CV or cover-letter template. We do not independently verify customer-provided qualifications, experience, references or other claims. Customers must check that their completed documents are accurate, appropriate and truthful before using them.\n\n## Invitations\n\nCustomers are responsible for checking event dates, times, venues, names, RSVP details and other invitation information before sharing. Occentra cannot guarantee attendance or responses from recipients.\n\n## Technical matters\n\nDevice compatibility, printer settings, browser restrictions and third-party services can affect appearance, downloading or access. If a paid product does not work as expected, contact **occentra90@gmail.com** so we can investigate.\n\n## Your legal rights\n\nThis disclaimer does not exclude or limit rights or remedies that cannot be excluded under applicable South African law, including consumer protection rights.\n\n## Contact\n\nQuestions: **occentra90@gmail.com**.";

export const metadata = { title: "Disclaimer | Occentra" };

export default function LegalPage() {
  return <main style={{maxWidth:820,margin:'0 auto',padding:'42px 22px 70px',lineHeight:1.75}}>
    <Link href="/" style={{color:'#856632'}}>← Back to Occentra</Link>
    <h1 style={{fontFamily:'Georgia,serif',fontSize:'clamp(30px,5vw,42px)',color:'#14263d'}}>Disclaimer</h1>
    {content.split(String.fromCharCode(10,10)).map((section,i)=>section.startsWith('## ')?<h2 key={i} style={{fontFamily:'Georgia,serif',marginTop:28,color:'#14263d'}}>{section.slice(3)}</h2>:<p key={i} style={{whiteSpace:'pre-line'}}>{section.replaceAll('**','')}</p>)}
  </main>;
}
