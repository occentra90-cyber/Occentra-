'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { selectSnapscanOrder } from '../../lib/snapscan-order';
import './cover-letters.css';

type Letter = { name:string; city:string; phone:string; email:string; date:string; recipient:string; company:string; location:string; subject:string; greeting:string; paragraphs:string[]; closing:string };
type Template = { id:string; title:string; role:string; sample:Letter };
const templates:Template[] = [
{ id:'classic',title:'Classic Professional',role:'General Worker',sample:{name:'Thabo Mokoena',city:'Durban, KwaZulu-Natal',phone:'071 234 5678',email:'thabo.mokoena@example.com',date:'14 November 2026',recipient:'The Hiring Manager',company:'ABC Logistics',location:'Durban',subject:'Application for General Worker Position',greeting:'Dear Hiring Manager,',paragraphs:[
'I am writing to apply for the General Worker position at ABC Logistics.',
'I am a hardworking, reliable and motivated individual who is willing to learn and contribute positively to your company. I have completed Grade 12 and possess good communication, teamwork and time-management skills.',
'I am able to follow instructions, work well with others and complete assigned tasks responsibly. I am also willing to undergo training to improve my skills.',
'I would appreciate the opportunity to attend an interview and discuss how I could contribute to your team.',
'Thank you for considering my application.'],closing:'Yours faithfully,'}},
{ id:'navy',title:'Modern Navy',role:'Graduate',sample:{name:'Naledi Dlamini',city:'Johannesburg, Gauteng',phone:'072 345 6789',email:'naledi.dlamini@example.com',date:'14 November 2026',recipient:'The Recruitment Manager',company:'BrightPath Consulting',location:'Johannesburg',subject:'Application for Junior Administrative Assistant',greeting:'Dear Recruitment Manager,',paragraphs:[
'I am excited to apply for the Junior Administrative Assistant position at BrightPath Consulting.',
'I recently completed a Diploma in Business Management and am eager to begin my professional career. During my studies, I developed organisational, communication and computer skills, including proficiency in Microsoft Word, Excel and PowerPoint.',
'I am detail-oriented, dependable and comfortable working both independently and as part of a team. I believe my willingness to learn and positive attitude would allow me to contribute meaningfully to your organisation.',
'I would welcome the opportunity to discuss my application in an interview.',
'Thank you for your time and consideration.'],closing:'Kind regards,'}},
{ id:'sage',title:'Soft Sage',role:'Retail Assistant',sample:{name:'Lerato Khumalo',city:'Pretoria, Gauteng',phone:'073 456 7890',email:'lerato.khumalo@example.com',date:'14 November 2026',recipient:'The Store Manager',company:'Sunrise Retail',location:'Pretoria',subject:'Application for Sales Assistant',greeting:'Dear Store Manager,',paragraphs:[
'I would like to apply for the Sales Assistant position at Sunrise Retail.',
'I have two years of retail experience, during which I developed strong customer service, communication and cash-handling skills. My responsibilities included assisting customers, organising merchandise, processing payments and maintaining a clean shopping environment.',
'I enjoy helping customers and working in a busy team environment. I am punctual, friendly and committed to providing excellent service.',
'I believe my experience and dedication would make me a valuable addition to your team.',
'Thank you for considering my application. I look forward to the opportunity to meet with you.'],closing:'Yours sincerely,'}},
{ id:'executive',title:'Executive Minimal',role:'Operations Manager',sample:{name:'Michael Naidoo',city:'Cape Town, Western Cape',phone:'074 567 8901',email:'michael.naidoo@example.com',date:'14 November 2026',recipient:'The Human Resources Director',company:'Horizon Solutions',location:'Cape Town',subject:'Application for Operations Manager',greeting:'Dear Human Resources Director,',paragraphs:[
'I am writing to express my interest in the Operations Manager position at Horizon Solutions.',
'With over eight years of experience in operations management, team leadership and process improvement, I have developed a strong ability to coordinate business activities, improve efficiency and support organisational goals.',
'In my previous role, I supervised a team of 15 employees, introduced improved reporting procedures and helped reduce operational delays by 20%.',
'My leadership approach focuses on accountability, collaboration and continuous improvement. I am confident that my experience would allow me to contribute positively to your organisation.',
'I would welcome the opportunity to discuss how my skills and experience align with your requirements.',
'Thank you for your consideration.'],closing:'Kind regards,'}}
];
function LetterPage({letter,theme}:{letter:Letter;theme:string}){
return <article className={'letter-paper theme-'+theme}>
<header className="letter-identity"><h2>{letter.name}</h2><div>{[letter.city,letter.phone,letter.email].filter(Boolean).join('  ·  ')}</div></header>
<div className="letter-content">
{letter.date && <p>{letter.date}</p>}
<div className="letter-recipient">{[letter.recipient,letter.company,letter.location].filter(Boolean).map((v,i)=><div key={i}>{v}</div>)}</div>
{letter.subject && <p className="letter-subject">RE: {letter.subject}</p>}
{letter.greeting && <p>{letter.greeting}</p>}
{letter.paragraphs.filter(Boolean).map((p,i)=><p key={i}>{p}</p>)}
{letter.closing && <p>{letter.closing}</p>}
{letter.name && <strong>{letter.name}</strong>}
</div></article>}
export default function CoverLetters(){
const [active,setActive]=useState(0);const [editing,setEditing]=useState(false);
useEffect(()=>{const id=new URLSearchParams(window.location.search).get('template');const index=templates.findIndex(t=>t.id===id);if(index>=0){setActive(index);setEditing(true)}},[]);const [drafts,setDrafts]=useState<Letter[]>(templates.map(t=>({...t.sample,paragraphs:[...t.sample.paragraphs]})));
const [notice,setNotice]=useState('');
const [checkingOut,setCheckingOut]=useState(false);
const [snapscanAvailable,setSnapscanAvailable]=useState(false);
const [paid,setPaid]=useState(false);
const [paymentToken,setPaymentToken]=useState('');
const [receiptOrder,setReceiptOrder]=useState('');
const [recovering,setRecovering]=useState(false);
const [verifyingReturn,setVerifyingReturn]=useState(false);
const [activeOrder,setActiveOrder]=useState('');
const paidReceiptRef=useRef(false);
const letter=drafts[active];const template=templates[active];
useEffect(()=>{
 fetch('/api/snapscan/config',{cache:'no-store'})
  .then(r=>r.ok?r.json():{available:false})
  .then(data=>setSnapscanAvailable(data.available===true))
  .catch(()=>setSnapscanAvailable(false));
},[]);
useEffect(()=>{
 // Read the returned order once, then keep subsequent checkout changes in
 // React state. An effect with [] dependencies would keep polling an old order.
 let storedOrder='';
 try{storedOrder=localStorage.getItem('occentra_snapscan_order')||''}catch{}
 const reference=selectSnapscanOrder({returned:new URLSearchParams(window.location.search).get('o'),stored:storedOrder});
 if(!reference)return;
 setActiveOrder(reference);
},[]);
useEffect(()=>{
 if(!activeOrder)return;
 // Each new checkout replaces the previous reconciliation loop. This also
 // works when a mobile payment app does not navigate back to Occentra.
 paidReceiptRef.current=false;
 setReceiptOrder(activeOrder);
 setVerifyingReturn(true);
 setNotice('Checking your SnapScan payment automatically. Please wait; you do not need to pay again.');
 let stopped=false;let attempts=0;let inFlight=false;let timer:ReturnType<typeof setTimeout>|undefined;
 const check=async()=>{
  if(stopped||paidReceiptRef.current||inFlight)return;
  if(document.visibilityState==='hidden')return; // Visibility change will trigger an immediate fresh check.
  inFlight=true;
  try{
   const response=await fetch('/api/snapscan/recover',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({reference:activeOrder})});
   const result=await response.json();
   if(stopped||paidReceiptRef.current)return;
   if(response.ok&&result.paid){
    const index=templates.findIndex(t=>'cover-'+t.id===result.templateId);
    if(index>=0){
     // Restore the exact edited letter when this browser still has its private
     // saved-design token. In an isolated return browser, show an editable
     // paid copy without exposing stored private fields via the receipt URL.
     let privateToken='';
     try{privateToken=new URLSearchParams(window.location.search).get('design')||
       sessionStorage.getItem('occentra_snapscan_token')||localStorage.getItem('occentra_snapscan_token')||''}catch{}
     if(/^[a-f0-9]{64}$/.test(privateToken)){
      try{
       const saved=await fetch('/api/guest/design?token='+encodeURIComponent(privateToken),{cache:'no-store'});
       const record=await saved.json();
       if(saved.ok&&record.design?.status==='paid'&&record.design?.template_id===result.templateId){
        setDrafts(old=>old.map((d,i)=>i===index?record.design.fields as Letter:d));
       }
      }catch{}
     }
     if(stopped||paidReceiptRef.current)return;
     paidReceiptRef.current=true;setActive(index);setEditing(true);setPaid(true);
     setNotice('Payment verified automatically. Your cover letter is ready to edit and download.');
    }else setNotice('Payment was confirmed for a different product.');
    return;
   }
   if(!response.ok&&response.status>=400&&response.status<500){
    setVerifyingReturn(false);
    setNotice(result.error||'Unable to check the returned payment.');return;
   }
  }catch{}
  finally{inFlight=false}
  if(stopped||paidReceiptRef.current)return;
  if(++attempts<48)timer=setTimeout(check,attempts<16?2500:6000);
  else{setVerifyingReturn(false);setNotice('Payment verification is taking longer than expected. Do not pay again; use the receipt form to retry.');}
 };
 const onReturn=()=>{
  if(stopped||paidReceiptRef.current||document.visibilityState==='hidden')return;
  if(timer)clearTimeout(timer);
  if(!inFlight)timer=setTimeout(check,0);
 };
 document.addEventListener('visibilitychange',onReturn);
 window.addEventListener('pageshow',onReturn);
 void check();return()=>{
  stopped=true;if(timer)clearTimeout(timer);
  document.removeEventListener('visibilitychange',onReturn);
  window.removeEventListener('pageshow',onReturn);
 };
},[activeOrder]);
useEffect(()=>{
 const query=new URLSearchParams(window.location.search);
 // The return-order checker above already reconciles this payment and restores
 // the saved design when possible; avoid competing status polls for old tokens.
 if(query.has('o')||activeOrder)return;
 try{if(localStorage.getItem('occentra_snapscan_order'))return}catch{}
 // A user may navigate back manually instead of following SnapScan's return link.
 // Recover their private token locally and check their existing payment automatically.
 let storedSnapscanToken='';
 try{storedSnapscanToken=sessionStorage.getItem('occentra_snapscan_token')||localStorage.getItem('occentra_snapscan_token')||''}catch{}
 const token=query.get('design')||storedSnapscanToken;
 if(!/^[a-f0-9]{64}$/.test(token))return;
 const isSnapscan=query.get('provider')==='snapscan'||Boolean(storedSnapscanToken&&token===storedSnapscanToken);
 if(!query.has('design')){
  query.set('design',token);
  if(isSnapscan)query.set('provider','snapscan');
  window.history.replaceState({},'',window.location.pathname+'?'+query.toString());
 }
 setPaymentToken(token);
 if(query.get('payment')==='cancelled'){setNotice('Payment was cancelled. You have not been charged by Occentra.');return;}
 let stopped=false;let attempts=0;let inFlight=false;let timer:ReturnType<typeof setTimeout>|undefined;
 const endpoint=isSnapscan?'/api/snapscan/status':'/api/payfast/status';
 const check=async()=>{
  if(stopped||paidReceiptRef.current||inFlight||document.visibilityState==='hidden')return;
  inFlight=true;
  try{
   const response=await fetch(endpoint+'?token='+encodeURIComponent(token),{cache:'no-store'});
   const result=await response.json();
   if(stopped||paidReceiptRef.current)return;
   if(result.paid){
    const saved=await fetch('/api/guest/design?token='+encodeURIComponent(token),{cache:'no-store'});
    const record=await saved.json();
    if(saved.ok&&record.design?.template_id?.startsWith('cover-')){
     const id=record.design.template_id.replace('cover-','');
     const index=templates.findIndex(t=>t.id===id);
     if(index>=0){
      setDrafts(old=>old.map((d,i)=>i===index?record.design.fields as Letter:d));
      paidReceiptRef.current=true;setActive(index);setEditing(true);setPaid(true);setNotice('Payment verified. You can download your letter.');
     }
    }else setNotice('Payment was confirmed, but your saved letter could not be loaded. Contact Occentra support with the order number.');
    return;
   }
   if(!response.ok&&response.status>=400&&response.status<500){
    setNotice(result.error||'This payment link is unavailable.');return;
   }
  }catch{}
  finally{inFlight=false}
  if(stopped||paidReceiptRef.current)return;
  // Keep checking while the customer remains here, without excessive API calls.
  // A return from the payment app also triggers an immediate fresh check.
  if(++attempts<45)timer=setTimeout(check,attempts<16?2500:10000);
  else setNotice('Still waiting for SnapScan. Do not pay again. Returning to this tab will recheck automatically.');
 };
 const onReturn=()=>{
  if(stopped||paidReceiptRef.current||document.visibilityState==='hidden')return;
  if(timer)clearTimeout(timer);
  void check();
 };
 window.addEventListener('focus',onReturn);
 window.addEventListener('pageshow',onReturn);
 document.addEventListener('visibilitychange',onReturn);
 void check();return()=>{
  stopped=true;if(timer)clearTimeout(timer);
  window.removeEventListener('focus',onReturn);
  window.removeEventListener('pageshow',onReturn);
  document.removeEventListener('visibilitychange',onReturn);
 };
},[activeOrder]);
async function pay(){
 if(checkingOut||paid||!snapscanAvailable)return;
 setCheckingOut(true);setNotice('');
 try{
  const savedResponse=await fetch('/api/guest/design',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({templateId:'cover-'+template.id,fields:letter,settings:{}})});
  const saved=await savedResponse.json();
  if(!savedResponse.ok||!saved.token)throw new Error(saved.error||'Unable to save letter');
  setPaymentToken(saved.token);
  const response=await fetch('/api/snapscan/checkout',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({designId:'cover-'+template.id,token:saved.token,returnOrigin:window.location.origin})});
  const payment=await response.json();
  const reference=selectSnapscanOrder({checkout:payment.reference});
  if(!response.ok||!payment.url||!reference)throw new Error(payment.error||'SnapScan checkout unavailable');
  try{
   sessionStorage.setItem('occentra_snapscan_token',saved.token);
   localStorage.setItem('occentra_snapscan_token',saved.token);
   localStorage.setItem('occentra_snapscan_order',reference);
  }catch{}
  // The new reference becomes authoritative even without a redirect/reload.
  paidReceiptRef.current=false;
  setActiveOrder(reference);
  setReceiptOrder(reference);
  window.location.assign(payment.url);
 }catch(e){setNotice(e instanceof Error?e.message:'Unable to start checkout');setCheckingOut(false)}
}

