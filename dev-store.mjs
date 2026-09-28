// Local preview and deterministic tests only. Production uses Netlify Blobs.
export function memoryStore(){
 const records=new Map();let version=0;
 return {
  async get(key){return structuredClone(records.get(key)?.data??null);},
  async getWithMetadata(key){return structuredClone(records.get(key)??null);},
  async setJSON(key,data,options={}){
   const previous=records.get(key);
   if(options.onlyIfNew&&previous||options.onlyIfMatch&&previous?.etag!==options.onlyIfMatch)return {modified:false};
   const etag=String(++version);records.set(key,{data:structuredClone(data),etag});return {modified:true,etag};
  },
  async delete(key){records.delete(key);},
  async *list(){yield {blobs:[...records.keys()].map(key=>({key}))};}
 };
}
