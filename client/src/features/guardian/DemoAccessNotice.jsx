// A visible explanation for judges, without putting any demo screen behind a PIN.
import React from 'react';
import { LockOpen } from 'lucide-react';
import { useLanguage } from '../language/language.jsx';
import { usePermission } from './permission.jsx';
import { demoAccess } from '../../content/demo-access.js';

export default function DemoAccessNotice() {
  const { language } = useLanguage();
  const { data } = usePermission();
  if (!data?.demoOpenAccess) return null;
  const text = demoAccess[language];
  return <aside className="container card demo-access-notice" role="note" aria-label={text.title}>
    <LockOpen size={24} aria-hidden="true" />
    <div><strong>{text.title}</strong><p>{text.text}</p></div>
  </aside>;
}