async function verifyReceipt(){
 if(recovering)return;
 const reference=receiptOrder.trim().toLowerCase();
 if(!/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(reference)){
  setNotice('Enter the complete Order Number from your SnapScan receipt.');return;
 }
 setRecovering(true);setNotice('Checking this order directly with SnapScan. This will not charge you again.');
 try{
  const response=await fetch('/api/snapscan/recover',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({reference})});
  const result=await response.json();
  if(!response.ok)throw new Error(result.error||'Payment verification unavailable');
  if(result.paid){
   const index=templates.findIndex(t=>'cover-'+t.id===result.templateId);
   if(index<0)throw new Error('This paid receipt is not for a cover letter.');
   // The browser may still hold the private token of a later, unpaid checkout.
   // The receipt grants a freshly editable paid copy without exposing private
   // contents of the original saved design or requiring a second payment.
   try{localStorage.setItem('occentra_snapscan_order',reference)}catch{}
   paidReceiptRef.current=true;setActive(index);setEditing(true);setPaid(true);
   setNotice('R15 payment confirmed! You can now edit and download your paid cover letter. Check the text before saving the PDF.');
  }else setNotice(result.found
   ? 'This order exists, but SnapScan has not returned a matching completed payment. Do not pay again; contact Occentra support with the receipt.'
   : 'We could not find this order number in Occentra. Check the number on your SnapScan receipt.');
 }catch(e){setNotice(e instanceof Error?e.message:'Unable to check the receipt right now.')}
 finally{setRecovering(false)}
}

