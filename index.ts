// Punto de entrada: la app (Expo Router) y, en Android, los widgets de la pantalla de inicio,
// que se dibujan en segundo plano aunque la app esté cerrada.
// Define la sincronización en segundo plano: tiene que estar al arrancar, antes que la app
import './src/lib/segundo-plano';
import 'expo-router/entry';

import { registrarWidgets } from './src/widgets/registrar';

registrarWidgets();
