import {LABELS,CATEGORIES,BARRETT,BLOOM,CRITERIA,scoreLabel} from './rubrics.mjs';
const str = {type:'string'};
const obj = (properties,required=Object.keys(properties)) => ({type:'object',properties,required,additionalProperties:false});
const arr = items => ({type:'array',items});
const keySchema = obj({status:{type:'string',enum:['Ditentukan','Ambigu','Informasi tidak cukup','Contoh jawaban']},answer:str,explanation:str,rows:arr(obj({statement:str,status:{type:'string',enum:['Ditentukan','Ambigu','Informasi tidak cukup']},answer:str,explanation:str,evidence:str}))});
export const schema = obj({
 categories:{...arr(obj({id:{type:'string',enum:CATEGORIES.map(c=>c[0])},criteria:{...arr(obj({index:{type:'integer',minimum:1,maximum:4},level:{type:'integer',minimum:0,maximum:4},reason:str,quote:str})),minItems:4,maxItems:4},target:str,identified:str,analysis:str,evidence:str})),minItems:CATEGORIES.length,maxItems:CATEGORIES.length},
 answerKey:keySchema,
 overall:obj({reason:str}),
 grammar:obj({summary:str,notes:arr(obj({location:str,original:str,correction:str,explanation:str}))}),
 issues:arr(obj({category:{type:'string',enum:CATEGORIES.map(c=>c[0])},location:str,explanation:str,suggestion:str})),
 revision:obj({stimuli:{...arr(str),minItems:1,maxItems:2},question:str,rationale:str,answerKey:keySchema})
});
export class InputError extends Error {}
function nonempty(x,max=40000){return typeof x==='string' && x.trim().length>0 && x.length<=max;}
export function validateInput(data){
 if(!data || typeof data!=='object' || Array.isArray(data)) throw new InputError('Data input tidak valid.');
 const b=data.blueprint;
 if(!b || typeof b!=='object') throw new InputError('Lengkapi kisi-kisi.');
 for(const id of ['type','genre','barrett','kisi','bloom','cefr']) if(!nonempty(b[id],id==='kisi'?12000:4000)) throw new InputError('Semua field kisi-kisi wajib diisi (maksimal 12.000 karakter untuk Kisi-kisi dan 4.000 untuk field lainnya).');
 if(!BARRETT.includes(b.barrett) || !BLOOM.includes(b.bloom) || !['A1','A2','B1','B2','C1','C2'].includes(b.cefr)) throw new InputError('Pilihan Barrett, Bloom, atau CEFR tidak valid.');
 if(data.grade!==null && data.grade!==undefined && (!Number.isInteger(data.grade)||data.grade<1||data.grade>12)) throw new InputError('Kelas harus 1–12.');
 if(!Array.isArray(data.stimuli)||data.stimuli.length<1||data.stimuli.length>2||!data.stimuli.every(s=>nonempty(s,20000))) throw new InputError('Isi 1 atau 2 teks stimulus, maksimal 20.000 karakter per teks.');
 if(!nonempty(data.question,12000)) throw new InputError('Isi pertanyaan beserta opsi/instruksi (maksimal 12.000 karakter).');
 return {blueprint:Object.fromEntries(['type','genre','barrett','kisi','bloom','cefr'].map(k=>[k,b[k].trim()])),grade:data.grade??null,stimuli:data.stimuli.map(s=>s.trim()),question:data.question.trim()};
}
function assert(ok){if(!ok)throw new Error('INVALID_MODEL_OUTPUT');}
const norm=s=>s.normalize('NFKC').replace(/\s+/g,' ').trim();
function checkKey(k,input){
 assert(k&&['Ditentukan','Ambigu','Informasi tidak cukup','Contoh jawaban'].includes(k.status)&&nonempty(k.answer)&&nonempty(k.explanation)&&Array.isArray(k.rows));
 const matrix=/kategori|category|categorical|true\s*\/\s*false|benar\s*\/\s*salah/i.test(input.blueprint.type);
 if(matrix)assert(k.rows.length>0);
 const seen=new Set();
 for(const row of k.rows){
  assert(nonempty(row.statement)&&nonempty(row.answer)&&nonempty(row.explanation)&&['Ditentukan','Ambigu','Informasi tidak cukup'].includes(row.status)&&typeof row.evidence==='string');
  assert(norm(input.question).includes(norm(row.statement))&&!seen.has(norm(row.statement)));seen.add(norm(row.statement));
  if(row.evidence)assert(input.stimuli.some(s=>norm(s).includes(norm(row.evidence))));
  if(row.status==='Ditentukan')assert(nonempty(row.evidence));
 }
 if(k.rows.some(r=>r.status==='Informasi tidak cukup'))k.status='Informasi tidak cukup';
 else if(k.rows.some(r=>r.status==='Ambigu'))k.status='Ambigu';
}
export function validateOutput(x,input){
 checkKey(x?.answerKey,input);
 assert(x && Array.isArray(x.categories) && x.categories.length===CATEGORIES.length);
 const ids=CATEGORIES.map(c=>c[0]);
 assert(new Set(x.categories.map(c=>c.id)).size===CATEGORIES.length);
 for(const c of x.categories){
  assert(ids.includes(c.id)&&Array.isArray(c.criteria)&&c.criteria.length===4);
  assert(new Set(c.criteria.map(r=>r.index)).size===4);
  const sources=[...input.stimuli,input.question,...Object.values(input.blueprint)];
  for(const r of c.criteria){
   assert(Number.isInteger(r.index)&&r.index>=1&&r.index<=4&&Number.isInteger(r.level)&&r.level>=0&&r.level<=4&&nonempty(r.reason)&&typeof r.quote==='string');
   if(r.level>0)assert(nonempty(r.quote));
   if(r.quote)assert(sources.some(s=>norm(s).includes(norm(r.quote))));
   r.criterion=CRITERIA[c.id][r.index-1];
  }
  c.criteria.sort((a,b)=>a.index-b.index);
  c.score=Math.max(1,Math.round(c.criteria.reduce((n,r)=>n+r.level,0)/16*100));c.label=scoreLabel(c.score);
  for(const k of ['target','identified','analysis','evidence'])assert(nonempty(c[k]));
 }
 assert(x.overall&&nonempty(x.overall.reason));
 assert(x.grammar&&nonempty(x.grammar.summary)&&Array.isArray(x.grammar.notes));
 for(const n of x.grammar.notes)for(const k of ['location','original','correction','explanation'])assert(nonempty(n[k]));
 assert(Array.isArray(x.issues));
 for(const n of x.issues){assert(ids.includes(n.category));for(const k of ['location','explanation','suggestion'])assert(nonempty(n[k]));}
 x.overall.score=x.categories.reduce((s,c)=>s+c.score,0)/CATEGORIES.length;
 x.overall.label=scoreLabel(x.overall.score);
 x.overall.rules=[];
 const limit=(label,reason)=>{if(LABELS.indexOf(x.overall.label)<LABELS.indexOf(label))x.overall.label=label;x.overall.rules.push(reason);};
 if(x.categories.some(c=>c.score<75)||x.issues.length||x.grammar.notes.length)limit('Sesuai','Label Sangat Sesuai memerlukan semua kategori minimal 75 dan tidak ada temuan material atau kesalahan grammar.');
 if(x.categories.some(c=>c.score<50))limit('Kurang Sesuai','Ada kategori di bawah 50 yang memerlukan perbaikan mendasar.');
 if(['Ambigu','Informasi tidak cukup'].includes(x.answerKey.status))limit('Kurang Sesuai','Kunci belum dapat dipastikan; periksa bukti dan kejelasan soal sebelum digunakan.');
 if(x.overall.label==='Sangat Sesuai')delete x.revision;
 else{const r=x.revision;assert(r&&Array.isArray(r.stimuli)&&r.stimuli.length===input.stimuli.length&&r.stimuli.every(s=>nonempty(s))&&nonempty(r.question)&&nonempty(r.rationale));checkKey(r.answerKey,{...input,stimuli:r.stimuli,question:r.question});}
 x.categories.sort((a,b)=>ids.indexOf(a.id)-ids.indexOf(b.id));
 x.overall.score=x.categories.reduce((s,c)=>s+c.score,0)/CATEGORIES.length;
 return x;
}
