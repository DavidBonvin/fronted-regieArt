import React, { useState, useRef, useEffect } from 'react';
import type { AutocompleteResult, SupportedCountry } from '@regieart/types';
import { useAddressAutocomplete } from '../hooks/useAddressAutocomplete';
import s from './AddressAutocompleteInput.module.scss';

interface Props {
  value: string;
  onChange: (value: string) => void;
  onSelect: (result: AutocompleteResult) => void;
  country: SupportedCountry;
  placeholder?: string;
  label?: string;
  required?: boolean;
  className?: string;
}

export function AddressAutocompleteInput({
  value, onChange, onSelect, country, placeholder, label, required, className,
}: Props) {
  const { suggestions, search, isLoading, clear } = useAddressAutocomplete(country);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value;
    onChange(v);
    search(v);
    setOpen(true);
  }

  function handleSelect(result: AutocompleteResult) {
    onChange(result.label);
    onSelect(result);
    clear();
    setOpen(false);
  }

  const showDropdown = open && value.length >= 2;

  return (
    <div className={`${s.wrapper} ${className ?? ''}`} ref={wrapRef}>
      {label && (
        <label className={s.label}>
          {label}{required && <span className={s.required}> *</span>}
        </label>
      )}
      <div className={s.inputWrap}>
        <input
          className={s.input}
          value={value}
          onChange={handleChange}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          placeholder={placeholder ?? 'Escriba una dirección…'}
          autoComplete="off"
        />
        {isLoading && <span className={s.spinner} />}
      </div>
      {showDropdown && (
        <ul className={s.dropdown}>
          {suggestions.length > 0
            ? suggestions.map((result, i) => (
                <li
                  key={i}
                  className={s.dropdownItem}
                  onMouseDown={() => handleSelect(result)}
                >
                  📍 {result.label}
                </li>
              ))
            : !isLoading && (
                <li className={s.dropdownEmpty}>Sin resultados</li>
              )}
        </ul>
      )}
    </div>
  );
}
