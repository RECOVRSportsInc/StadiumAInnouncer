/* Shared roster and batting-order model. No external dependencies. */
window.LineupModel={
 normalize(s){
 const legacy=s.schemaVersion!==3;
 s.players=(s.players||[]).filter(p=>p&&p.name&&(!legacy||p.name!=='Mont Phelps'));
 const fixes={'Justin Vaillanourt':'Justin Vaillancourt','Matthew Mckay':'Matthew McKay','Gabriel Mfucci':'Gabriel Maffucci-Fitanides','Gabriel Vaillanourt':'Gabriel Vaillancourt'};
 if(legacy)for(const p of s.players){p.name=fixes[p.name]||p.name;if(p.name==='Jackson Cohen'){p.name='Michael Zampardi';p.number='';p.position='';delete p.nameAudioId;delete p.musicId;}}
 const ids=new Set(s.players.map(p=>p.id));
 const clean=a=>{const used=new Set();return (a||[]).map(id=>{if(id===null||!ids.has(id)||used.has(id))return null;used.add(id);return id;});};
 s.slots=clean(Array.isArray(s.slots)?s.slots:s.players.filter(p=>p.active).map(p=>p.id));while(s.slots.length<9)s.slots.push(null);
 s.presets=(s.presets||[]).map(p=>({...p,slots:clean(p.slots)}));s.orderClips=s.orderClips||{};s.schemaVersion=3;return s;
 },
 assign(s,id,slot){const old=s.slots.indexOf(id);if(old===slot)return;if(old>=0)s.slots[old]=s.slots[slot]??null;s.slots[slot]=id;},
 rotate(s,id){const ids=s.slots.filter(x=>x!==null),i=ids.indexOf(id);if(i<0)return;s.slots=ids.slice(i).concat(ids.slice(0,i));while(s.slots.length<9)s.slots.push(null);s.current=id;},
 remove(s,id){s.players=s.players.filter(p=>p.id!==id);s.slots=s.slots.map(x=>x===id?null:x);for(const p of s.presets)p.slots=p.slots.map(x=>x===id?null:x);},
 phrase(i){return ['Leading Off','Batting Second','Batting Third','Batting Fourth','Batting Fifth','Batting Sixth','Batting Seventh','Batting Eighth','Batting Ninth','Batting Tenth','Batting Eleventh','Batting Twelfth','Batting Thirteenth','Batting Fourteenth','Batting Fifteenth','Batting Sixteenth','Batting Seventeenth','Batting Eighteenth','Batting Nineteenth','Batting Twentieth','Batting Twenty First','Batting Twenty Second','Batting Twenty Third','Batting Twenty Fourth','Batting Twenty Fifth','Batting Twenty Sixth','Batting Twenty Seventh','Batting Twenty Eighth','Batting Twenty Ninth','Batting Thirtieth'][i];}
};
