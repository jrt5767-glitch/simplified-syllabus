import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { basicOrganize,parseDates,sampleSyllabus,makeDemoCourses,calendarFile } from '../shared/syllabus.mjs';
import { courseSchema } from '../lib/course-schema.mjs';
import { verifyStripeSignature,cookieToken,token,hashToken,validOrigin } from '../lib/security.mjs';
import handler from '../api/index.js';

test('sample syllabus produces useful, grounded dates and details',()=>{
 const c=basicOrganize(sampleSyllabus,2026);assert.equal(c.deadlines.length,8);assert.equal(c.code,'PSY 201');assert.equal(c.instructor,'Dr. Maya Chen');assert.equal(c.grading.reduce((a,g)=>a+g.weight,0),100);assert.equal(c.policies.length,4);
 const final=c.deadlines.find(d=>d.title==='Final project');assert.equal(final.date,'2026-12-04');assert.equal(final.time,'11:59 PM');assert.ok(sampleSyllabus.includes(final.source));
});
test('date handling rejects impossible dates and preserves an explicit year',()=>{
 assert.deepEqual(parseDates('February 30, 2026 — Essay due',2026),[]);
 assert.equal(parseDates('Final exam 2027-01-14',2026)[0].date,'2027-01-14');
 assert.equal(parseDates('Quiz on 11/17',2026)[0].date,'2026-11-17');
 assert.equal(parseDates('February 29, 2028',2026)[0].date,'2028-02-29');
});
test('undated assignments and generic weekly patterns do not become invented deadlines',()=>{
 const c=basicOrganize('BIO 110\nHomework every Friday\nFinal project date TBD\nOffice hours: November 3, 2026\nCourse notes to follow.',2026);
 assert.equal(c.deadlines.length,0);assert.equal(c.summary,'');assert.ok(c.warnings.length);
});
test('demo courses satisfy the actual storage schema',()=>{
 for(const c of makeDemoCourses())assert.doesNotThrow(()=>courseSchema.parse(c));
 const c=makeDemoCourses()[0];assert.equal(courseSchema.safeParse({...c,deadlines:[{...c.deadlines[0],date:'2026-02-31'}]}).success,false);
});
test('calendar exports include date-only events, exclusive end dates and escaped text',()=>{
 const c=makeDemoCourses()[0];c.deadlines=[{...c.deadlines[0],date:'2026-12-31',title:'Essay, notes; final\nreview'}];const ics=calendarFile([c]);
 assert.match(ics,/DTSTART;VALUE=DATE:20261231/);assert.match(ics,/DTEND;VALUE=DATE:20270101/);assert.ok(ics.includes('Essay\\, notes\\; final\\nreview'));assert.match(ics,/BEGIN:VCALENDAR\r\n/);
 for(const line of ics.split('\r\n'))assert.ok(Buffer.byteLength(line)<=75);
});
test('Stripe signature verification rejects altered, expired and unsigned payments',()=>{
 const secret='test-webhook-secret',now=1700000000000,ts=Math.floor(now/1000),body=Buffer.from('{"type":"checkout.session.completed"}');
 const sig=createHmac('sha256',secret).update(ts+'.').update(body).digest('hex');
 assert.equal(verifyStripeSignature(body,`t=${ts},v1=${sig}`,secret,now),true);
 assert.equal(verifyStripeSignature(Buffer.from('{}'),`t=${ts},v1=${sig}`,secret,now),false);
 assert.equal(verifyStripeSignature(body,`t=${ts},v1=${sig}`,secret,now+301000),false);
 assert.equal(verifyStripeSignature(body,'v1=bad',secret,now),false);
});
test('session tokens are opaque, hashed and parsed exactly; mutation origins are strict',()=>{
 const t=token();assert.equal(cookieToken(`other=x; ss_session=${t}; another=y`),t);assert.equal(cookieToken('ss_session=bogus'),null);assert.notEqual(hashToken(t),t);assert.notEqual(token(),t);
 assert.equal(validOrigin('https://student.example','https://student.example'),true);assert.equal(validOrigin('https://student.example.evil.test','https://student.example'),false);assert.equal(validOrigin(undefined,'https://student.example'),false);
});
const request=async({path,method='GET',headers={},body})=>{let responseBody;const res={headers:{},setHeader(k,v){this.headers[k]=v;},end(b){responseBody=JSON.parse(b);}};await handler({url:'/api/'+path,query:{route:path},method,headers,body},res);return {status:res.statusCode,body:responseBody,headers:res.headers};};
test('API reports missing integrations without exposing secrets',async()=>{
 const r=await request({path:'config'});assert.equal(r.status,200);assert.deepEqual(r.body,{database:false,ai:false,payments:false});assert.equal(r.headers['Cache-Control'],'no-store');
});
test('API rejects cross-site signups and does not grant access from unsigned webhooks',async()=>{
 const old=process.env.APP_URL;process.env.APP_URL='https://app.example';
 try{const r=await request({path:'auth/signup',method:'POST',headers:{origin:'https://evil.example'},body:{}});assert.equal(r.status,403);const w=await request({path:'webhook',method:'POST',body:Buffer.from('{}')});assert.equal(w.status,503);}finally{if(old===undefined)delete process.env.APP_URL;else process.env.APP_URL=old;}
});
test('protected course API rejects anonymous reads',async()=>{const r=await request({path:'courses'});assert.equal(r.status,401);});
