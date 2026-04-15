// src/db/operations/biometric.ts
// CRUD операции для настроек биометрии

import { getSetting, setSetting } from './settings';
import { db } from '../db';

export interface BiometricSettings {
  enabled: boolean;
  credentialId: string | null;
  lastActive: number | null;
}

export async function getBiometricSettings(): Promise<BiometricSettings> {
  const [enabled, credentialId, lastActive] = await Promise.all([
    getSetting<boolean>('biometric_enabled'),
    getSetting<string>('biometric_credential_id'),
    getSetting<number>('biometric_last_active'),
  ]);
  return {
    enabled: enabled ?? false,
    credentialId: credentialId ?? null,
    lastActive: lastActive ?? null,
  };
}

type BiometricSettingKey =
  | 'biometric_enabled'
  | 'biometric_credential_id'
  | 'biometric_last_active';

export async function setBiometricSetting<T>(key: BiometricSettingKey, value: T): Promise<void> {
  await setSetting(key, value);
}

export async function clearBiometricSettings(): Promise<void> {
  await Promise.all([
    db.settings.delete('biometric_enabled'),
    db.settings.delete('biometric_credential_id'),
    db.settings.delete('biometric_last_active'),
  ]);
}
