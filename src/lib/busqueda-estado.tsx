/**
 * Texto de la búsqueda, compartido entre el campo de la barra lateral y el de la pantalla Buscar:
 * lo que escribes en uno aparece al momento en el otro.
 */
import { createContext, type ReactNode, useContext, useMemo, useRef, useState } from 'react';

type Estado = {
  consulta: string;
  setConsulta: (t: string) => void;
  /** Se escribió en la barra lateral desde otra pantalla: el campo lateral de Buscar recupera el foco */
  pedirFoco: () => void;
  /** ¿Hay un foco pendiente? Con `consumir` se da por atendido */
  focoPendiente: (consumir?: boolean) => boolean;
};

const Ctx = createContext<Estado>({
  consulta: '',
  setConsulta: () => {},
  pedirFoco: () => {},
  focoPendiente: () => false,
});

export function BusquedaProvider({ children }: { children: ReactNode }) {
  const [consulta, setConsulta] = useState('');
  const foco = useRef(false);
  const valor = useMemo<Estado>(
    () => ({
      consulta,
      setConsulta,
      pedirFoco: () => {
        foco.current = true;
      },
      focoPendiente: (consumir = false) => {
        const v = foco.current;
        if (consumir) foco.current = false;
        return v;
      },
    }),
    [consulta],
  );
  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>;
}

export const useBusquedaEstado = () => useContext(Ctx);
