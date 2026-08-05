import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { searchUsers } from '@regieart/api';
import type { UserPublic } from '@regieart/types';
import p from '../../../shared/layout/page.module.scss';
import s from './TalentSearchPage.module.scss';

export function TalentSearchPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [city, setCity] = useState('');
  const [results, setResults] = useState<UserPublic[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  async function doSearch() {
    if (!query.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const res = await searchUsers({ q: query.trim(), city: city.trim() || undefined, limit: 20 });
      setResults(res.users);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={p.page}>
      <h1 className={p.pageTitle}>{t('talent_search.screen_title')}</h1>

      <div className={s.searchBar}>
        <input
          className={s.input}
          placeholder={t('talent_search.name_placeholder')}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && doSearch()}
        />
        <input
          className={s.input}
          placeholder={t('talent_search.city_placeholder')}
          value={city}
          onChange={(e) => setCity(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && doSearch()}
        />
        <button className={p.btnPrimary} onClick={doSearch}>{t('talent_search.search_btn')}</button>
      </div>

      {loading ? <div className={p.spinner} /> : (
        searched && results.length === 0 ? (
          <div className={p.empty}><div className={p.emptyTitle}>{t('common.no_results')}</div></div>
        ) : (
          <div className={s.grid}>
            {results.map((u) => (
              <div key={u.id} className={s.card} onClick={() => navigate(`/profile/${u.id}`)}>
                <div className={s.avatar}>{(u.displayName?.[0] ?? '?').toUpperCase()}</div>
                <div className={s.name}>{u.displayName}</div>
                {u.city && <div className={s.city}>{u.city}</div>}
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}