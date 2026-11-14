'use client';
import { useState } from 'react';
import { designs, groups, price, type Design, type Category } from '../lib/catalog';

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

  const update = (key: keyof Fields, value: string) => setFields((old) => ({ ...old, [key]: value }));

  function open(d: Design) {
    setSelected(d);
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
        </nav>
      </header>

      {!chosen ? (
        <>
          <section className="hero">
            <small>YOUR NEXT OPPORTUNITY STARTS HERE</small>
            <h1>
              Professional CVs.
              <br />
              <em>Made for you.</em>
            </h1>
            <p>Choose a professional CV template, personalize your details, and save or print your CV. All templates R20.</p>
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
            <p>Personalize your design. Changes update immediately.</p>
            <strong>R{price(chosen.category, living)}</strong>
          </div>

          {(chosen.category === 'baby' || chosen.category === 'birthday') && (
            <div className="mode">
              <button className={!living ? 'active' : ''} onClick={() => setLiving(false)}>
                Stationary · R49
              </button>
              <button className={living ? 'active' : ''} onClick={() => setLiving(true)}>
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
                  <button className="goldbtn" onClick={() => window.print()}>
                    Print / Save CV as PDF
                  </button>
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

              <button
                className="goldbtn"
                onClick={() => setNotice('Payfast checkout is not active yet. No payment was charged.')}
              >
                Pay R{price(chosen.category, living)} · Coming soon
              </button>
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
