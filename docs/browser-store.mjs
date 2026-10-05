/* Internal IDB layout /2; exports retain the lossless browser-state/1 envelope. */
const fail = code => { throw Error(code); };
const LAYOUT = 'browser-store/2';
const STORES = ['records', 'history-events', 'history-items'];
const serial = value => JSON.stringify(value);
export async function checksum(state) {
  const bytes = new TextEncoder().encode(serial(state));
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(x => x.toString(16).padStart(2,'0')).join('');
}
const itemRows = state => Object.entries(state.items).map(([id,value]) => ({id,value}));
function profileFor(state, hash) {
  return {storage:LAYOUT, state:{...state,events:[],items:{}}, checksum:hash,
    eventCount:state.events.length, itemCount:Object.keys(state.items).length};
}
function materialize(profile, events, items, eventKeys, itemKeys) {
  const state = {...profile.state,events,items:Object.fromEntries(items.map(row => [row?.id,row?.value]))};
  const envelope = {state,checksum:profile.checksum};
  if (events.length !== profile.eventCount || items.length !== profile.itemCount ||
      eventKeys.some((key,i) => key !== i) || itemKeys.some((key,i) => key !== i) ||
      items.some(row => typeof row?.id !== 'string' || !row.value) ||
      Object.keys(state.items).length !== items.length || !profile.state ||
      !Array.isArray(profile.state.events) || profile.state.events.length ||
      !profile.state.items || Object.keys(profile.state.items).length) {
    // Preserve damaged storage for an explicit export/restore, never silently heal it.
    envelope.storage_damage = {profile,events,items,eventKeys,itemKeys};
  }
  return envelope;
}
// Queue requests inside IDB callbacks; do not await crypto while a transaction is active.
function capture(tx, done) {
  const request = tx.objectStore('records').get('profile');
  request.onsuccess = () => {
    const profile = request.result;
    if (profile?.storage !== LAYOUT) {done(profile,profile);return;}
    const results = [];let remaining=4;
    for (const [index,name,method] of [[0,'history-events','getAll'],[1,'history-items','getAll'],
      [2,'history-events','getAllKeys'],[3,'history-items','getAllKeys']]) {
      const rowRequest=tx.objectStore(name)[method]();
      rowRequest.onsuccess=()=>{
        results[index]=rowRequest.result;
        if (!--remaining) done(profile,materialize(profile,...results));
      };
    }
  };
}
const failureCode = (transaction,code) => transaction.error?.name === 'QuotaExceededError' ? 'browser_storage_full' : code;
export class BrowserStore {
  constructor(name, fresh, validate) { this.name = name; this.fresh = fresh; this.validate = validate; }
  async open() {
    if (this.db) return;
    if (this.opening) return this.opening;
    this.opening = new Promise((resolve,reject) => {
      let blocked=false;
      const request = indexedDB.open(this.name, 2);
      request.onupgradeneeded = () => {
        const db=request.result;
        if (!db.objectStoreNames.contains('records')) db.createObjectStore('records');
        if (!db.objectStoreNames.contains('history-events')) {
          const events=db.createObjectStore('history-events');
          events.createIndex('session','session_id');events.createIndex('item','item_id');
        }
        if (!db.objectStoreNames.contains('history-items')) {
          const items=db.createObjectStore('history-items');
          items.createIndex('topic','value.topic');items.createIndex('id','id',{unique:true});
        }
      };
      request.onsuccess = () => {
        if (blocked) {request.result.close();return;}
        this.db=request.result;
        this.db.onversionchange=()=>{this.db.close();this.db=null;this.snapshot=null;};
        resolve();
      };
      request.onerror=()=>reject(Error('browser_storage_unavailable'));
      request.onblocked=()=>{blocked=true;reject(Error('browser_storage_blocked'));};
    });
    try {await this.opening;} finally {this.opening=null;}
  }
  remember(profile,envelope) {
    const split=profile?.storage===LAYOUT && !envelope?.storage_damage;
    this.snapshot={token:serial(profile),revision:envelope?.state?.revision ?? 0,
      split,events:split ? envelope.state.events.map(serial) : null,
      items:split ? itemRows(envelope.state).map(serial) : null};
  }
  async raw() {
    await this.open();
    return new Promise((resolve,reject) => {
      const tx=this.db.transaction(STORES,'readonly');let profile,envelope;
      capture(tx,(p,e)=>{profile=p;envelope=e;});
      tx.oncomplete=()=>{this.remember(profile,envelope);resolve(envelope);};
      tx.onabort=tx.onerror=()=>reject(Error('browser_storage_unavailable'));
    });
  }
  async read() {
    const envelope=await this.raw();
    if (!envelope) return this.fresh();
    if (envelope.storage_damage || !envelope.state || envelope.checksum !== await checksum(envelope.state)) fail('browser_record_corrupt');
    return await this.validate(envelope.state);
  }
  async recovery() {
    await this.open();
    return new Promise((resolve,reject) => {
      const tx=this.db.transaction('records','readonly'),request=tx.objectStore('records').get('before-restore');
      tx.oncomplete=()=>resolve(request.result);
      tx.onabort=tx.onerror=()=>reject(Error('browser_storage_unavailable'));
    });
  }
  async restore(input, expectedEnvelope) {
    const state=structuredClone(input),expected=serial(expectedEnvelope);
    await this.validate(state);
    const profile=profileFor(state,await checksum(state)),items=itemRows(state);
    await this.open();
    return new Promise((resolve,reject) => {
      const tx=this.db.transaction(STORES,'readwrite');let code='browser_save_failed';
      capture(tx,(current,envelope)=>{
        if (serial(envelope)!==expected) {code='relearning_revision_stale';tx.abort();return;}
        const revision=envelope?.state?.revision ?? 0;
        if (!Number.isSafeInteger(revision) || revision<0 || state.revision!==revision+1) {
          code='browser_record_corrupt';tx.abort();return;
        }
        try {
          const records=tx.objectStore('records');
          if (envelope!==undefined) records.put(envelope,'before-restore');
          // Replacement, backup and all rows share a single atomic transaction.
          tx.objectStore('history-events').clear();tx.objectStore('history-items').clear();
          state.events.forEach((event,i)=>tx.objectStore('history-events').put(event,i));
          items.forEach((item,i)=>tx.objectStore('history-items').put(item,i));
          records.put(profile,'profile');
        } catch(error) {code=error.name==='QuotaExceededError'?'browser_storage_full':'browser_save_failed';tx.abort();}
      });
      tx.oncomplete=()=>{this.remember(profile,{state,checksum:profile.checksum});resolve(state);};
      tx.onabort=tx.onerror=()=>{this.snapshot=null;reject(Error(failureCode(tx,code)));};
    });
  }
  async write(input, expectedRevision, clearRecovery = false) {
    // Isolate asynchronous validation/hash/diff from caller mutations.
    const state=structuredClone(input);
    await this.validate(state);
    if (!Number.isSafeInteger(expectedRevision) || expectedRevision<0 || state.revision!==expectedRevision+1)
      fail('relearning_revision_stale');
    const profile=profileFor(state,await checksum(state)),items=itemRows(state);
    await this.open();
    if (!this.snapshot || this.snapshot.revision!==expectedRevision) await this.raw();
    const baseline=this.snapshot;
    if (!baseline.split && baseline.token !== undefined && !clearRecovery) {
      const legacy=JSON.parse(baseline.token);
      if (!legacy.state || legacy.checksum !== await checksum(legacy.state)) fail('browser_record_corrupt');
      // Only a verified current-contract record may migrate during a normal write.
      // Old contracts require prepareRecord + explicit restore; erase is explicit too.
      await this.validate(legacy.state);
    }
    const events=state.events.map(serial),itemValues=items.map(serial);
    return new Promise((resolve,reject) => {
      const tx=this.db.transaction(STORES,'readwrite');
      const records=tx.objectStore('records'),request=records.get('profile');let code='browser_save_failed';
      request.onsuccess=()=>{
        const current=request.result;
        if ((current?.state?.revision ?? 0)!==expectedRevision || serial(current)!==baseline.token) {
          code='relearning_revision_stale';tx.abort();return;
        }
        try {
          const eventStore=tx.objectStore('history-events'),itemStore=tx.objectStore('history-items');
          const replace=!baseline.split || clearRecovery;
          if (replace) {eventStore.clear();itemStore.clear();}
          // Numeric keys preserve authored order and allow deletion of a replaced tail.
          if (!replace) {
            if (events.length<baseline.events.length) eventStore.delete(IDBKeyRange.lowerBound(events.length));
            if (items.length<baseline.items.length) itemStore.delete(IDBKeyRange.lowerBound(items.length));
          }
          events.forEach((value,i)=>{if(replace || value!==baseline.events[i])eventStore.put(state.events[i],i);});
          itemValues.forEach((value,i)=>{if(replace || value!==baseline.items[i])itemStore.put(items[i],i);});
          records.put(profile,'profile');
          if (clearRecovery) records.delete('before-restore');
        } catch(error) {code=error.name==='QuotaExceededError'?'browser_storage_full':'browser_save_failed';tx.abort();}
      };
      tx.oncomplete=()=>{
        this.snapshot={token:serial(profile),revision:state.revision,split:true,events,items:itemValues};
        resolve(state);
      };
      tx.onabort=tx.onerror=()=>{this.snapshot=null;reject(Error(failureCode(tx,code)));};
    });
  }
}
