import { IASettings } from '@/components/ia-settings';
import { Screen } from '@/components/screen';

/** Ajustes > Inteligencia artificial: proveedor, lo que puede, clave y modelo. */
export default function AjustesIAScreen() {
  return (
    <Screen refreshable={false} maxWidth={720}>
      <IASettings />
    </Screen>
  );
}
