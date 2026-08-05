import { describe, it, expect } from 'vitest';
import en from '../../../messages/en.json';
import es from '../../../messages/es.json';

function getKeypaths(obj: Record<string, any>, prefix = ''): string[] {
  let keys: string[] = [];
  for (const [key, value] of Object.entries(obj)) {
    const keypath = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      keys = keys.concat(getKeypaths(value, keypath));
    } else {
      keys.push(keypath);
    }
  }
  return keys.sort();
}

function getValueType(obj: Record<string, any>, keypath: string): string {
  const parts = keypath.split('.');
  let current: any = obj;
  for (const part of parts) {
    if (current == null) return 'undefined';
    current = current[part];
  }
  return Array.isArray(current) ? 'array' : typeof current;
}

function getInterpolationVariables(str: string): string[] {
  const matches = str.match(/\{([^}]+)\}/g) || [];
  return matches.sort();
}

describe('i18n Translation Schema Parity', () => {
  const enKeys = getKeypaths(en);
  const esKeys = getKeypaths(es);

  it('has exact structural key parity between en.json and es.json', () => {
    expect(esKeys).toEqual(enKeys);
  });

  it('ensures no missing keys in Spanish dictionary', () => {
    const missingInEs = enKeys.filter((k) => !esKeys.includes(k));
    expect(missingInEs).toEqual([]);
  });

  it('ensures no un-namespaced extra keys in Spanish dictionary', () => {
    const extraInEs = esKeys.filter(
      (k) => !enKeys.filter((e) => e === k).length,
    );
    expect(extraInEs).toEqual([]);
  });

  it('matches value types for every dictionary keypath', () => {
    for (const keypath of enKeys) {
      const enType = getValueType(en, keypath);
      const esType = getValueType(es, keypath);
      expect(esType).toBe(enType);
    }
  });

  it('matches interpolation placeholder variables across locales', () => {
    for (const keypath of enKeys) {
      const enVal = keypath.split('.').reduce((o: any, i) => o?.[i], en);
      const esVal = keypath.split('.').reduce((o: any, i) => o?.[i], es);

      if (typeof enVal === 'string' && typeof esVal === 'string') {
        const enVars = getInterpolationVariables(enVal);
        const esVars = getInterpolationVariables(esVal);
        expect(esVars).toEqual(enVars);
      }
    }
  });
});
