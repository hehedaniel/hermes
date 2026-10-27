import AsyncStorage from '@react-native-async-storage/async-storage';
import { File } from 'expo-file-system';
import * as FileSystem from 'expo-file-system/legacy';
import * as IntentLauncher from 'expo-intent-launcher';
import Feather from '@expo/vector-icons/Feather';
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Modal, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { VERSION } from '@/constants/version';
import { useTheme } from '@/hooks/use-theme';
import { fetchLatestAppRelease, versionIsNewer } from '@/lib/app-update';

const LAST_CHECK_KEY = 'hermes.appUpdate.lastCheckedAt';
const CHECK_INTERVAL_MS = 2 * 60 * 60 * 1000;

type Dialog = {
  titulo: string;
  texto: string;
  version?: string;
  url?: string;
  apkUri?: string;
  tipo: 'disponible' | 'info' | 'error';
};

type AppUpdatesContextValue = {
  enabled: boolean;
  checking: boolean;
  checkNow: () => void;
};

const AppUpdatesContext = createContext<AppUpdatesContextValue>({
  enabled: false,
  checking: false,
  checkNow: () => {},
});

export function useAppUpdates() {
  return useContext(AppUpdatesContext);
}

export function AppUpdateProvider({
  enabled,
  children,
}: {
  enabled: boolean;
  children: ReactNode;
}) {
  const theme = useTheme();
  const started = useRef(false);
  const downloadTask = useRef<FileSystem.DownloadResumable | null>(null);
  const cancelled = useRef(false);
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null);
  const [checking, setChecking] = useState(false);

  const checkForUpdate = useCallback(async (manual: boolean) => {
    setChecking(true);
    try {
      const now = Date.now();
      if (!manual) {
        const savedCheck = await AsyncStorage.getItem(LAST_CHECK_KEY);
        const lastCheckedAt = savedCheck ? Number(savedCheck) : Number.NaN;
        if (Number.isFinite(lastCheckedAt) && now - lastCheckedAt < CHECK_INTERVAL_MS) return;
      }

      const release = await fetchLatestAppRelease();
      await AsyncStorage.setItem(LAST_CHECK_KEY, String(now)).catch((error: unknown) =>
        console.warn('No se pudo guardar la fecha de comprobación de actualizaciones.', error),
      );

      if (versionIsNewer(release.version, VERSION)) {
        setDialog({
          titulo: 'Hay una nueva versión',
          texto: `Hermes ${release.version} ya está disponible. Tienes instalada la versión ${VERSION}.`,
          tipo: 'disponible',
          version: release.version,
          url: release.downloadUrl,
        });
      } else if (manual) {
        setDialog({
          titulo: 'Ya tienes la última versión',
          texto: `Estás usando Hermes ${VERSION}. Te avisaremos cuando haya una nueva versión.`,
          tipo: 'info',
        });
      }
    } catch (error) {
      console.warn('No se pudo comprobar si hay una actualización de Hermes.', error);
      if (manual) {
        setDialog({
          titulo: 'No se pudo comprobar',
          texto: error instanceof Error ? error.message : String(error),
          tipo: 'error',
        });
      }
    } finally {
      setChecking(false);
    }
  }, []);

  const downloadAndInstall = useCallback(async (url: string, version: string) => {
    const directory = FileSystem.cacheDirectory;
    if (!directory) {
      setDialog({
        titulo: 'No se pudo descargar',
        texto: 'El almacenamiento temporal no está disponible.',
        tipo: 'error',
      });
      return;
    }

    cancelled.current = false;
    setDialog(null);
    setDownloadProgress(0);
    const apk = new File(`${directory}Hermes-${version}.apk`);
    if (apk.exists) apk.delete();
    const task = FileSystem.createDownloadResumable(
      url,
      apk.uri,
      {},
      (progress) => {
        if (progress.totalBytesExpectedToWrite > 0) {
          setDownloadProgress(progress.totalBytesWritten / progress.totalBytesExpectedToWrite);
        }
      },
    );
    downloadTask.current = task;
    let apkDownloaded = false;

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

      apkDownloaded = true;
      setDownloadProgress(null);
      await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
        data: apk.contentUri,
        type: 'application/vnd.android.package-archive',
        flags: 1,
      });
      apk.delete();
    } catch (error) {
      if (!cancelled.current) {
        setDialog({
          titulo: 'No se pudo instalar la actualización',
          texto: error instanceof Error ? error.message : String(error),
          tipo: 'error',
            ...(apkDownloaded ? { version, url, apkUri: apk.uri } : {}),
        });
      }
      if (!apkDownloaded && apk.exists) apk.delete();
    } finally {
      downloadTask.current = null;
      setDownloadProgress(null);
    }
  }, []);

  const cancelDownload = useCallback(() => {
    cancelled.current = true;
    void downloadTask.current?.cancelAsync().catch((error: unknown) => {
      console.warn('No se pudo cancelar la descarga del APK.', error);
    });
    setDownloadProgress(null);
  }, []);

  useEffect(() => {
    if (!enabled || started.current) return;
    started.current = true;
    void checkForUpdate(false);
  }, [checkForUpdate, enabled]);

  const checkNow = useCallback(() => void checkForUpdate(true), [checkForUpdate]);
  const contextValue = useMemo(
    () => ({ enabled, checking, checkNow }),
    [enabled, checking, checkNow],
  );
  const icon = dialog?.tipo === 'disponible' ? 'download-cloud' : dialog?.tipo === 'error' ? 'alert-circle' : 'check-circle';

  return (
    <AppUpdatesContext.Provider value={contextValue}>
      {children}
      <Modal
        transparent
        animationType="fade"
        visible={dialog !== null || downloadProgress !== null}
        onRequestClose={() => {
          if (downloadProgress !== null) cancelDownload();
          else setDialog(null);
        }}>
        <View style={styles.overlay}>
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.line }]}>
            {downloadProgress !== null ? (
              <>
                <View style={[styles.icon, { backgroundColor: theme.brandWash }]}>
                  <Feather name="download-cloud" size={23} color={theme.brand} />
                </View>
                <ThemedText type="heading">Descargando actualización</ThemedText>
                <ThemedText type="small" themeColor="ink2">
                  {Math.round(downloadProgress * 100)} % · No cierres Hermes hasta que termine.
                </ThemedText>
                <View style={[styles.track, { backgroundColor: theme.line }]}>
                  <View
                    style={[
                      styles.progress,
                      {
                        backgroundColor: theme.brand,
                        width: `${Math.round(downloadProgress * 100)}%`,
                      },
                    ]}
                  />
                </View>
                <Button title="Cancelar" variant="secondary" onPress={cancelDownload} />
              </>
            ) : dialog ? (
              <>
                <View
                  style={[
                    styles.icon,
                    { backgroundColor: dialog.tipo === 'error' ? theme.urgentWash : theme.brandWash },
                  ]}>
                  <Feather
                    name={icon}
                    size={23}
                    color={dialog.tipo === 'error' ? theme.urgent : theme.brand}
                  />
                </View>
                <ThemedText type="heading">{dialog.titulo}</ThemedText>
                <ThemedText type="small" themeColor="ink2">
                  {dialog.texto}
                </ThemedText>
                <View style={styles.actions}>
                  {dialog.tipo === 'disponible' && dialog.url && dialog.version ? (
                    <>
                      <Button
                        title="Ahora no"
                        variant="secondary"
                        onPress={() => setDialog(null)}
                      />
                      <Button
                        title="Actualizar"
                        icono="download"
                        onPress={() => {
                          const url = dialog.url;
                          const version = dialog.version;
                          if (url && version) void downloadAndInstall(url, version);
                        }}
                      />
                    </>
                  ) : dialog.version && dialog.url && dialog.apkUri ? (
                    <Button
                      title="Permitir instalación"
                      onPress={() => {
                        const apk = new File(dialog.apkUri!);
                        setDialog(null);
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
                          .catch((error: unknown) =>
                            setDialog({
                              titulo: 'No se pudo abrir Ajustes',
                              texto: error instanceof Error ? error.message : String(error),
                              tipo: 'error',
                              version: dialog.version,
                              url: dialog.url,
                              apkUri: dialog.apkUri,
                            }),
                          );
                      }}
                    />
                  ) : (
                    <Button title="Entendido" onPress={() => setDialog(null)} />
                  )}
                </View>
              </>
            ) : null}
          </View>
        </View>
      </Modal>
    </AppUpdatesContext.Provider>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    padding: 28,
    backgroundColor: 'rgba(0, 0, 0, 0.48)',
  },
  card: {
    alignItems: 'stretch',
    borderWidth: 1,
    borderRadius: 18,
    padding: 22,
    gap: 14,
  },
  icon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 4 },
  track: { height: 7, overflow: 'hidden', borderRadius: 4 },
  progress: { height: '100%', borderRadius: 4 },
});
