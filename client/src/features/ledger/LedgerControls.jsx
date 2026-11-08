import React,{useId,useState} from 'react';
import { useLanguage } from '../language/language.jsx';
import { ledgerPublication } from '../../content/ledger-publication.js';

export function LedgerAccess({access}) {
  const {language,t}=useLanguage(), text=ledgerPublication[language];
  const [pin,setPin]=useState(''), id=useId();
  if(!access.network)return <p role="status">{text.checking}</p>;
  if(access.network.publicationMode==='unavailable')return <p role="status">{text.unavailable}</p>;
  if(!access.staff)return null;
  if(access.unlocked)return <div className="stack"><p>{text.unlocked}</p><button className="btn btn-sm btn-white" onClick={access.lock}>{text.lock}</button></div>;
  return <form className="stack" onSubmit={event=>{event.preventDefault();const entered=pin;setPin('');void access.unlock(entered);}}>
    <p>{text.staff}</p>
    <label className="field" htmlFor={id}>{text.pin}<input id={id} type="password" autoComplete="off" maxLength={64} value={pin} onChange={e=>setPin(e.target.value)} required disabled={access.busy}/></label>
    <button className="btn btn-sm btn-white" type="submit" disabled={access.busy||!pin}>{text.unlock}</button>
    {access.problem&&<p role="alert">{t(access.problem)}</p>}
  </form>;
}
export function PublicationProgress({job,access,onResume,busy}) {
  const {language}=useLanguage(), text=ledgerPublication[language];
  if(!job||job.state==='confirmed')return null;
  return <div className="stack" role="status">
    <p>{job.state==='blocked'?text.blocked:text.waiting}</p>
    <p>{text.code}: <span className="mono" style={{overflowWrap:'anywhere'}}>{job.id}</span></p>
    {job.state!=='blocked'&&<button className="btn btn-sm btn-white" onClick={onResume} disabled={busy||!access.canPublish}>{text.check}</button>}
  </div>;
}
