'use client';
import { useEffect, useRef, useState } from 'react';
import { designs, groups, price, type Design, type Category } from '../lib/catalog';
import { selectSnapscanOrder } from '../lib/snapscan-order';

type Fields = {
  name: string;
  dob: string;
  contact: string;
  email: string;
  address: string;
  education: string;
  school: string;
  year: string;
  course: string;
  skills: string;
  experience: string;
  languages: string;
  references: string;
  summary: string;
  activities: string;
  subtitle: string;
  date: string;
  time: string;
  venue: string;
  message: string;
  rsvp: string;
  phone: string;
};

const defaults: Fields = {
  name: 'Thandiwe Nkosi',
  dob: '15 March 2002',
  contact: '071 234 5678',
  email: 'thandiwe@email.com',
  address: 'Durban, KwaZulu-Natal',
  education: 'Grade 12',
  school: 'Durban High School',
  year: '2020',
  course: 'BCom Accounting',
  skills: 'Communication\nTeamwork\nMicrosoft Office\nProblem Solving',
  experience: 'Admin Assistant – ABC Company (2023 – Present)\nCashier – Retail Store (2021 – 2022)',
  languages: 'English\nisiZulu\nAfrikaans',
  references: 'Available upon request',
  summary: 'Hard-working and reliable individual seeking opportunities to grow.',
  activities: 'Volunteer at local community centre\nMember of debate club',
  subtitle: 'You are warmly invited',
  date: 'Saturday, 18 April 2027',
  time: '14:00',
  venue: 'The Garden Venue',
  message: 'Join us for a wonderful celebration filled with love and joy.',
  rsvp: 'RSVP by 1 April',
  phone: '071 000 0000',
};

function privateDesignToken() {
  const params = new URLSearchParams(window.location.search);
  let savedToken: string | null = null;
  if (params.get('provider') === 'snapscan' || params.has('o')) {
    try { savedToken = localStorage.getItem('occentra_snapscan_cv_token') || sessionStorage.getItem('occentra_snapscan_token'); }
    catch { /* storage may be blocked in a payment-app browser */ }
  }
  const token = params.get('design') || savedToken;
  if (token && !params.has('design') && !params.has('o') && /^[a-f0-9]{64}$/.test(token)) {
    // Restore the private link locally. Do not share this bearer token with the payment provider.
    params.set('design', token);
    window.history.replaceState({}, '', window.location.pathname + '?' + params.toString());
  }
  return token;
}

