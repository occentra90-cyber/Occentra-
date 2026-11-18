import Link from 'next/link';

const content = "**Effective date: 18 November 2026**\n\nOccentra sells digital templates for CVs, cover letters and invitations. We want customers to receive the digital product they paid for and have a clear way to resolve problems.\n\n## When to contact us\n\nPlease email **occentra90@gmail.com** if you were charged but the product did not unlock, received access to the wrong product, experienced a defective or unusable download, were charged twice, or believe a payment was made in error.\n\nInclude your order reference, the product purchased, the approximate payment date and a description of the problem. Do not send card numbers, PINs or passwords.\n\n## How we resolve issues\n\nWe will review the payment and purchase record and may first help restore access, correct a technical problem or provide the purchased digital product. Where a refund is required by law or appropriate after review, we will arrange it through an available payment or refund method.\n\n## Change-of-mind requests\n\nBecause these are digital products that may be accessed immediately, a change-of-mind request does not automatically guarantee a refund after access or download. However, we will consider each request fairly and honour any cancellation, cooling-off, defective-product or other rights that apply under South African law, including the Consumer Protection Act and Electronic Communications and Transactions Act where applicable.\n\n## Statutory rights\n\nThis policy does not override, exclude or restrict any non-excludable consumer rights. Where a digital product is defective, not supplied as agreed, or otherwise subject to a statutory remedy, the applicable law takes precedence.\n\n## Contact\n\nRefund and purchase assistance: **occentra90@gmail.com**.";

export const metadata = { title: "Refund Policy | Occentra" };

export default function LegalPage() {
  return <main style={{maxWidth:820,margin:'0 auto',padding:'42px 22px 70px',lineHeight:1.75}}>
    <Link href="/" style={{color:'#856632'}}>← Back to Occentra</Link>
    <h1 style={{fontFamily:'Georgia,serif',fontSize:'clamp(30px,5vw,42px)',color:'#14263d'}}>Refund Policy</h1>
    {content.split('\\n\\n').map((section,i)=>section.startsWith('## ')?<h2 key={i} style={{fontFamily:'Georgia,serif',marginTop:28,color:'#14263d'}}>{section.slice(3)}</h2>:<p key={i} style={{whiteSpace:'pre-line'}}>{section.replace(/\\*\\*/g,'')}</p>)}
  </main>;
}
