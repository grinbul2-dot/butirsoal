import {LABELS,CATEGORIES,BARRETT,BLOOM} from './rubrics.mjs';
const str = {type:'string'};
const obj = (properties,required=Object.keys(properties)) => ({type:'object',properties,required,additionalProperties:false});
const arr = items => ({type:'array',items});
const keySchema = obj({status:{type:'string',enum:['Ditentukan','Ambigu','Informasi tidak cukup','Contoh jawaban']},answer:str,explanation:str});
export const schema = obj({
 categories:{...arr(obj({id:{type:'string',enum:CATEGORIES.map(c=>c[0])},score:{type:'integer',minimum:1,maximum:100},label:{type:'string',enum:LABELS},target:str,identified:str,analysis:str,evidence:str})),minItems:CATEGORIES.length,maxItems:CATEGORIES.length},
 answerKey:keySchema,
 overall:obj({label:{type:'string',enum:LABELS},reason:str}),
 grammar:obj({summary:str,notes:arr(obj({location:str,original:str,correction:str,explanation:str}))}),
 issues:arr(obj({category:{type:'string',enum:CATEGORIES.map(c=>c[0])},location:str,explanation:str,suggestion:str})),
 revision:obj({stimuli:{...arr(str),minItems:1,maxItems:2},question:str,rationale:str,answerKey:keySchema})
},['categories','overall','grammar','issues','answerKey']);
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
function checkKey(k){assert(k&&['Ditentukan','Ambigu','Informasi tidak cukup','Contoh jawaban'].includes(k.status)&&nonempty(k.answer)&&nonempty(k.explanation));}
export function validateOutput(x,input){
 checkKey(x?.answerKey);
 assert(x && Array.isArray(x.categories) && x.categories.length===CATEGORIES.length);
 const ids=CATEGORIES.map(c=>c[0]);
 assert(new Set(x.categories.map(c=>c.id)).size===CATEGORIES.length);
 for(const c of x.categories){assert(ids.includes(c.id)&&Number.isInteger(c.score)&&c.score>=1&&c.score<=100&&LABELS.includes(c.label));for(const k of ['target','identified','analysis','evidence'])assert(nonempty(c[k]));}
 assert(x.overall&&LABELS.includes(x.overall.label)&&nonempty(x.overall.reason));
 assert(x.grammar&&nonempty(x.grammar.summary)&&Array.isArray(x.grammar.notes));
 for(const n of x.grammar.notes)for(const k of ['location','original','correction','explanation'])assert(nonempty(n[k]));
 assert(Array.isArray(x.issues));
 for(const n of x.issues){assert(ids.includes(n.category));for(const k of ['location','explanation','suggestion'])assert(nonempty(n[k]));}
 if(x.overall.label==='Sangat Sesuai')delete x.revision;
 else{const r=x.revision;assert(r&&Array.isArray(r.stimuli)&&r.stimuli.length===input.stimuli.length&&r.stimuli.every(s=>nonempty(s))&&nonempty(r.question)&&nonempty(r.rationale));checkKey(r.answerKey);}
 x.categories.sort((a,b)=>ids.indexOf(a.id)-ids.indexOf(b.id));
 x.overall.score=x.categories.reduce((s,c)=>s+c.score,0)/CATEGORIES.length;
 return x;
}