function CVPreview({ layout, fields, mini = false }: { layout?: string; fields: Fields; mini?: boolean }) {
  const skillList = fields.skills.split('\n').filter(Boolean);
  const expList = fields.experience.split('\n').filter(Boolean);
  const langList = fields.languages.split('\n').filter(Boolean);
  const actList = fields.activities.split('\n').filter(Boolean);

  const content = (() => {
    if (layout === 'a1') {
      return (
        <>
          <h1>Curriculum Vitae</h1>
          <div className="cv-bar light-blue">Personal Information</div>
          <div className="cv-row"><span>Full Name</span><span>: {fields.name}</span></div>
          <div className="cv-row"><span>Date of Birth</span><span>: {fields.dob}</span></div>
          <div className="cv-row"><span>Contact No.</span><span>: {fields.contact}</span></div>
          <div className="cv-row"><span>Email</span><span>: {fields.email}</span></div>
          <div className="cv-row"><span>Address</span><span>: {fields.address}</span></div>
          <div className="cv-bar light-blue">Education</div>
          <div className="cv-row"><span>Highest Grade Completed</span><span>: {fields.education}</span></div>
          <div className="cv-row"><span>School</span><span>: {fields.school}</span></div>
          <div className="cv-row"><span>Year Completed</span><span>: {fields.year}</span></div>
          <div className="cv-bar light-blue">Skills</div>
          <ul>{skillList.map((s, i) => <li key={i}>{s}</li>)}</ul>
          <div className="cv-bar light-blue">Work Experience (if any)</div>
          <ul>{expList.map((s, i) => <li key={i}>{s}</li>)}</ul>
          <div className="cv-bar light-blue">Languages</div>
          <ul>{langList.map((s, i) => <li key={i}>{s}</li>)}</ul>
          <div className="cv-bar light-blue">References</div>
          <p className="cv-note">{fields.references}</p>
        </>
      );
    }
    if (layout === 'a2') {
      return (
        <>
          <h1>Curriculum Vitae</h1>
          <div className="cv-bar grey">Personal Information</div>
          <div className="cv-row"><span>Full Name</span><span>: {fields.name}</span></div>
          <div className="cv-row"><span>Date of Birth</span><span>: {fields.dob}</span></div>
          <div className="cv-row"><span>Contact No.</span><span>: {fields.contact}</span></div>
          <div className="cv-row"><span>Email</span><span>: {fields.email}</span></div>
          <div className="cv-row"><span>Address</span><span>: {fields.address}</span></div>
          <div className="cv-bar grey">Education</div>
          <div className="cv-row"><span>Highest Grade Completed</span><span>: {fields.education}</span></div>
          <div className="cv-row"><span>School</span><span>: {fields.school}</span></div>
          <div className="cv-row"><span>Year Completed</span><span>: {fields.year}</span></div>
          <div className="cv-bar grey">Skills</div>
          <ul>{skillList.map((s, i) => <li key={i}>{s}</li>)}</ul>
          <div className="cv-bar grey">Work Experience (if any)</div>
          <ul>{expList.map((s, i) => <li key={i}>{s}</li>)}</ul>
          <div className="cv-bar grey">Languages</div>
          <ul>{langList.map((s, i) => <li key={i}>{s}</li>)}</ul>
          <div className="cv-bar grey">References</div>
          <p className="cv-note">{fields.references}</p>
        </>
      );
    }
    if (layout === 'b1') {
      return (
        <>
          <div className="cv-header green"><h1>Curriculum Vitae</h1></div>
          <div className="cv-bar green">Personal Information</div>
          <div className="cv-row icon"><span>👤 Full Name</span><span>: {fields.name}</span></div>
          <div className="cv-row icon"><span>📅 Date of Birth</span><span>: {fields.dob}</span></div>
          <div className="cv-row icon"><span>📞 Contact No.</span><span>: {fields.contact}</span></div>
          <div className="cv-row icon"><span>✉ Email</span><span>: {fields.email}</span></div>
          <div className="cv-row icon"><span>📍 Address</span><span>: {fields.address}</span></div>
          <div className="cv-bar green">Education</div>
          <div className="cv-row"><span>Course / Program</span><span>: {fields.course}</span></div>
          <div className="cv-row"><span>School / University</span><span>: {fields.school}</span></div>
          <div className="cv-row"><span>Year Level</span><span>: {fields.education}</span></div>
          <div className="cv-row"><span>Expected Graduation</span><span>: {fields.year}</span></div>
          <div className="cv-bar green">Skills</div>
          <ul>{skillList.map((s, i) => <li key={i}>{s}</li>)}</ul>
          <div className="cv-bar green">Activities / Involvement</div>
          <ul>{actList.map((s, i) => <li key={i}>{s}</li>)}</ul>
          <div className="cv-bar green">References</div>
          <p className="cv-note">{fields.references}</p>
        </>
      );
    }
    if (layout === 'b2') {
      return (
        <>
          <div className="cv-header blue-wave"><h1>Curriculum Vitae</h1></div>
          <div className="cv-bar blue">Personal Information</div>
          <div className="cv-row icon"><span>👤 Full Name</span><span>: {fields.name}</span></div>
          <div className="cv-row icon"><span>📅 Date of Birth</span><span>: {fields.dob}</span></div>
          <div className="cv-row icon"><span>📞 Contact No.</span><span>: {fields.contact}</span></div>
          <div className="cv-row icon"><span>✉ Email</span><span>: {fields.email}</span></div>
          <div className="cv-row icon"><span>📍 Address</span><span>: {fields.address}</span></div>
          <div className="cv-bar blue">Education</div>
          <div className="cv-row"><span>Course / Program</span><span>: {fields.course}</span></div>
          <div className="cv-row"><span>School / University</span><span>: {fields.school}</span></div>
          <div className="cv-row"><span>Year Level</span><span>: {fields.education}</span></div>
          <div className="cv-row"><span>Expected Graduation</span><span>: {fields.year}</span></div>
          <div className="cv-bar blue">Skills</div>
          <div className="cv-two-col">
            <ul>{skillList.slice(0, Math.ceil(skillList.length / 2)).map((s, i) => <li key={i}>{s}</li>)}</ul>
            <ul>{skillList.slice(Math.ceil(skillList.length / 2)).map((s, i) => <li key={i}>{s}</li>)}</ul>
          </div>
          <div className="cv-bar blue">Additional Information</div>
          <ul>{actList.map((s, i) => <li key={i}>{s}</li>)}</ul>
          <div className="cv-bar blue">References</div>
          <p className="cv-note">{fields.references}</p>
        </>
      );
    }
    if (layout === 'c1') {
      return (
        <>
          <div className="cv-header dark"><h1>Curriculum Vitae</h1></div>
          <div className="cv-bar light">Personal Information</div>
          <div className="cv-row icon"><span>👤 Full Name</span><span>: {fields.name}</span></div>
          <div className="cv-row icon"><span>📅 Date of Birth</span><span>: {fields.dob}</span></div>
          <div className="cv-row icon"><span>📞 Contact No.</span><span>: {fields.contact}</span></div>
          <div className="cv-row icon"><span>✉ Email</span><span>: {fields.email}</span></div>
          <div className="cv-row icon"><span>📍 Address</span><span>: {fields.address}</span></div>
          <div className="cv-bar light">Professional Summary</div>
          <p className="cv-summary">{fields.summary}</p>
          <div className="cv-bar light">Work Experience</div>
          <ul className="exp-list">{expList.map((s, i) => <li key={i}>{s}</li>)}</ul>
          <div className="cv-two-col">
            <div>
              <div className="cv-bar light">Education</div>
              <div className="cv-row"><span>Degree / Course</span><span>: {fields.course || fields.education}</span></div>
              <div className="cv-row"><span>School / University</span><span>: {fields.school}</span></div>
              <div className="cv-row"><span>Year Completed</span><span>: {fields.year}</span></div>
            </div>
            <div>
              <div className="cv-bar light">Skills</div>
              <ul>{skillList.map((s, i) => <li key={i}>{s}</li>)}</ul>
            </div>
          </div>
        </>
      );
    }
    // c2 default
    return (
      <>
        <h1>Curriculum Vitae</h1>
        <div className="cv-bar grey">Personal Information</div>
        <div className="cv-row"><span>Full Name</span><span>: {fields.name}</span></div>
        <div className="cv-row"><span>Date of Birth</span><span>: {fields.dob}</span></div>
        <div className="cv-row"><span>Contact No.</span><span>: {fields.contact}</span></div>
        <div className="cv-row"><span>Email</span><span>: {fields.email}</span></div>
        <div className="cv-row"><span>Address</span><span>: {fields.address}</span></div>
        <div className="cv-bar grey">Work Experience</div>
        <ul className="exp-list">{expList.map((s, i) => <li key={i}>{s}</li>)}</ul>
        <div className="cv-bar grey">Education</div>
        <div className="cv-row"><span>Degree / Course</span><span>: {fields.course || fields.education}</span></div>
        <div className="cv-row"><span>School / University</span><span>: {fields.school}</span></div>
        <div className="cv-row"><span>Year Completed</span><span>: {fields.year}</span></div>
        <div className="cv-two-col">
          <div>
            <div className="cv-bar grey">Skills</div>
            <ul>{skillList.map((s, i) => <li key={i}>{s}</li>)}</ul>
          </div>
          <div>
            <div className="cv-bar grey">Languages</div>
            <ul>{langList.map((s, i) => <li key={i}>{s}</li>)}</ul>
          </div>
        </div>
        <div className="cv-bar grey">References</div>
        <p className="cv-note">{fields.references}</p>
      </>
    );
  })();

  if (mini) {
    return <div className="cv-mini-preview">{content}</div>;
  }
  return <div className={`cv-sheet ${layout || 'c2'}`}>{content}</div>;
}

