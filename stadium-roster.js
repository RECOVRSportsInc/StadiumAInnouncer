'use strict';
(()=>{
 let music=[];
 const roster=$('roster'),table=roster.closest('table'),host=node('div',undefined,'manager-roster');table.replaceWith(host);
 const panel=node('section',undefined,'panel lineup-manager');host.parentElement.before(panel);
 const commit=()=>{save();render();};
 function button(label,fn){const b=node('button',label);b.type='button';b.disabled=busy;b.onclick=fn;return b;}
 function select(items,value,fn){const s=node('select');for(const [v,t]of items){const o=node('option',t);o.value=v;s.append(o);}s.value=value;s.disabled=busy;s.onchange=()=>fn(s.value);return s;}
 function resolve(v){return state.players.find(p=>String(p.id)===v)?.id??null;}
 function assign(id,i){if(busy)return;LineupModel.assign(state,id,i);commit();}
 function add(id){let i=state.slots.indexOf(null);if(i<0)i=state.slots.length;if(i>=30)return message('Maximum 30 batting slots.');assign(id,i);}
 function load(p){if(!p)return;state.slots=[...p.slots];state.team=p.team;for(const player of state.players)if(p.positions&&Object.hasOwn(p.positions,player.id))player.position=p.positions[player.id];state.current=state.slots.find(id=>id!==null);commit();}
 async function voice(file,done){try{if(!file)return;if(!/\.wav$/i.test(file.name))throw Error('Choose a PCM WAV file.');decodeWav(await file.arrayBuffer());const t=await StadiumMedia.add(file,'voice');done(t.id);commit();}catch(e){message(e.message);}}
 function upload(label,done){const l=node('label',label,'voice-upload'),f=node('input');f.type='file';f.accept='.wav';f.disabled=busy;f.onchange=()=>voice(f.files[0],done);l.append(f);return l;}
 function edit(player){
 const fresh=!player,p=player||{id:crypto.randomUUID(),name:'',number:'',position:''};
 const d=node('dialog',undefined,'player-dialog'),f=node('form');f.method='dialog';f.append(node('h2',fresh?'Add player':'Edit player'));
 const name=node('input');name.value=p.name;name.required=true;name.maxLength=100;
 const number=node('input');number.value=p.number;number.inputMode='numeric';number.pattern='[0-9]{0,2}';number.maxLength=2;
 const pos=node('select');fillPositions(pos,p.position);
 for(const [label,input]of [['Full name',name],['Jersey number (optional)',number],['Position',pos]]){const l=node('label',label);l.append(input);f.append(l);}
 f.append(node('p','A renamed player needs their own name WAV. Upload it from their roster card.'));
 const submit=button('Save player',()=>{});submit.type='submit';f.append(submit,button('Cancel',()=>d.close()));
 f.onsubmit=e=>{e.preventDefault();const value=name.value.trim();if(!value||/[\\/]/.test(value)){name.setCustomValidity('Enter a name without slashes.');name.reportValidity();return;}if(p.name!==value)delete p.nameAudioId;p.name=value;p.number=number.value;p.position=pos.value;if(fresh)state.players.push(p);d.close();commit();};name.oninput=()=>name.setCustomValidity('');
 d.append(f);document.body.append(d);d.onclose=()=>d.remove();d.showModal();
 }
 function draggable(el,id){const handle=button('↕ Drag',()=>{});handle.className='drag-handle';handle.setAttribute('aria-label','Drag '+state.players.find(p=>p.id===id)?.name);el.prepend(handle);
 handle.onpointerdown=e=>{if(busy)return;e.preventDefault();handle.setPointerCapture(e.pointerId);let target=null;const move=ev=>{document.querySelectorAll('.drop-target').forEach(x=>x.classList.remove('drop-target'));target=document.elementFromPoint(ev.clientX,ev.clientY)?.closest('[data-slot]');if(target)target.classList.add('drop-target');const rail=host.parentElement;if(ev.clientY<100)window.scrollBy(0,-25);if(ev.clientY>innerHeight-100)window.scrollBy(0,25);if(rail.getBoundingClientRect().bottom-ev.clientY<60)rail.scrollTop+=20;};handle.onpointermove=move;handle.onpointerup=()=>{if(target)assign(id,Number(target.dataset.slot));cleanup();};handle.onpointercancel=cleanup;function cleanup(){document.querySelectorAll('.drop-target').forEach(x=>x.classList.remove('drop-target'));handle.onpointermove=null;handle.onpointerup=null;handle.onpointercancel=null;}};
 }
 function draw(){
 panel.replaceChildren(node('h2','Batting order'),node('p','Add players to the next open slot, choose a slot, or drag a player into place. Filled slots announce in order.'));
 const controls=node('div',undefined,'manager-controls');const title=node('input');title.placeholder='Lineup name, e.g. Friday vs Ottawa';title.setAttribute('aria-label','Saved lineup name');title.disabled=busy;
 const presets=state.presets.filter(p=>p.team===state.team);let chosen=presets.at(-1)?.id||'';
 controls.append(title,button('Save lineup',()=>{if(!lineup().length)return message('Choose your starters first.');const name=title.value.trim()||state.team+' '+new Date().toLocaleDateString();state.presets.push({id:crypto.randomUUID(),name,team:state.team,slots:[...state.slots],positions:Object.fromEntries(state.players.map(p=>[p.id,p.position]))});commit();}),select([['','Choose saved lineup'],...presets.map(p=>[p.id,p.name])],chosen,v=>chosen=v),button('Load saved',()=>load(state.presets.find(p=>p.id===chosen))),button('Reuse previous lineup',()=>load(presets.at(-1))),button('Delete saved',()=>{if(chosen&&confirm('Delete this saved lineup?')){state.presets=state.presets.filter(p=>p.id!==chosen);commit();}}));
 controls.append(button('New game / clear slots',()=>{if(lineup().length){state.presets.push({id:crypto.randomUUID(),name:'Previous game · '+new Date().toLocaleString(),team:state.team,slots:[...state.slots],positions:Object.fromEntries(state.players.map(p=>[p.id,p.position]))});}state.slots=Array(9).fill(null);commit();}));panel.append(controls);
 const first=node('label','Choose first batter');first.append(select([['','Move a player to the first spot'],...lineup().map(p=>[p.id,p.name])],'',v=>{const id=resolve(v);if(id!==null){LineupModel.rotate(state,id);commit();}}));panel.append(first);
 const slots=node('div',undefined,'batting-slots');state.slots.forEach((id,i)=>{const p=state.players.find(p=>p.id===id),row=node('div',undefined,'batting-slot');row.dataset.slot=i;row.append(node('strong',String(i+1).padStart(2,'0')));row.append(select([['','Empty slot'],...state.players.map(p=>[p.id,p.name])],id??'',v=>{const next=resolve(v);if(next===null){state.slots[i]=null;commit();}else assign(next,i);}));if(p){draggable(row,id);row.append(button('First',()=>{LineupModel.rotate(state,id);commit();}),button('Remove',()=>{state.slots[i]=null;commit();}));}slots.append(row);});panel.append(slots,button('Add batting slot',()=>{if(state.slots.length<30){state.slots.push(null);commit();}}),node('small','Lineups and uploaded audio are saved in this browser on this device.'));
 host.replaceChildren(button('+ Add player',()=>edit()));
 for(const p of state.players){const row=node('article',undefined,'roster-player');row.append(node('strong',p.name),node('small',(p.number?'#'+p.number+' · ':'')+(p.position||'Position not set')));draggable(row,p.id);const actions=node('div',undefined,'manager-controls');actions.append(button(state.slots.includes(p.id)?'In lineup':'Add to next slot',()=>{if(!state.slots.includes(p.id))add(p.id);}),button('Edit',()=>edit(p)),button('Delete',()=>{if(confirm('Delete '+p.name+' from the roster and saved lineups?')){LineupModel.remove(state,p.id);commit();}}));row.append(actions);const pos=select(Object.keys(positions).map(v=>[v,v||'Position not set']),p.position,v=>{p.position=v;commit();});pos.setAttribute('aria-label','Position for '+p.name);row.append(pos);const song=select([['','No walk-up music'],...music.map(t=>[t.id,t.name])],p.musicId||'',v=>{p.musicId=v;commit();});song.setAttribute('aria-label','Music for '+p.name);row.append(song,upload(p.nameAudioId?'Replace uploaded name WAV':'Upload name WAV',id=>p.nameAudioId=id));host.append(row);}
 if(IS_STARTING_LINEUP){const details=node('details',undefined,'intro-clips');details.append(node('summary','Starting-lineup voice clips'));details.append(node('p','Upload “Leading Off.wav”, “Batting Second.wav” through “Batting Ninth.wav”. Each introduction plays order, position, then name. Extra batting slots need their matching phrase.'));details.append(select([['order','Order, position, name'],['names','Position and name only']],state.introStyle||'order',v=>{state.introStyle=v;commit();}));for(let i=0;i<Math.max(9,lineup().length);i++){const phrase=LineupModel.phrase(i);details.append(upload(phrase+'.wav'+(state.orderClips[phrase]?' · uploaded':''),id=>state.orderClips[phrase]=id));}panel.append(details);}
 if($('walkupVolume')){$('walkupVolume').value=String(Math.round(state.walkupVolume*100));$('walkupVolume').disabled=busy;$('walkupLevel').textContent=Math.round(state.walkupVolume*100)+'%';$('musicLibraryStatus').textContent=music.length+' music tracks in this browser. Add tracks in Soundboard.';}
 if($('walkupEnabled')){$('walkupEnabled').checked=state.walkupEnabled;$('walkupEnabled').disabled=busy;}
 }
 window.RosterUI={render:draw};
 $('all').hidden=true;$('none').hidden=true;
 if($('reorderStatus'))$('reorderStatus').textContent='Roster and batting order are separate. Use Add, a slot selector, or a drag handle.';
 for(const id of ['walkupEnabled','walkupVolume'])if($(id))$(id).onchange=()=>{state[id]=id==='walkupEnabled'?$(id).checked:Number($(id).value)/100;commit();};
 save();render();StadiumMedia.list().then(list=>{music=list.filter(t=>t.kind==='music');draw();}).catch(e=>message(e.message));
})();
