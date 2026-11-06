import { z } from 'zod';
const string=(max=500)=>z.string().max(max);
const isoDate=z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(s=>{const d=new Date(s+'T12:00:00Z');return !Number.isNaN(d.getTime())&&d.toISOString().slice(0,10)===s;},'Use a real calendar date.');
export const courseSchema=z.object({
  id:z.string().uuid(),title:string(200).min(1),code:string(30),semester:string(300),instructor:string(),email:string(),officeHours:string(),meeting:string(),summary:string(5000),
  grading:z.array(z.object({name:string(200),weight:z.number().min(0).max(100)})).max(40),
  policies:z.array(z.object({name:string(100),detail:string(5000)})).max(30),materials:z.array(string(2000)).max(40),
  deadlines:z.array(z.object({id:z.string().uuid(),title:string(200).min(1),date:isoDate,time:string(100),type:z.enum(['Assignment','Exam','Project']),completed:z.boolean(),source:string(2000)})).max(300),
  warnings:z.array(string(1000)).max(30),engine:z.enum(['basic','ai','sample']),source:string(40000),color:z.enum(['green','peach','purple','blue'])
});
export const aiSchema={type:'object',additionalProperties:false,properties:{
 title:{type:'string'},code:{type:'string'},semester:{type:'string'},instructor:{type:'string'},email:{type:'string'},officeHours:{type:'string'},meeting:{type:'string'},summary:{type:'string'},
 grading:{type:'array',items:{type:'object',additionalProperties:false,properties:{name:{type:'string'},weight:{type:'number'}},required:['name','weight']}},
 policies:{type:'array',items:{type:'object',additionalProperties:false,properties:{name:{type:'string'},detail:{type:'string'}},required:['name','detail']}},materials:{type:'array',items:{type:'string'}},
 deadlines:{type:'array',items:{type:'object',additionalProperties:false,properties:{title:{type:'string'},date:{type:'string'},time:{type:'string'},type:{type:'string',enum:['Assignment','Exam','Project']},source:{type:'string'}},required:['title','date','time','type','source']}},
 warnings:{type:'array',items:{type:'string'}}},required:['title','code','semester','instructor','email','officeHours','meeting','summary','grading','policies','materials','deadlines','warnings']};
