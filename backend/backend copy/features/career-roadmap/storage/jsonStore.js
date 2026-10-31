const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const dataRoot = path.resolve(process.env.CAREER_ROADMAP_DATA_DIR || path.join(__dirname, '../data'));
const queues = new Map();
function encryptionKey(){const value=process.env.CAREER_DATA_ENCRYPTION_KEY;if(!value){if(process.env.NODE_ENV==='production')throw Error('CAREER_DATA_ENCRYPTION_KEY is required in production');return null;}const key=Buffer.from(value,'base64');if(key.length!==32)throw Error('CAREER_DATA_ENCRYPTION_KEY must be a base64-encoded 32-byte key');return key;}
function encodeState(state){const json=JSON.stringify({...state,updatedAt:new Date().toISOString()}),key=encryptionKey();if(!key)return json;const iv=crypto.randomBytes(12),cipher=crypto.createCipheriv('aes-256-gcm',key,iv),encrypted=Buffer.concat([cipher.update(json,'utf8'),cipher.final()]);return JSON.stringify({format:'career-state-v1',iv:iv.toString('base64'),tag:cipher.getAuthTag().toString('base64'),data:encrypted.toString('base64')});}
function decodeState(contents){const value=JSON.parse(contents);if(value?.format!=='career-state-v1')return value;const key=encryptionKey();if(!key)throw Error('Saved career data is encrypted; configure CAREER_DATA_ENCRYPTION_KEY to read it');const decipher=crypto.createDecipheriv('aes-256-gcm',key,Buffer.from(value.iv,'base64'));decipher.setAuthTag(Buffer.from(value.tag,'base64'));return JSON.parse(Buffer.concat([decipher.update(Buffer.from(value.data,'base64')),decipher.final()]).toString('utf8'));}
function safeId(value) { const id=String(value||'').trim(); if(!/^[A-Za-z0-9_-]{1,128}$/.test(id))throw Object.assign(new Error('Invalid user id'),{statusCode:400}); return id; }
function statePath(id) { return path.join(dataRoot,`${safeId(id)}.json`); }
async function readState(id) { try{return decodeState(await fs.readFile(statePath(id),'utf8'));}catch(e){if(e.code==='ENOENT')return{resume:null,analysis:null,roadmap:null,updatedAt:null};throw e;} }
async function writeState(id,state) { const target=statePath(id);await fs.mkdir(dataRoot,{recursive:true});const tmp=`${target}.${crypto.randomUUID()}.tmp`;await fs.writeFile(tmp,encodeState(state),{encoding:'utf8',mode:0o600});await fs.rename(tmp,target); }
async function updateState(id,change) { const key=safeId(id),prev=queues.get(key)||Promise.resolve();const next=prev.catch(()=>{}).then(async()=>{const s=await readState(key);const n=await change(s);await writeState(key,n);return n;});queues.set(key,next);try{return await next;}finally{if(queues.get(key)===next)queues.delete(key);} }
async function clearState(id) {const key=safeId(id),previous=queues.get(key)||Promise.resolve(),deletion=previous.catch(()=>{}).then(()=>fs.rm(statePath(key),{force:true}));queues.set(key,deletion);try{await deletion;}finally{if(queues.get(key)===deletion)queues.delete(key);}}
module.exports={readState,writeState,updateState,clearState,dataRoot};
