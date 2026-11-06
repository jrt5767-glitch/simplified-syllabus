export const sampleSyllabus = `PSY 201 — Introduction to Psychology
Fall 2026 | August 24 – December 11, 2026
Instructor: Dr. Maya Chen
Email: maya.chen@example.edu
Office hours: Tuesdays, 2–4 PM, Science Hall 214
Class meets: Monday & Wednesday, 10:00–11:15 AM · Science Hall 102

Course description
Explore how people think, feel, learn, and connect. This course introduces the science of behavior, memory, development, and social psychology.

Required materials
Psychology 2e, OpenStax (free online textbook)

Grading
Weekly reflections: 20%
Research proposal: 15%
Midterm exam: 25%
Final project: 30%
Participation: 10%

Important dates
September 4, 2026 — Reflection 1 due at 11:59 PM
September 18, 2026 — Reflection 2 due at 11:59 PM
October 9, 2026 — Research proposal due at 11:59 PM
November 9, 2026 — Midterm exam at 10:00 AM
November 13, 2026 — Memory lab reflection due at 11:59 PM
November 20, 2026 — Research outline due at 11:59 PM
December 4, 2026 — Final project due at 11:59 PM
December 9, 2026 — Final presentation at 10:00 AM

Policies
Late work: 10% deducted per day, up to 3 days. Contact the instructor in advance for extensions.
Attendance: More than 3 unexcused absences may affect participation grades.
Academic integrity: Cite all sources. AI tools may be used for brainstorming only, with disclosure.
Accessibility: Contact the campus accessibility office to arrange accommodations.`;

export const uid = () => globalThis.crypto.randomUUID();
const months = {jan:1,feb:2,mar:3,apr:4,may:5,jun:6,jul:7,aug:8,sep:9,oct:10,nov:11,dec:12};
const datePattern = /\b(20\d{2})-(\d{1,2})-(\d{1,2})\b|\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\.?\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s+(20\d{2}))?\b|\b(\d{1,2})\/(\d{1,2})(?:\/(20\d{2}))?\b/gi;
export function parseDates(line, year) {
  const out = [];
  for (const m of line.matchAll(datePattern)) {
    const y = Number(m[1] || m[6] || m[9] || year);
    const mo = Number(m[2] || (m[4] ? months[m[4].slice(0,3).toLowerCase()] : m[7]));
    const d = Number(m[3] || m[5] || m[8]);
    const dt = new Date(Date.UTC(y,mo-1,d));
    if (dt.getUTCFullYear()===y && dt.getUTCMonth()===mo-1 && dt.getUTCDate()===d) out.push({date:`${y}-${String(mo).padStart(2,'0')}-${String(d).padStart(2,'0')}`,raw:m[0],index:m.index});
  }
  return out;
}
export function basicOrganize(text, year = new Date().getFullYear()) {
  const lines = text.split(/\n+/).map(s=>s.trim()).filter(Boolean);
  const semester = lines.find(s=>/\b(fall|spring|summer|winter)\b/i.test(s)) || '';
  const explicitYear = semester.match(/20\d{2}/)?.[0];
  const assumedYear = Number(explicitYear || year);
  const deadlines=[]; const grading=[]; const policies=[];
  let materials=[]; let section='';
  for (const line of lines) {
    if (/^(required materials|textbooks?|materials|reading)\s*:?$/i.test(line)) {section='materials';continue;}
    if (/^(policies|grading|important dates|course description|schedule)\s*:?$/i.test(line)) {section=line.toLowerCase();continue;}
    if(section==='materials' && materials.length<8) materials.push(line);
    const g=line.match(/^(.+?)\s*[:–—-]?\s*(\d+(?:\.\d+)?)\s*%\s*$/);
    if(g) grading.push({name:g[1].trim().replace(/[:–—-]$/,'').trim(),weight:Number(g[2])});
    if (/^(late work|attendance|academic integrity|accessibility|ai policy|extensions|missed exams|participation policy)\s*:/i.test(line)) {
      const [name,...rest]=line.split(':'); policies.push({name,detail:rest.join(':').trim()});
    }
    const dates=parseDates(line,assumedYear);
    if(!dates.length || /^(fall|spring|summer|winter|class meets|office hours)/i.test(line))continue;
    if (!/\b(due|exam|quiz|project|assignment|reflection|proposal|presentation|paper|midterm|final|lab|reading|test|homework)\b/i.test(line)) continue;
    for(const date of dates) {
      const title=line.replace(date.raw,'').replace(/^\s*[-–—:|·]+\s*/,'').replace(/\s+(?:due\s+)?(?:at|by)\s+\d{1,2}(?::\d{2})?\s*(?:am|pm).*$/i,'').replace(/\s+due$/i,'').trim() || 'Course deadline';
      const time=line.match(/\b(\d{1,2}(?::\d{2})?\s*(?:am|pm))\b/i)?.[0] || '';
      deadlines.push({id:uid(),title,date:date.date,time,type:/exam|midterm|test|quiz/i.test(title)?'Exam':/project|presentation/i.test(title)?'Project':'Assignment',completed:false,source:line});
    }
  }
  const code=lines.slice(0,6).join(' ').match(/\b[A-Z]{2,6}\s?\d{2,4}[A-Z]?\b/)?.[0] || '';
  const title=lines.find(s=>s.includes(code) && code) || lines[0] || 'Untitled course';
  const get=(re)=>lines.find(s=>re.test(s))?.replace(re,'').trim() || '';
  return {
    title:title.replace(/\s*syllabus\s*/i,'').replace(/^\s*[-–—:|]+|[-–—:|]+\s*$/g,'').trim(),code,semester,
    instructor:get(/^(?:instructor|professor|lecturer)\s*:\s*/i),email:text.match(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/)?.[0] || '',
    officeHours:get(/^office hours\s*:\s*/i),meeting:get(/^(?:class meets|meeting(?: times?)?|class time)\s*:\s*/i),
    summary:lines.findIndex(s=>/^course description\s*:?$/i.test(s))>=0 ? (lines[lines.findIndex(s=>/^course description\s*:?$/i.test(s))+1] || '') : '',
    grading,policies,materials,deadlines:deadlines.sort((a,b)=>a.date.localeCompare(b.date)),
    warnings:[...(!explicitYear ? [`Dates without a year use ${assumedYear}. Check them against your course.`]:[]),...(!deadlines.length ? ['No dated assignments were recognized. Add deadlines manually, or connect AI for more flexible extraction.']:[]),'Basic extraction recognizes explicit dates and labeled details. Review the original syllabus for anything missed.'],
    engine:'basic',source:text
  };
}