export default function Home() {
  const [category, setCategory] = useState<Category | 'all'>('all');
  const [selected, setSelected] = useState<Design | null>(null);
  const [living, setLiving] = useState(false);
  const [fields, setFields] = useState<Fields>(defaults);
  const [sparkles, setSparkles] = useState(true);
  const [motion, setMotion] = useState(true);
  const [notice, setNotice] = useState('');

  const [checkingOut, setCheckingOut] = useState(false);
  const [snapscanAvailable, setSnapscanAvailable] = useState(false);
  const [guestToken, setGuestToken] = useState('');
  const [guestExpiry, setGuestExpiry] = useState('');
  const [guestLocked, setGuestLocked] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeCvOrder, setActiveCvOrder] = useState('');
  const [receiptOrder, setReceiptOrder] = useState('');
  const [verifyingCv, setVerifyingCv] = useState(false);
  const [recoveredPaidCopy, setRecoveredPaidCopy] = useState(false);
  const [verificationAttempt, setVerificationAttempt] = useState(0);
  const paidReceiptRef = useRef(false);

  useEffect(() => {
    fetch('/api/snapscan/config', { cache: 'no-store' })
      .then(response => response.ok ? response.json() : { available: false })
      .then(data => setSnapscanAvailable(data.available === true))
      .catch(() => setSnapscanAvailable(false));
  }, []);

  useEffect(() => {
    let storedOrder = '';
    try { storedOrder = localStorage.getItem('occentra_snapscan_cv_order') || ''; } catch {}
    const reference = selectSnapscanOrder({ returned: new URLSearchParams(window.location.search).get('o'), stored: storedOrder });
    if (reference) setActiveCvOrder(reference);
  }, []);

  useEffect(() => {
    const token = privateDesignToken();
    // A returned order is authoritative; wait for its authenticated payment
    // reconciliation before restoring any possibly stale browser design token.
    let savedOrder = '';
    try { savedOrder = localStorage.getItem('occentra_snapscan_cv_order') || ''; } catch {}
    if (selectSnapscanOrder({ returned: new URLSearchParams(window.location.search).get('o'), stored: savedOrder })) return;
    if (!token) return;
    fetch('/api/guest/design?token=' + encodeURIComponent(token), { cache: 'no-store' })
      .then(async response => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Private link unavailable');
        return result.design;
      })
      .then(design => {
        const entry = designs.find(d => d.id === design.template_id);
        if (!entry) throw new Error('Template unavailable');
        setSelected(entry);
        setFields({ ...defaults, ...design.fields });
        setLiving(Boolean(design.settings?.living));
        setMotion(design.settings?.motion !== false);
        setSparkles(design.settings?.sparkles !== false);
        setGuestToken(token);
        setGuestExpiry(design.expires_at);
        setGuestLocked(design.status === 'paid');
        setNotice(design.status === 'paid' ? 'Payment verified. Download your CV below as many times as you need.' : 'Payment was not completed. You can continue editing and pay when ready.');
      })
      .catch(error => setNotice(error instanceof Error ? error.message : 'Unable to open private link'));
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = privateDesignToken();
    if (activeCvOrder || params.has('o') || !token || params.get('payment') !== 'returned') return;
    const endpoint = params.get('provider') === 'snapscan' ? '/api/snapscan/status' : '/api/payfast/status';
    let active = true;
    let attempts = 0;
    setNotice('Checking your payment confirmation. Please wait; do not pay again.');
    const check = async () => {
      if (!active) return;
      try {
        const response = await fetch(endpoint + '?token=' + encodeURIComponent(token), { cache: 'no-store' });
        const result = await response.json();
        if (result.paid) {
          setGuestLocked(true);
          setNotice('Payment verified! You can download your CV as many times as needed.');
          return;
        }
      } catch { /* retry temporary network errors */ }
      attempts++;
      if (active && attempts < 15) window.setTimeout(check, 2000);
      else if (active) setNotice('Payment confirmation is still pending. Do not pay again. Please contact Occentra support if this continues.');
    };
    void check();
    return () => { active = false; };
  }, [activeCvOrder]);

  useEffect(() => {
    if (!activeCvOrder) return;
    // A fresh checkout replaces any verification loop for an older order.
    // This is independent of whether SnapScan redirects the payment app back.
    paidReceiptRef.current = false;
    setReceiptOrder(activeCvOrder);
    setVerifyingCv(true);
    setNotice('Checking this exact SnapScan order. Please do not pay again.');
    let active = true;
    let inFlight = false;
    let attempts = 0;
    let timer: number | undefined;

    const check = async () => {
      if (!active || paidReceiptRef.current || inFlight || document.visibilityState === 'hidden') return;
      inFlight = true;
      try {
        const response = await fetch('/api/snapscan/recover', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reference: activeCvOrder }),
        });
        const result = await response.json();
        if (!active || paidReceiptRef.current) return;

        if (response.ok && result.paid) {
          const entry = designs.find(d => d.id === result.templateId && d.category === 'cv');
          if (!entry) {
            setVerifyingCv(false);
            setNotice('This receipt is for a different product. Contact Occentra support with the order number.');
            return;
          }
          // The order number proves only the paid template. Restore private CV
          // details exclusively from the browser's original private token.
          let originalRestored = false;
          const token = privateDesignToken() || guestToken;
          if (token && /^[a-f0-9]{64}$/.test(token)) {
            try {
              const savedResponse = await fetch('/api/guest/design?token=' + encodeURIComponent(token), { cache: 'no-store' });
              const saved = await savedResponse.json();
              const design = saved.design;
              if (savedResponse.ok && design?.status === 'paid' && design.template_id === result.templateId) {
                if (!active) return;
                setFields({ ...defaults, ...design.fields });
                setLiving(Boolean(design.settings?.living));
                setMotion(design.settings?.motion !== false);
                setSparkles(design.settings?.sparkles !== false);
                setGuestToken(token);
                setGuestExpiry(design.expires_at);
                setRecoveredPaidCopy(false);
                originalRestored = true;
              }
            } catch { /* the original draft is optional for receipt recovery */ }
          }
          if (!active) return;
          if (!originalRestored) {
            // A still-open editor may already hold the customer's fields.
            // Keep them rather than replacing them with sample content.
            if (selected?.id !== result.templateId) setFields(defaults);
            setGuestToken('');
            setRecoveredPaidCopy(true);
          }
          setSelected(entry);
          setGuestLocked(true);
          paidReceiptRef.current = true;
          setVerifyingCv(false);
          setNotice(originalRestored
            ? 'Payment verified. Your saved CV is unlocked and ready to download.'
            : 'Payment verified. This browser did not retain your original details. You can edit this paid CV copy and download it without paying again.');
          return;
        }
        if (response.ok && result.found === false) {
          setVerifyingCv(false);
          setNotice('This order was not found in Occentra. Check the complete Order Number on your SnapScan receipt.');
          return;
        }
        if (!response.ok && response.status >= 400 && response.status < 500) {
          setVerifyingCv(false);
          setNotice(result.error || 'Unable to verify this receipt.');
          return;
        }
      } catch { /* retry temporary network errors */ }
      finally { inFlight = false; }
      if (!active || paidReceiptRef.current) return;
      if (++attempts < 48) timer = window.setTimeout(check, attempts < 16 ? 2500 : 6000);
      else {
        setVerifyingCv(false);
        setNotice('Verification is still pending. Do not pay again. Use the receipt form or contact Occentra with this order number.');
      }
    };
    const onReturn = () => {
      if (!active || paidReceiptRef.current || inFlight || document.visibilityState === 'hidden') return;
      if (timer) clearTimeout(timer);
      timer = window.setTimeout(check, 0);
    };
    window.addEventListener('pageshow', onReturn);
    document.addEventListener('visibilitychange', onReturn);
    void check();
    return () => {
      active = false;
      if (timer) clearTimeout(timer);
      window.removeEventListener('pageshow', onReturn);
      document.removeEventListener('visibilitychange', onReturn);
    };
  }, [activeCvOrder, verificationAttempt]);

  function verifyCvReceipt() {
    const reference = selectSnapscanOrder({ checkout: receiptOrder });
    if (!reference) {
      setNotice('Enter the complete Order Number from your SnapScan receipt.');
      return;
    }
    try { localStorage.setItem('occentra_snapscan_cv_order', reference); } catch {}
    setActiveCvOrder(reference);
    setVerificationAttempt(n => n + 1);
  }

  function startSeparateCvPurchase() {
    if (!window.confirm('Only make a new payment if the previous one was NOT charged. If you already paid, verify its receipt first. Start a separate purchase?')) return;
    try {
      localStorage.removeItem('occentra_snapscan_cv_order');
      localStorage.removeItem('occentra_snapscan_cv_token');
      sessionStorage.removeItem('occentra_snapscan_token');
    } catch {}
    paidReceiptRef.current = true;
    setActiveCvOrder('');
    setReceiptOrder('');
    setVerifyingCv(false);
    setGuestToken('');
    setGuestLocked(false);
    setRecoveredPaidCopy(false);
    window.history.replaceState({}, '', '/');
    setNotice('Ready for a separate CV checkout. No payment has been made.');
  }

  async function startSnapscanCheckout() {
    if (!selected || selected.category !== 'cv' || guestLocked || checkingOut || !snapscanAvailable) return;
    if (activeCvOrder) {
      setNotice('An earlier CV order is still being checked. Do not pay again; verify its receipt first.');
      return;
    }
    setCheckingOut(true);
    setNotice('');
    try {
      const savedResponse = await fetch('/api/guest/design', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId: selected.id, fields, settings: { living, motion, sparkles } }) });
      const saved = await savedResponse.json();
      if (!savedResponse.ok || !saved.token) throw new Error('Could not save your design');
      const response = await fetch('/api/snapscan/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ designId: selected.id, token: saved.token, returnOrigin: window.location.origin }) });
      const payment = await response.json();
      const reference = selectSnapscanOrder({ checkout: payment.reference });
      if (!response.ok || !payment.url || !reference) throw new Error(payment.error || 'SnapScan checkout is unavailable');
      setGuestToken(saved.token);
      try {
        sessionStorage.setItem('occentra_snapscan_token', saved.token);
        localStorage.setItem('occentra_snapscan_cv_token', saved.token);
        localStorage.setItem('occentra_snapscan_cv_order', reference);
      } catch { /* the return URL still carries the order reference */ }
      paidReceiptRef.current = false;
      setActiveCvOrder(reference);
      setReceiptOrder(reference);
      window.location.assign(payment.url);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'SnapScan checkout is unavailable');
      setCheckingOut(false);
    }
  }

  const update = (key: keyof Fields, value: string) => setFields((old) => ({ ...old, [key]: value }));

  function open(d: Design) {
    setSelected(d);
    setGuestToken('');
    setGuestExpiry('');
    setGuestLocked(false);
    window.history.replaceState({}, '', '/');
    setLiving(false);
    setFields({
      ...defaults,
      name:
        d.category === 'wedding'
          ? 'Amelia & James'
          : d.category === 'birthday'
          ? 'Birthday Celebration'
          : d.category === 'baby'
          ? 'Baby Lucas'
          : 'Thandiwe Nkosi',
      date: 'Saturday, 20 March 2027',
      venue: 'The Rose Garden',
      rsvp: 'RSVP to Sarah: 082 123 4567',
    });
    setNotice('');
    window.scrollTo(0, 0);
  }

  const chosen = selected;
  const enterCategory = (id: Category) => {
    setCategory(id);
    setSelected(null);
    window.scrollTo(0, 0);
  };
  const goHome = () => {
    setCategory('all');
    setSelected(null);
    window.scrollTo(0, 0);
  };

  return (
    <>
      <header>
        <div className="logo">
          OCCENTRA
          <small>PROFESSIONAL CV TEMPLATES</small>
        </div>
        <nav>
          {groups.map(([id, name]) => (
            <button key={id} onClick={() => enterCategory(id)}>
              {name}
            </button>
          ))}
          <a href="/cover-letters" style={{padding:'10px 14px',display:'inline-block',color:'inherit',textDecoration:'none'}}>Cover Letters</a>
        </nav>
      </header>

      {!chosen && !activeCvOrder && (
        <details style={{ maxWidth: 760, margin: '16px auto', padding: '12px 20px', background: '#fff8e9', borderRadius: 8 }}>
          <summary>Already paid for a CV but no download? Verify your SnapScan receipt</summary>
          <p>This checks an existing payment. It does not charge you again.</p>
          <label>SnapScan Order Number
            <input type="text" value={receiptOrder} onChange={e => setReceiptOrder(e.target.value)} autoComplete="off" spellCheck={false} />
          </label>
          <button type="button" onClick={verifyCvReceipt}>Verify paid CV receipt</button>
          {notice && <p role="status">{notice}</p>}
        </details>
      )}

      {!chosen && activeCvOrder && (
        <section role="status" style={{ maxWidth: 760, margin: '22px auto', padding: 22, background: '#fff8e9', border: '1px solid #c8aa76', borderRadius: 8 }}>
          <h2>Checking your SnapScan CV payment</h2>
          <p>{notice || 'We are checking the order you already started. Please do not pay again.'}</p>
          <p>Occentra order: <code style={{ overflowWrap: 'anywhere' }}>{activeCvOrder}</code></p>
          {!verifyingCv && <button type="button" onClick={() => setVerificationAttempt(n => n + 1)}>Check this payment again (no charge)</button>}
          <label style={{ display: 'block', marginTop: 12 }}>Or enter the Order Number on your SnapScan receipt:
            <input type="text" value={receiptOrder} onChange={e => setReceiptOrder(e.target.value)} autoComplete="off" spellCheck={false} />
          </label>
          <button type="button" onClick={verifyCvReceipt}>Verify receipt without paying again</button>
        </section>
      )}

      {!chosen ? (
        <>
          <section className="hero">
            <small>YOUR NEXT OPPORTUNITY STARTS HERE</small>
            <h1>
              Professional CVs.
              <br />
              <em>Made for you.</em>
            </h1>
            <p>Choose a CV, edit your details, pay R20 and download your finished CV.</p>
            <button
              className="goldbtn"
              onClick={() => document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth' })}
            >
              Explore CV templates ↓
            </button>
          </section>

          <main className="container" id="catalog">
            {category !== 'all' && (
              <button className="back" onClick={goHome}>
                ← Back to homepage
              </button>
            )}
            {groups
              .filter(([id]) => category === 'all' || category === id)
              .map(([id, name, desc]) => {
                const entries = designs.filter((d) => d.category === id);
                return (
                  <section className="section" key={id}>
                    <div className="heading">
                      <div>
                        <h2>{name}</h2>
                        <p>{desc}</p>
                      </div>
                      {category === 'all' ? (
                        <button onClick={() => enterCategory(id)}>View all →</button>
                      ) : (
                        <button onClick={goHome}>← Home</button>
                      )}
                    </div>
                    <div className={category === 'all' ? 'gallery featured-gallery' : 'gallery'}>
                      {(category === 'all' ? entries.slice(0, 3) : entries).map((d) => (
                        <button className="tile" key={d.id} onClick={() => open(d)}>
                          {d.category === 'cv' ? (
                            <div className="mini cv cv-card" data-layout={d.layout}>
                              <CVPreview layout={d.layout} fields={defaults} mini />
                            </div>
                          ) : (
                            <div
                              className={'mini ' + d.category}
                              data-design={d.name}
                              data-collection={d.collection}
                              style={{ '--accent': d.accent } as React.CSSProperties}
                            >
                              <small>
                                {d.category === 'baby'
                                  ? 'A LITTLE ONE IS ON THE WAY'
                                  : d.category === 'wedding'
                                  ? 'TOGETHER FOREVER'
                                  : 'YOU ARE INVITED'}
                              </small>
                              <h3>
                                {d.category === 'baby'
                                  ? 'Baby Shower'
                                  : d.category === 'wedding'
                                  ? 'Amelia & James'
                                  : 'Birthday Party'}
                              </h3>
                              <strong>
                                {d.category === 'wedding' ? 'Wedding Celebration' : 'Celebrating with Friends'}
                              </strong>
                              <div className="mini-sample">
                                Please join us for a joyful celebration!
                                <br />
                                <b>Saturday, 20 March 2027</b>
                                <br />
                                14:00 · The Rose Garden
                                <br />
                                Durban, South Africa
                                <br />
                                <b>RSVP: Sarah · 082 123 4567</b>
                              </div>
                            </div>
                          )}
                          <div className="tileinfo">
                            <span>{d.name}</span>
                            <strong>R{price(d.category)}</strong>
                          </div>
                        </button>
                      ))}
                    </div>
                  </section>
                );
              })}
            {category === 'all' && (
              <section className="section" aria-label="Editable cover letters">
                <div className="heading">
                  <div><h2>Editable Cover Letters</h2><p>Four professional South African job application letters · R15 each · edit every paragraph</p></div>
                  <a href="/cover-letters" style={{color:'inherit',fontWeight:700}}>View all →</a>
                </div>
                <div className="gallery cover-letter-gallery">
                  {([
                    ['Classic Professional','General Worker','#f7f7f7','#29323b'],
                    ['Modern Navy','Graduate','#263e58','#ffffff'],
                    ['Soft Sage','Retail Assistant','#e5eee7','#486957'],
                    ['Executive Minimal','Operations Manager','#f4f1ed','#292929']
                  ] as const).slice(0,3).map(([title,role,bg,ink]) => (
                    <a href={"/cover-letters?template=" + (title === "Classic Professional" ? "classic" : title === "Modern Navy" ? "navy" : title === "Soft Sage" ? "sage" : "executive")} className="tile" key={title} style={{textDecoration:'none',color:'inherit'}}>
                      <div className="cover-letter-mini" style={{background:bg,color:ink}}>
                        <div className="cover-letter-mini-page">
                          <h3>{title}</h3>
                          <div className="cover-letter-mini-contact">Durban · 071 234 5678 · example@email.com</div>
                          <div className="cover-letter-mini-rule" />
                          <p>14 November 2026</p>
                          <p>The Hiring Manager<br/>South Africa</p>
                          <strong>RE: Application for {role}</strong>
                          <p>Dear Hiring Manager,</p>
                          <p>I am writing to apply for the {role} position. I am a motivated applicant and would welcome the opportunity to contribute positively to your organisation.</p>
                          <p>Thank you for considering my application.</p>
                          <p>Yours faithfully,</p>
                        </div>
                      </div>
                      <div className="tileinfo"><span>{title}</span><strong>R15 · Edit →</strong></div>
                    </a>
                  ))}
                </div>
              </section>
            )}
          </main>
        </>
      ) : (
        <main className="container">
          <button
            className="back"
            onClick={() => {
              setSelected(null);
              window.scrollTo(0, 0);
            }}
          >
            ← Back to templates
          </button>

          <div className="editorheading">
            <h1>{chosen.name}</h1>
            <p>{guestLocked ? 'Purchased design · editing locked' : 'Personalize your design. Changes update immediately.'}</p>
            {guestExpiry && <p>Private access expires {new Date(guestExpiry).toLocaleDateString('en-ZA')}. Download your design before this date.</p>}
            <strong>R{price(chosen.category, living)}</strong>
          </div>

          {(chosen.category === 'baby' || chosen.category === 'birthday') && (
            <div className="mode">
              <button disabled={guestLocked} className={!living ? 'active' : ''} onClick={() => setLiving(false)}>
                Stationary · R49
              </button>
              <button disabled={guestLocked} className={living ? 'active' : ''} onClick={() => setLiving(true)}>
                {chosen.category === 'birthday' ? 'Animated · R99' : 'Living 3D · R99'}
              </button>
            </div>
          )}

          <div className="editlayout">
            <div>
              {chosen.category === 'cv' ? (
                <CVPreview layout={chosen.layout} fields={fields} />
              ) : (
                <div
                  className={
                    'preview ' +
                    chosen.category +
                    (living && (chosen.category === 'baby' || chosen.category === 'birthday') ? ' immersive' : '')
                  }
                  data-design={chosen.name}
                  data-collection={chosen.collection}
                  style={{ '--accent': chosen.accent } as React.CSSProperties}
                >
                  <small>
                    {chosen.category === 'baby'
                      ? 'A LITTLE ONE IS ON THE WAY'
                      : chosen.category === 'wedding'
                      ? 'THE WEDDING OF'
                      : 'LET’S CELEBRATE'}
                  </small>
                  <p className="script">
                    {chosen.category === 'baby'
                      ? 'Baby Shower'
                      : chosen.category === 'wedding'
                      ? 'Wedding Invitation'
                      : 'Birthday Invitation'}
                  </p>
                  {fields.subtitle && <p>{fields.subtitle}</p>}
                  <h2>{fields.name}</h2>
                  <p className="preview-stars">✦ ✧ ✦</p>
                  {fields.message && <p>{fields.message}</p>}
                  <div className="details">
                    {(['date', 'time', 'venue', 'address'] as const).map(
                      (k) => fields[k] && <span key={k}>{fields[k]}</span>
                    )}
                  </div>
                  <p>{fields.rsvp}</p>
                  {(chosen.category === 'baby' || chosen.category === 'birthday') && living && (
                    <>
                      <i className="balloon b1" style={{ animationPlayState: motion ? 'running' : 'paused' }} />
                      <i className="balloon b2" style={{ animationPlayState: motion ? 'running' : 'paused' }} />
                      {sparkles && (
                        <>
                          <i className="sparkle" style={{ left: '20%', animationDelay: '0s' }}>✦</i>
                          <i className="sparkle" style={{ left: '50%', animationDelay: '1.5s' }}>✧</i>
                          <i className="sparkle" style={{ left: '75%', animationDelay: '3s' }}>✦</i>
                        </>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>

            <div className="editor">
              <fieldset disabled={guestLocked && !recoveredPaidCopy} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
              {chosen.category === 'cv' ? (
                <>
                  <label>
                    Full Name
                    <input value={fields.name} onChange={(e) => update('name', e.target.value)} />
                  </label>
                  <label>
                    Date of Birth
                    <input value={fields.dob} onChange={(e) => update('dob', e.target.value)} />
                  </label>
                  <label>
                    Contact No.
                    <input value={fields.contact} onChange={(e) => update('contact', e.target.value)} />
                  </label>
                  <label>
                    Email
                    <input value={fields.email} onChange={(e) => update('email', e.target.value)} />
                  </label>
                  <label>
                    Address
                    <input value={fields.address} onChange={(e) => update('address', e.target.value)} />
                  </label>
                  <label>
                    Highest Grade / Education
                    <input value={fields.education} onChange={(e) => update('education', e.target.value)} />
                  </label>
                  <label>
                    School / University
                    <input value={fields.school} onChange={(e) => update('school', e.target.value)} />
                  </label>
                  <label>
                    Year
                    <input value={fields.year} onChange={(e) => update('year', e.target.value)} />
                  </label>
                  <label>
                    Course / Program
                    <input value={fields.course} onChange={(e) => update('course', e.target.value)} />
                  </label>
                  <label>
                    Skills (one per line)
                    <textarea rows={4} value={fields.skills} onChange={(e) => update('skills', e.target.value)} />
                  </label>
                  <label>
                    Work Experience (one per line)
                    <textarea rows={3} value={fields.experience} onChange={(e) => update('experience', e.target.value)} />
                  </label>
                  <label>
                    Activities / Involvement (one per line)
                    <textarea rows={2} value={fields.activities} onChange={(e) => update('activities', e.target.value)} />
                  </label>
                  <label>
                    Languages (one per line)
                    <textarea rows={2} value={fields.languages} onChange={(e) => update('languages', e.target.value)} />
                  </label>
                  <label>
                    References
                    <input value={fields.references} onChange={(e) => update('references', e.target.value)} />
                  </label>
                  {!guestLocked && <p>When your CV is ready, tap Pay R20. Your design is prepared automatically.</p>}
                </>
              ) : (
                <>
                  <label>
                    Names
                    <input value={fields.name} onChange={(e) => update('name', e.target.value)} />
                  </label>
                  {(['subtitle', 'message', 'date', 'time', 'venue', 'address', 'rsvp'] as const).map((k) => (
                    <label key={k}>
                      {k[0].toUpperCase() + k.slice(1)}
                      {k === 'message' ? (
                        <textarea rows={3} value={fields[k]} onChange={(e) => update(k, e.target.value)} />
                      ) : (
                        <input value={fields[k]} onChange={(e) => update(k, e.target.value)} />
                      )}
                    </label>
                  ))}
                  {living && (
                    <>
                      <label className="check">
                        <input type="checkbox" checked={motion} onChange={(e) => setMotion(e.target.checked)} />
                        Gentle themed movement and glowing lights
                      </label>
                      <label className="check">
                        <input type="checkbox" checked={sparkles} onChange={(e) => setSparkles(e.target.checked)} />
                        Falling sparkles
                      </label>
                    </>
                  )}
                </>
              )}

              </fieldset>
              {guestLocked && chosen.category === 'cv' && <button type="button" className="goldbtn" onClick={() => window.print()}>Download CV as PDF</button>}
              {chosen.category === 'cv' && !guestLocked && activeCvOrder && (
                <button type="button" className="goldbtn" disabled={verifyingCv} onClick={() => setVerificationAttempt(n => n + 1)}>
                  {verifyingCv ? 'Checking this SnapScan payment…' : 'Check existing SnapScan payment'}
                </button>
              )}
              {chosen.category === 'cv' && !guestLocked && !activeCvOrder && (
                <button type="button" className="goldbtn" onClick={startSnapscanCheckout} disabled={checkingOut || !snapscanAvailable}>
                  {checkingOut ? 'Opening SnapScan…' : snapscanAvailable ? 'Pay R20 · SnapScan' : 'SnapScan checkout temporarily unavailable'}
                </button>
              )}
              {chosen.category === 'cv' && !guestLocked && activeCvOrder && (
                <button type="button" onClick={startSeparateCvPurchase}>Start a separate purchase (only if not charged)</button>
              )}
              {chosen.category === 'cv' && !guestLocked && (
                <details>
                  <summary>Already paid but no CV download? Verify your receipt</summary>
                  <label>SnapScan Order Number
                    <input type="text" value={receiptOrder} onChange={e => setReceiptOrder(e.target.value)}
                      placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" autoComplete="off" spellCheck={false} />
                  </label>
                  <button type="button" onClick={verifyCvReceipt}>Verify paid CV receipt (no new charge)</button>
                </details>
              )}
              {chosen.category === 'cv' && !guestLocked && activeCvOrder && (
                <p>Current Occentra order: <code style={{ overflowWrap: 'anywhere' }}>{activeCvOrder}</code></p>
              )}
              {chosen.category === 'cv' && !guestLocked && !snapscanAvailable && (
                <p>We are finishing our secure SnapScan connection. Please check back soon to purchase your CV.</p>
              )}
              {guestLocked && <p>Payment verified. Download your CV as many times as you need while this page is open.</p>}
              {notice && (
                <p className="notice" role="status">
                  {notice}
                </p>
              )}
            </div>
          </div>
        </main>
      )}

      <footer>OCCENTRA · Professional CV Templates</footer>
    </>
  );
}
