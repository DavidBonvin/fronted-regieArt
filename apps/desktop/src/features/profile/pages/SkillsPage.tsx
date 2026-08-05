import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getMySkills, addSkill, removeSkill, listSkillCategories } from '@regieart/api';
import type { UserSkill, SkillCategory } from '@regieart/types';
import p from '../../../shared/layout/page.module.scss';
import s from './SkillsPage.module.scss';

const LEVELS = ['BEGINNER','INTERMEDIATE','ADVANCED','EXPERT'] as const;

export function SkillsPage() {
  const { t } = useTranslation();
  const [skills, setSkills] = useState<UserSkill[]>([]);
  const [categories, setCategories] = useState<SkillCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [selCat, setSelCat] = useState('');
  const [selLevel, setSelLevel] = useState<typeof LEVELS[number]>('INTERMEDIATE');

  useEffect(() => {
    Promise.all([getMySkills(), listSkillCategories()])
      .then(([sk, cats]) => { setSkills(sk); setCategories(cats); })
      .finally(() => setLoading(false));
  }, []);

  async function handleAdd() {
    if (!selCat) return;
    setAdding(true);
    try {
      const sk = await addSkill({ categoryId: selCat, level: selLevel } as any);
      setSkills((prev) => [...prev, sk]);
    } finally { setAdding(false); }
  }

  async function handleRemove(id: string) {
    await removeSkill(id);
    setSkills((prev) => prev.filter((sk) => sk.id !== id));
  }

  const LEVEL_COLOR: Record<string,string> = { BEGINNER:'var(--status-pending)', INTERMEDIATE:'var(--action-brand)', ADVANCED:'#649DAB', EXPERT:'#C084FC' };

  return (
    <div className={p.page}>
      <h1 className={p.pageTitle}>{t('skills.screen_title')}</h1>

      {loading ? <div className={p.spinner} /> : (
        <>
          <div className={s.addRow}>
            <select className={s.select} value={selCat} onChange={(e) => setSelCat(e.target.value)}>
              <option value="">{t('skills.pick_category')}</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select className={s.select} value={selLevel} onChange={(e) => setSelLevel(e.target.value as any)}>
              {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
            <button className={p.btnPrimary} onClick={handleAdd} disabled={adding || !selCat}>{t('skills.add_btn')}</button>
          </div>

          <div className={s.list}>
            {skills.map((sk) => (
              <div key={sk.id} className={s.chip}>
              <span style={{ fontWeight:700, color: LEVEL_COLOR[sk.expertiseLevel] ?? 'var(--text-body)' }}>{sk.skillCategory?.name ?? ''}</span>
              <span className={s.level}>{sk.expertiseLevel}</span>
                <button className={s.remove} onClick={() => handleRemove(sk.id)}>×</button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}