export function makeDemoCourses() {
  const base=basicOrganize(sampleSyllabus,2026);
  base.id=uid();base.color='green';base.deadlines=base.deadlines.map((d,i)=>({...d,completed:i<3}));
  const other=[
    {title:'ENG 102 — Writing & Rhetoric',code:'ENG 102',instructor:'Dr. James Rivera',meeting:'Tuesday & Thursday · 1:00–2:15 PM',color:'peach',ds:[['Personal essay','2026-11-10','Assignment'],['Peer review workshop','2026-11-17','Assignment'],['Research essay','2026-12-03','Project']]},
    {title:'BIO 110 — Life Sciences',code:'BIO 110',instructor:'Dr. Amara Okafor',meeting:'Monday & Wednesday · 2:00–3:15 PM',color:'purple',ds:[['Cell biology quiz','2026-11-12','Exam'],['Lab report 4','2026-11-16','Assignment'],['Final exam','2026-12-10','Exam']]}
  ].map(c=>({id:uid(),semester:'Fall 2026',summary:'Illustrative course for exploring your semester dashboard.',grading:[],materials:[],policies:[],warnings:['This is sample course data.'],officeHours:'',email:'',source:'Illustrative sample course.',engine:'sample',...c,deadlines:c.ds.map(([title,date,type])=>({id:uid(),title,date,type,time:'',completed:false,source:'Illustrative sample deadline.'}))}));
  return [base,...other];
}
export function dateLabel(value, options={month:'short',day:'numeric'}) {
  return new Intl.DateTimeFormat('en-US',options).format(new Date(value+'T12:00:00'));
}
export function calendarFile(courses) {
  const escape=s=>String(s||'').replace(/\\/g,'\\\\').replace(/\r?\n/g,'\\n').replace(/,/g,'\\,').replace(/;/g,'\\;');
  const fold=s=>{const a=[];let cur='';for(const ch of s){if(new TextEncoder().encode(cur+ch).length>73){a.push(cur);cur=' '+ch;}else cur+=ch;}a.push(cur);return a.join('\r\n');};
  const events=courses.flatMap(c=>c.deadlines.filter(d=>d.date).map(d=>{
    const start=d.date.replaceAll('-','');const next=new Date(d.date+'T12:00:00Z');next.setUTCDate(next.getUTCDate()+1);
    return ['BEGIN:VEVENT',`UID:${d.id}@simplified-syllabus`,`DTSTAMP:${new Date().toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'')}`,`DTSTART;VALUE=DATE:${start}`,`DTEND;VALUE=DATE:${next.toISOString().slice(0,10).replaceAll('-','')}`,`SUMMARY:${escape(c.code+': '+d.title)}`,`DESCRIPTION:${escape([d.time?`Due time in syllabus: ${d.time}`:'',d.source,'Confirm dates and time zone with your syllabus.'].filter(Boolean).join('\n'))}`,'END:VEVENT'].map(fold).join('\r\n');}));
  return ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Simplified Syllabus//Student planner//EN','CALSCALE:GREGORIAN',...events,'END:VCALENDAR',''].join('\r\n');
}
