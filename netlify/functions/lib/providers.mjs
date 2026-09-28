// Only the transport differs. Prompts and semantic validation stay shared.
export function groqSchema(schema){
 const copy=structuredClone(schema);
 const visit=node=>{
  // Keep the portable strict-schema subset; our validator enforces bounds/counts.
  for(const name of ['minimum','maximum','minItems','maxItems'])delete node[name];
  if(node.type==='object'){
   node.required=Object.keys(node.properties||{});node.additionalProperties=false;
   for(const value of Object.values(node.properties||{}))visit(value);
  }
  if(node.items)visit(node.items);
 };
 visit(copy);return copy;
}
export function providerRequest(provider,model,key,body){
 if(provider==='gemini')return {url:`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,headers:{'Content-Type':'application/json','x-goog-api-key':key},body};
 if(body.contents?.some(c=>c.parts?.some(p=>p.inlineData)))throw new Error('TEXT_PROVIDER_RECEIVED_IMAGE');
 return {
  url:'https://api.groq.com/openai/v1/chat/completions',
  headers:{'Content-Type':'application/json',Authorization:`Bearer ${key}`},
  body:{model,stream:false,messages:[
   {role:'system',content:body.systemInstruction.parts.map(p=>p.text).join('\n')},
   ...body.contents.map(c=>({role:c.role==='model'?'assistant':'user',content:c.parts.map(p=>p.text).join('\n')}))
  ],max_completion_tokens:body.generationConfig.maxOutputTokens,
  response_format:{type:'json_schema',json_schema:{name:'question_review',strict:true,schema:groqSchema(body.generationConfig.responseJsonSchema)}}}
 };
}
export function providerResponse(provider,data){
 if(provider==='gemini')return data;
 const choice=data.choices?.[0];
 return {candidates:[{
  finishReason:choice?.message?.refusal||choice?.finish_reason==='content_filter'?'SAFETY':choice?.finish_reason==='length'?'MAX_TOKENS':choice?.finish_reason==='stop'?'STOP':'INCOMPLETE',
  content:{parts:[{text:choice?.message?.content}]}
 }]};
}
