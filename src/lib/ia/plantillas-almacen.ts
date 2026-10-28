/** Lee las plantillas guardadas en el dispositivo (sin React: lo usan el chat y la sincronización). */
import AsyncStorage from '@react-native-async-storage/async-storage';

import { CLAVES } from '../claves';
import { PLANTILLAS_POR_DEFECTO, type PlantillasIA } from './plantillas-datos';

export async function leerPlantillas(): Promise<PlantillasIA> {
  try {
    const raw = await AsyncStorage.getItem(CLAVES.iaPlantillas);
    const d = raw ? JSON.parse(raw) : {};
    return {
      ...PLANTILLAS_POR_DEFECTO,
      ...d,
      plantillas: Array.isArray(d.plantillas) ? d.plantillas : [],
    };
  } catch {
    return PLANTILLAS_POR_DEFECTO;
  }
}
