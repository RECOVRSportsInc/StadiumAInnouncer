'use strict';
// Browser-local audio library. No uploads, accounts, external APIs, or tracking.
window.StadiumMedia=(()=>{
 let database;const decoded=new Map();
 function open(){if(!database)database=new Promise((resolve,reject)=>{if(!window.indexedDB){reject(Error('Audio storage is unavailable in this browser.'));return;}const r=indexedDB.open('stadiumainnouncer-audio',1);r.onupgradeneeded=()=>r.result.createObjectStore('tracks',{keyPath:'id'});r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);r.onblocked=()=>reject(Error('Close other StadiumAInnouncer tabs and retry.'));});return database;}
 async function request(mode,action){const db=await open();return new Promise((resolve,reject)=>{const tx=db.transaction('tracks',mode);let value;const r=action(tx.objectStore('tracks'));r.onsuccess=()=>value=r.result;r.onerror=()=>reject(r.error);tx.oncomplete=()=>resolve(value);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||Error('Audio storage was cancelled.'));});}
 function revision(){try{return localStorage.getItem('stadium.audio.revision')||'0';}catch(e){return '0';}}
 function changed(){try{localStorage.setItem('stadium.audio.revision',Date.now()+'-'+crypto.randomUUID());}catch(e){}}
 async function list(){return (await request('readonly',s=>s.getAll())).sort((a,b)=>a.name.localeCompare(b.name));}
 async function add(file,kind){if(file.size>50*1024*1024)throw Error(file.name+': maximum size is 50 MB.');if(!/\.(mp3|wav|m4a|aac|ogg|flac)$/i.test(file.name))throw Error('Choose an MP3, WAV, M4A, AAC, OGG, or FLAC file.');const track={id:crypto.randomUUID(),name:file.name.replace(/\.[^.]+$/,''),kind:kind==='effect'?'effect':'music',blob:file,created:Date.now()};await request('readwrite',s=>s.put(track));changed();return track;}
 async function remove(id){await request('readwrite',s=>s.delete(id));decoded.delete(id);changed();}
 async function samples(id){if(decoded.has(id))return decoded.get(id);const track=await request('readonly',s=>s.get(id));if(!track)throw Error('An assigned music file is missing. Reassign it in the roster.');const Decoder=window.OfflineAudioContext||window.webkitOfflineAudioContext;if(!Decoder)throw Error('Walk-up music decoding is unavailable in this browser.');const ctx=new Decoder(1,1,48000);let buffer;try{buffer=await ctx.decodeAudioData(await track.blob.arrayBuffer());}catch(e){throw Error('Could not decode '+track.name+'. Try an MP3 or PCM WAV file.');}
 // Walk-ups use the opening of each file. Keep at most four 30-second excerpts.
 const out=new Float32Array(Math.min(buffer.length,48000*30));for(let c=0;c<buffer.numberOfChannels;c++){const data=buffer.getChannelData(c);for(let i=0;i<out.length;i++)out[i]+=data[i]/buffer.numberOfChannels;}if(!out.length)throw Error('Music file is empty.');decoded.set(id,out);while(decoded.size>4)decoded.delete(decoded.keys().next().value);return out;}
 async function mix(result,plan,starts){if(!plan.enabled||!plan.ids.some(Boolean))return;const v=new DataView(result.bytes),total=(result.bytes.byteLength-44)/2;
 for(let p=0;p<plan.ids.length;p++){if(!plan.ids[p])continue;const song=await samples(plan.ids[p]);const begin=Math.round(starts[p]*48000),end=p+1<starts.length?Math.round(starts[p+1]*48000):total;for(let i=begin;i<end;i++){const local=i-begin,fade=Math.min(1,local/3840,(end-i-1)/3840),voice=v.getInt16(44+i*2,true)/32768,music=song[local%song.length]*plan.volume*Math.max(0,fade);const value=Math.max(-1,Math.min(1,voice*.90+music));v.setInt16(44+i*2,Math.round(value*(value<0?32768:32767)),true);}}
 }
 return {list,add,remove,revision,mix};
})();
