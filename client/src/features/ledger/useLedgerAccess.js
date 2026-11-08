import { useEffect,useRef,useState } from 'react';
import { call } from '../../shared/api.js';
import { ledgerStatus } from './api.js';
import { unlockNgo,staffCall } from '../ngo/api.js';

export function useLedgerAccess() {
  const [network,setNetwork]=useState(null), [problem,setProblem]=useState(''), [busy,setBusy]=useState(false);
  const [unlocked,setUnlocked]=useState(false);
  const token=useRef(''),expiry=useRef(0),alive=useRef(false);
  useEffect(()=>{
    alive.current=true;
    ledgerStatus().then(reply=>{if(alive.current)setNetwork(reply.ok?reply:{publicationMode:'unavailable'});});
    return ()=>{alive.current=false;token.current='';clearTimeout(expiry.current);};
  },[]);
  const lock=()=>{
    const previous=token.current; token.current='';setUnlocked(false);clearTimeout(expiry.current);
    if(previous)void staffCall('lock',previous,{});
  };
  const unlock=async pin=>{
    setBusy(true);setProblem('');
    const reply=await unlockNgo('admin',pin);
    if(!alive.current)return;
    setBusy(false);
    if(!reply.ok){setProblem(reply.message);return;}
    token.current=reply.token;setUnlocked(true);
    expiry.current=setTimeout(()=>{token.current='';setUnlocked(false);},Math.max(0,reply.expiresAt-Date.now()));
  };
  const request=async(path,body)=>{
    const reply=await call(`/api/ledger/${path}`,{method:'POST',headers:{'content-type':'application/json',
      ...(token.current?{authorization:`Bearer ${token.current}`}:{})},body:JSON.stringify(body??{})});
    if(alive.current && reply.status===401){token.current='';setUnlocked(false);}
    return reply;
  };
  const staff=network?.publicationMode==='staff';
  return {network,staff,problem,busy,unlocked,unlock,lock,request,
    canPublish:Boolean(network && network.publicationMode!=='unavailable' && (!staff||unlocked)),
    label:network?.network??(network?.chainId===84532?'Base Sepolia · test ETH':'Local test chain · fake ETH')};
}