function startNewPurchase(){
 const message=paid
  ? 'Save your paid PDF first. Start a separate cover letter purchase?'
  : 'Only start a new checkout if your previous payment was NOT charged. If you paid already, use the receipt recovery option. Start a new checkout?';
 if(!window.confirm(message))return;
 // Never erase the actual purchase or saved draft from the server. This only
 // removes the browser's old checkout pointer so a new purchase can start.
 try{
  sessionStorage.removeItem('occentra_snapscan_token');
  localStorage.removeItem('occentra_snapscan_token');
  localStorage.removeItem('occentra_snapscan_order');
 }catch{}
 paidReceiptRef.current=true; // Stop the old checkout's scheduled status checks.
 setActiveOrder('');
 setPaymentToken('');setReceiptOrder('');setVerifyingReturn(false);
 setPaid(false);setNotice('Ready for a separate checkout. This has not made a payment.');
 window.history.replaceState({},'','/cover-letters?template='+template.id);
}

const update=(key:keyof Letter,value:string)=>setDrafts(old=>old.map((d,i)=>i===active?{...d,[key]:value}:d));
const addParagraph=()=>setDrafts(old=>old.map((d,i)=>i===active?{...d,paragraphs:[...d.paragraphs,'']}:d));
const removeParagraph=(index:number)=>setDrafts(old=>old.map((d,i)=>i===active?{...d,paragraphs:d.paragraphs.filter((_,j)=>j!==index)}:d));
const updateParagraph=(index:number,value:string)=>setDrafts(old=>old.map((d,i)=>i===active?{...d,paragraphs:d.paragraphs.map((p,j)=>j===index?value:p)}:d));
return <div className="letters-site">
<div className="letters-top"><Link href="/">← Occentra Home</Link><strong>OCCENTRA</strong><span>Editable Cover Letters</span></div>
<main className="letters-main">{!editing && <div className="letters-intro"><span>JOB APPLICATION ESSENTIALS</span><h1>Cover letters that look professional.</h1><p>Choose a design and customise the complete sample letter. Your edits appear immediately. The names and employers shown are fictional examples.</p></div>}
{!editing && <div className="letters-grid">{templates.map((t,i)=><button type="button" className={'letter-choice '+(active===i?'chosen':'')} key={t.id} onClick={()=>{setActive(i);setEditing(true);setNotice('');window.history.replaceState({},'', '/cover-letters?template='+t.id)}} aria-pressed={active===i}><div className={'letter-thumb theme-'+t.id}><div className="thumb-name">{t.sample.name}</div><div className="thumb-line"/><div className="thumb-line short"/><div className="thumb-gap"/>{Array.from({length:9},(_,j)=><div className={'thumb-line '+(j%3===0?'short':'')} key={j}/>)}</div><b>{t.title}</b><small>{t.role} · R15</small></button>)}</div>}
{editing && <div className="letters-editor-nav"><button type="button" onClick={()=>{setEditing(false);window.history.replaceState({},'','/cover-letters')}}>← All cover letter designs</button><strong>{template.title} · R15</strong></div>}
<div className="letters-workspace"><section className="letters-preview"><div className="letters-section-title"><h2>Live preview</h2><span>{template.title}</span></div><LetterPage letter={letter} theme={template.id}/><p className="letters-note">This is a sample preview. Downloads unlock after payment verification.</p></section>
<section className="letters-editor"><fieldset className="letters-fields"><div className="letters-section-title"><h2>Edit your letter</h2><button type="button" onClick={()=>{setDrafts(old=>old.map((d,i)=>i===active?{...template.sample,paragraphs:[...template.sample.paragraphs]}:d));setNotice('Example restored.')}}>Reset example</button></div>
{([['name','Full name'],['city','City and province'],['phone','Phone number'],['email','Email'],['date','Date'],['recipient','Recipient'],['company','Company'],['location','Company location'],['subject','Job application subject'],['greeting','Greeting']] as [keyof Letter,string][]).map(([key,label])=><label key={key}>{label}<input value={letter[key] as string} onChange={e=>update(key,e.target.value)}/></label>)}
<h3>Letter paragraphs</h3>{letter.paragraphs.map((p,i)=><label key={i}>Paragraph {i+1}<textarea rows={Math.max(3,Math.ceil(p.length/75))} value={p} onChange={e=>updateParagraph(i,e.target.value)}/></label>)}
<button type="button" className="letter-add" onClick={addParagraph}>+ Add paragraph</button>
<label>Closing<input value={letter.closing} onChange={e=>update('closing',e.target.value)}/></label>
<p className="letters-note">Tailor the sample to the actual vacancy. Only include experience and achievements that are true for you.</p></fieldset><div className="letters-payment">{paid ? <button type="button" onClick={()=>window.print()}>Download paid cover letter as PDF</button> : verifyingReturn ? <button type="button" disabled>Checking your SnapScan payment…</button> : paymentToken ? <button type="button" onClick={()=>window.location.reload()}>Check existing SnapScan payment</button> : <button type="button" disabled={checkingOut||!snapscanAvailable} onClick={pay}>{checkingOut?'Opening SnapScan…':snapscanAvailable?'Pay R15 · SnapScan':'SnapScan checkout temporarily unavailable'}</button>}{(paid||verifyingReturn||paymentToken)&&<button type="button" className="letters-secondary" onClick={startNewPurchase}>{paid?'Create another cover letter':'Start a separate checkout (only if not charged)'}</button>}{!paid&&!snapscanAvailable&&!verifyingReturn&&<p className="letters-note">We are finishing our secure SnapScan connection. Please check back soon to purchase.</p>}<p className="letters-note">Secure checkout. Download unlocks only after verified payment.</p>{paymentToken&&!paid&&<p className="letters-note">Your payment reference is saved in this browser link until it expires.</p>}{notice && <p role="status">{notice}</p>}</div>
{!paid&&<details className="letters-payment">
 <summary>Already paid but no download? Check your receipt</summary>
 <label htmlFor="snapscan-receipt-order">Already paid? Enter the Order Number on your SnapScan receipt.
  <input id="snapscan-receipt-order" type="text" autoComplete="off" spellCheck={false}
   placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" value={receiptOrder} onChange={e=>setReceiptOrder(e.target.value)}/>
 </label>
 <button type="button" disabled={recovering} onClick={verifyReceipt}>{recovering?'Verifying existing payment…':'Verify R15 payment receipt'}</button>
 <p className="letters-note">This checks a previous purchase. It does not make another payment.</p>
 </details>}
{!paid&&activeOrder&&<p className="letters-note">Occentra order number: <code style={{overflowWrap:'anywhere'}}>{activeOrder}</code>. Keep this number for payment support.</p>}
</section></div></main></div>}
