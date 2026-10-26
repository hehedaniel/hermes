import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import { CLAVES } from '../claves';
import { PROVEEDORES, type Proveedor } from './proveedores';

export type ConfigIA = {
  proveedor: Proveedor;
  /** Modelo elegido para cada proveedor (si no hay, se usa el recomendado) */
  modelos: Partial<Record<Proveedor, string>>;
  /** Indicaciones que se añaden a todas las tareas ("escribe como un alumno de FP"…) */
  instrucciones: string;
};

export const CONFIG_IA_POR_DEFECTO: ConfigIA = {
  proveedor: 'gemini',
  modelos: {},
  instrucciones: '',
};

// Las claves van cifradas en el móvil (SecureStore); en la web, en el almacenamiento del navegador
const almacenClaves =
  Platform.OS === 'web'
    ? {
        getItemAsync: (k: string) => AsyncStorage.getItem(k),
        setItemAsync: (k: string, v: string) => AsyncStorage.setItem(k, v),
        deleteItemAsync: (k: string) => AsyncStorage.removeItem(k),
      }
    : SecureStore;

export async function leerConfigIA(): Promise<ConfigIA> {
  try {
    const raw = await AsyncStorage.getItem(CLAVES.iaConfig);
    return raw ? { ...CONFIG_IA_POR_DEFECTO, ...JSON.parse(raw) } : CONFIG_IA_POR_DEFECTO;
  } catch {
    return CONFIG_IA_POR_DEFECTO;
  }
}

export const guardarConfigIA = (c: ConfigIA) =>
  AsyncStorage.setItem(CLAVES.iaConfig, JSON.stringify(c));

export const leerClaveIA = (p: Proveedor) =>
  almacenClaves.getItemAsync(CLAVES.iaClave(p)).catch(() => null);

export const guardarClaveIA = (p: Proveedor, clave: string) =>
  clave.trim()
    ? almacenClaves.setItemAsync(CLAVES.iaClave(p), clave.trim())
    : almacenClaves.deleteItemAsync(CLAVES.iaClave(p));

export const modeloDe = (c: ConfigIA) =>
  c.modelos[c.proveedor] || PROVEEDORES[c.proveedor].modeloPorDefecto;

/** Todo lo necesario para hacer una petición, o null si falta la clave. */
export async function ajustesIA() {
  const config = await leerConfigIA();
  const clave = await leerClaveIA(config.proveedor);
  return { config, clave, modelo: modeloDe(config) };
}
