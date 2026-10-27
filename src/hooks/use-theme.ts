import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  createElement,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { Colors, TEMAS, type TemaId } from '@/constants/colors';
import { MODO_COLOR_PREFERENCIA_KEY, TEMA_PREFERENCIA_KEY } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export type ModoColor = 'sistema' | 'claro' | 'oscuro';

type ThemeContextValue = {
  tema: TemaId;
  cambiarTema: (tema: TemaId) => void;
  modoColor: ModoColor;
  cambiarModoColor: (modo: ModoColor) => void;
  oscuro: boolean;
  listo: boolean;
};

const ThemeContext = createContext<ThemeContextValue>({
  tema: 'anden',
  cambiarTema: () => {},
  modoColor: 'sistema',
  cambiarModoColor: () => {},
  oscuro: false,
  listo: false,
});

export function ThemePreferenceProvider({ children }: { children: ReactNode }) {
  const [tema, setTema] = useState<TemaId>('anden');
  const [modoColor, setModoColor] = useState<ModoColor>('sistema');
  const [listo, setListo] = useState(false);
  const scheme = useColorScheme();

  useEffect(() => {
    let activa = true;
    Promise.all([
      AsyncStorage.getItem(TEMA_PREFERENCIA_KEY),
      AsyncStorage.getItem(MODO_COLOR_PREFERENCIA_KEY),
    ])
      .then(([temaGuardado, modoGuardado]) => {
        if (!activa) return;
        if (temaGuardado) {
          if (Object.prototype.hasOwnProperty.call(TEMAS, temaGuardado)) {
            setTema(temaGuardado as TemaId);
          } else {
            console.error(`Tema guardado desconocido: ${temaGuardado}`);
          }
        }
        if (modoGuardado) {
          if (modoGuardado === 'sistema' || modoGuardado === 'claro' || modoGuardado === 'oscuro') {
            setModoColor(modoGuardado);
          } else {
            console.error(`Modo de color guardado desconocido: ${modoGuardado}`);
          }
        }
      })
      .catch((error: unknown) =>
        console.error('No se pudieron leer las preferencias de apariencia.', error),
      )
      .finally(() => {
        if (activa) setListo(true);
      });
    return () => {
      activa = false;
    };
  }, []);

  const cambiarTema = useCallback((nuevo: TemaId) => {
    setTema(nuevo);
    AsyncStorage.setItem(TEMA_PREFERENCIA_KEY, nuevo).catch((error: unknown) =>
      console.error('No se pudo guardar el tema elegido.', error),
    );
  }, []);
  const cambiarModoColor = useCallback((nuevo: ModoColor) => {
    setModoColor(nuevo);
    AsyncStorage.setItem(MODO_COLOR_PREFERENCIA_KEY, nuevo).catch((error: unknown) =>
      console.error('No se pudo guardar el modo de color elegido.', error),
    );
  }, []);
  const oscuro = modoColor === 'oscuro' || (modoColor === 'sistema' && scheme === 'dark');
  const value = useMemo(
    () => ({ tema, cambiarTema, modoColor, cambiarModoColor, oscuro, listo }),
    [tema, cambiarTema, modoColor, cambiarModoColor, oscuro, listo],
  );
  return createElement(ThemeContext.Provider, { value }, children);
}

export function useThemePreference() {
  return useContext(ThemeContext);
}

export function useTheme() {
  const { tema, oscuro } = useThemePreference();
  if (tema === 'cuaderno') return oscuro ? Colors.cuadernoOscuro : Colors.cuaderno;
  if (tema === 'nocturno') return oscuro ? Colors.nocturno : Colors.nocturnoClaro;
  return oscuro ? Colors.dark : Colors.light;
}
