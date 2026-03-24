// src/app/hooks/useBiometric.ts
// WebAuthn биометрический app-lock с таймаутом 5 минут

import { useState, useEffect, useRef, useCallback } from 'react';
import { getBiometricSettings, setBiometricSetting, clearBiometricSettings } from '../../db/operations/biometric';

const TIMEOUT_MS = 5 * 60 * 1000; // 5 минут
const CHECK_INTERVAL_MS = 60 * 1000; // проверка каждую минуту

export interface BiometricHook {
  isSupported: boolean;
  isEnabled: boolean;
  isLocked: boolean;
  enable: () => Promise<void>;
  disable: () => Promise<void>;
  unlock: () => Promise<void>;
}

function checkWebAuthnSupport(): boolean {
  return !!(
    typeof window !== 'undefined' &&
    window.PublicKeyCredential &&
    navigator.credentials &&
    typeof navigator.credentials.create === 'function' &&
    typeof navigator.credentials.get === 'function'
  );
}

function encodeCredentialId(rawId: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(rawId)));
}

function decodeCredentialId(encoded: string): ArrayBuffer {
  const binary = atob(encoded);
  const buffer = new ArrayBuffer(binary.length);
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return buffer;
}

export function useBiometric(userId: string, userName: string): BiometricHook {
  const [isSupported] = useState(checkWebAuthnSupport);
  const [isEnabled, setIsEnabled] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const lastActive = useRef<number>(Date.now());
  const initialized = useRef(false);

  // Загрузка настроек при монтировании
  useEffect(() => {
    if (!isSupported || initialized.current) return;
    initialized.current = true;

    getBiometricSettings().then((settings) => {
      if (!settings.enabled) return;
      setIsEnabled(true);
      if (settings.lastActive) {
        lastActive.current = settings.lastActive;
      }
      if (Date.now() - lastActive.current > TIMEOUT_MS) {
        setIsLocked(true);
      }
    });
  }, [isSupported]);

  // Слушатели активности и таймер блокировки
  useEffect(() => {
    if (!isEnabled) return;

    const updateActivity = () => {
      lastActive.current = Date.now();
    };

    const checkLock = () => {
      if (Date.now() - lastActive.current > TIMEOUT_MS) {
        setIsLocked(true);
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Записываем время ухода
        lastActive.current = Date.now();
      } else {
        // Возврат в приложение — проверяем таймаут
        checkLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('pointerdown', updateActivity);
    document.addEventListener('keydown', updateActivity);

    // Запасной таймер для случая, когда приложение открыто, но не используется
    const interval = setInterval(() => {
      if (!document.hidden) checkLock();
    }, CHECK_INTERVAL_MS);

    const handleBeforeUnload = () => {
      setBiometricSetting('biometric_last_active', lastActive.current);
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('pointerdown', updateActivity);
      document.removeEventListener('keydown', updateActivity);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      clearInterval(interval);
      setBiometricSetting('biometric_last_active', lastActive.current);
    };
  }, [isEnabled]);

  const enable = useCallback(async () => {
    const credential = (await navigator.credentials.create({
      publicKey: {
        challenge: crypto.getRandomValues(new Uint8Array(32)),
        rp: { name: 'Finly', id: window.location.hostname },
        user: {
          id: new TextEncoder().encode(String(userId)),
          name: userName,
          displayName: userName,
        },
        pubKeyCredParams: [
          { type: 'public-key', alg: -7 },   // ES256
          { type: 'public-key', alg: -257 },  // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'required',
        },
        timeout: 60000,
      },
    })) as PublicKeyCredential;

    const credentialId = encodeCredentialId(credential.rawId);
    await setBiometricSetting('biometric_enabled', true);
    await setBiometricSetting('biometric_credential_id', credentialId);
    await setBiometricSetting('biometric_last_active', Date.now());
    lastActive.current = Date.now();
    setIsEnabled(true);
    setIsLocked(false);
  }, [userId, userName]);

  const disable = useCallback(async () => {
    await clearBiometricSettings();
    setIsEnabled(false);
    setIsLocked(false);
  }, []);

  const unlock = useCallback(async () => {
    const settings = await getBiometricSettings();
    if (!settings.credentialId) throw new Error('Credential not found');

    await navigator.credentials.get({
      publicKey: {
        challenge: crypto.getRandomValues(new Uint8Array(32)),
        allowCredentials: [
          {
            type: 'public-key',
            id: decodeCredentialId(settings.credentialId),
          },
        ],
        userVerification: 'required',
        timeout: 60000,
      },
    });

    lastActive.current = Date.now();
    await setBiometricSetting('biometric_last_active', Date.now());
    setIsLocked(false);
  }, []);

  return { isSupported, isEnabled, isLocked, enable, disable, unlock };
}
