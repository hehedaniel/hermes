import AsyncStorage from '@react-native-async-storage/async-storage';
import { File } from 'expo-file-system';
import * as FileSystem from 'expo-file-system/legacy';
import * as IntentLauncher from 'expo-intent-launcher';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';

import { VERSION } from '@/constants/version';
import { fetchLatestAppRelease, versionIsNewer } from '@/lib/app-update';

const LAST_CHECK_KEY = 'hermes.appUpdate.lastCheckedAt';
const CHECK_INTERVAL_MS = 2 * 60 * 60 * 1000;

export function useAppUpdateCheck(enabled: boolean) {
  const started = useRef(false);
  const downloadTask = useRef<FileSystem.DownloadResumable | null>(null);
  const cancelled = useRef(false);
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null);

  const descargarEInstalar = useCallback(async (url: string, version: string) => {
    const directorio = FileSystem.cacheDirectory;
    if (!directorio) {
      Alert.alert('No se pudo descargar la actualización', 'El almacenamiento temporal no está disponible.');
      return;
    }

    cancelled.current = false;
    setDownloadProgress(0);
    const apk = new File(`${directorio}Hermes-${version}.apk`);
    if (apk.exists) apk.delete();
    const task = FileSystem.createDownloadResumable(
      url,
      apk.uri,
      {},
      (progress) => {
        if (progress.totalBytesExpectedToWrite > 0) {
          setDownloadProgress(
            progress.totalBytesWritten / progress.totalBytesExpectedToWrite,
          );
        }
      },
    );
    downloadTask.current = task;
    let apkDescargado = false;

    try {
      const result = await task.downloadAsync();
      if (cancelled.current || !result) {
        if (apk.exists) apk.delete();
        return;
      }
      if (result.status < 200 || result.status >= 300) {
        throw new Error(`El servidor respondió ${result.status} al descargar el APK.`);
      }

      if (!apk.exists || apk.size < 1024 * 1024) {
        apk.delete();
        throw new Error('El archivo descargado no parece ser un APK válido.');
      }

      apkDescargado = true;
      setDownloadProgress(null);
      await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
        data: apk.contentUri,
        type: 'application/vnd.android.package-archive',
        flags: 1,
      });
      apk.delete();
    } catch (error) {
      if (!cancelled.current) {
        Alert.alert(
          'No se pudo instalar la actualización',
          error instanceof Error ? error.message : String(error),
          [
            {
              text: 'Cerrar',
              style: 'cancel',
              onPress: () => {
                if (apk.exists) apk.delete();
              },
            },
            ...(apkDescargado
              ? [
                  {
                    text: 'Permitir instalación',
                    onPress: () => {
                      void IntentLauncher.startActivityAsync(
                        'android.settings.MANAGE_UNKNOWN_APP_SOURCES',
                        { data: 'package:es.danihermoso.campus' },
                      )
                        .then(() =>
                          IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
                            data: apk.contentUri,
                            type: 'application/vnd.android.package-archive',
                            flags: 1,
                          }),
                        )
                        .then(() => {
                          if (apk.exists) apk.delete();
                        })
                        .catch((installError: unknown) =>
                          Alert.alert(
                            'No se pudo iniciar el instalador',
                            installError instanceof Error
                              ? installError.message
                              : String(installError),
                          ),
                        );
                    },
                  },
                ]
              : []),
            {
              text: 'Abrir GitHub',
              onPress: () => {
                void IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
                  data: url,
                }).catch((openError: unknown) =>
                  Alert.alert(
                    'No se pudo abrir GitHub',
                    openError instanceof Error ? openError.message : String(openError),
                  ),
                );
              },
            },
          ],
        );
      }
      if (!apkDescargado && apk.exists) apk.delete();
    } finally {
      downloadTask.current = null;
      setDownloadProgress(null);
    }
  }, []);

  const cancelarDescarga = useCallback(() => {
    cancelled.current = true;
    void downloadTask.current?.cancelAsync().catch((error: unknown) => {
      console.warn('No se pudo cancelar la descarga del APK.', error);
    });
    setDownloadProgress(null);
  }, []);

  useEffect(() => {
    if (!enabled || started.current) return;
    started.current = true;
    let active = true;

    async function checkForUpdate() {
      try {
        const now = Date.now();
        const savedCheck = await AsyncStorage.getItem(LAST_CHECK_KEY);
        const lastCheckedAt = savedCheck ? Number(savedCheck) : Number.NaN;
        if (Number.isFinite(lastCheckedAt) && now - lastCheckedAt < CHECK_INTERVAL_MS) return;

        const release = await fetchLatestAppRelease();
        await AsyncStorage.setItem(LAST_CHECK_KEY, String(now)).catch((error: unknown) =>
          console.warn('No se pudo guardar la fecha de comprobación de actualizaciones.', error),
        );
        if (!active || !versionIsNewer(release.version, VERSION)) return;

        Alert.alert(
          'Hay una nueva versión',
          `Hermes ${release.version} está disponible. Tienes instalada la versión ${VERSION}.`,
          [
            { text: 'Ahora no', style: 'cancel' },
            {
              text: 'Actualizar',
              onPress: () => void descargarEInstalar(release.downloadUrl, release.version),
            },
          ],
        );
      } catch (error) {
        console.warn('No se pudo comprobar si hay una actualización de Hermes.', error);
      }
    }

    void checkForUpdate();
    return () => {
      active = false;
    };
  }, [descargarEInstalar, enabled]);

  return { downloadProgress, cancelarDescarga };
}
