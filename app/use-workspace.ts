'use client';
import {useState,useRef,useEffect,useCallback} from 'react';
import {emptyState,type State} from './domain';
import {toast} from 'sonner';
type Envelope={state:State;revision:number;actor:{id:string;name:string;email:string;role:string};result?:Record<string,string|number|boolean>};
export function useWorkspace(){
 const [data,setData]=useState<State>(emptyState);const [loading,setLoading]=useState(true);const [error,setError]=useState('');const [busy,setBusy]=useState(false);const [updatedAt,setUpdatedAt]=useState('');
 const revision=useRef(-1);const running=useRef(false);const editLock=useRef(false);const attempts=useRef(new Map<string,string>());
 const accept=useCallback((v:Envelope)=>{if(v.revision>=revision.current){revision.current=v.revision;setData(v.state);setUpdatedAt(new Date().toISOString());setError('');setLoading(false)}},[]);
 const refresh=useCallback(async(quiet=false,force=false)=>{if(running.current||editLock.current&&!force)return;try{const r=await fetch('/api/workspace',{cache:'no-store'});const v=await r.json() as Envelope&{error?:string};if(r.status===403){window.location.assign('/portal');return}if(!r.ok)throw Error(v.error||'Não foi possível carregar os dados.');if(!editLock.current||force)accept(v)}catch(e){if(!quiet)setError((e as Error).message);setLoading(false)}},[accept]);
 useEffect(()=>{void refresh();const focus=()=>{if(document.visibilityState==='visible')void refresh(true)};document.addEventListener('visibilitychange',focus);const timer=setInterval(focus,30000);return()=>{document.removeEventListener('visibilitychange',focus);clearInterval(timer)}},[refresh]);
 const mutate=useCallback(async(command:Record<string,unknown>):Promise<Envelope|null>=>{
  if(running.current){toast.info('Aguarde a operação atual terminar.');return null}if(revision.current<0){toast.error('Carregue os dados antes de continuar.');return null}
  const key=JSON.stringify(command);let requestId=attempts.current.get(key);if(!requestId){requestId=crypto.randomUUID();attempts.current.set(key,requestId)}running.current=true;setBusy(true);
  try{const r=await fetch('/api/workspace',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:requestId,revision:revision.current,command})});const v=await r.json() as Envelope&{error?:string};if(!r.ok){if(r.status===409){attempts.current.delete(key);running.current=false;await refresh(true,true)}if(r.status>=400&&r.status<500)attempts.current.delete(key);throw Error(v.error||'Não foi possível confirmar a gravação. Tente novamente.')};accept(v);attempts.current.delete(key);return v}catch(e){toast.error((e as Error).message,{duration:6500});return null}finally{running.current=false;setBusy(false)}
 },[accept,refresh]);
 return {data,loading,error,busy,updatedAt,refresh,mutate,editLock};
}
