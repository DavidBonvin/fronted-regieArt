import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import type { AutocompleteResult, SupportedCountry } from '@regieart/types';
import { useAddressAutocomplete } from '../hooks/useAddressAutocomplete';

interface Props {
  value: string;
  onChange: (value: string) => void;
  onSelect: (result: AutocompleteResult) => void;
  country: SupportedCountry;
  placeholder?: string;
  label?: string;
}

export function AddressAutocompleteInput({
  value, onChange, onSelect, country, placeholder, label,
}: Props) {
  const { suggestions, search, isLoading, clear } = useAddressAutocomplete(country);
  const [open, setOpen] = useState(false);

  function handleChange(text: string) {
    onChange(text);
    search(text);
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
    <View style={styles.wrapper}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={handleChange}
          placeholder={placeholder ?? 'Escriba una dirección…'}
          placeholderTextColor="#5a5a5a"
          autoCorrect={false}
          autoCapitalize="none"
        />
        {isLoading && <ActivityIndicator size="small" color="#4a827e" style={styles.spinner} />}
      </View>

      {showDropdown && suggestions.length > 0 && (
        <View style={styles.dropdown}>
          <FlatList
            data={suggestions}
            keyExtractor={(_, i) => String(i)}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.dropdownItem} onPress={() => handleSelect(item)}>
                <Text style={styles.dropdownItemText}>📍 {item.label}</Text>
              </TouchableOpacity>
            )}
            scrollEnabled={false}
          />
        </View>
      )}

      {showDropdown && !isLoading && suggestions.length === 0 && (
        <View style={styles.dropdown}>
          <Text style={styles.emptyText}>Sin resultados</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: 6 },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#a0a0a0',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#3e3e3e',
    borderRadius: 8,
  },
  input: {
    flex: 1,
    color: '#f0f0f0',
    fontSize: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  spinner: {
    marginRight: 10,
  },
  dropdown: {
    backgroundColor: '#2a2a2a',
    borderWidth: 1,
    borderColor: '#3e3e3e',
    borderRadius: 8,
    overflow: 'hidden',
  },
  dropdownItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  dropdownItemText: {
    fontSize: 13,
    color: '#d0d0d0',
  },
  emptyText: {
    padding: 12,
    fontSize: 13,
    color: '#666',
    fontStyle: 'italic',
  },
});
