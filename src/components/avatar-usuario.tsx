/**
 * Foto de perfil del usuario, la que tiene puesta en Moodle. Si no tiene (o no se puede leer),
 * sus iniciales.
 */
import { useEffect, useState } from 'react';
import { Image, View } from 'react-native';

import { T } from '@/components/obs';
import { urlFoto } from '@/lib/profesor';
import { useMoodle } from '@/lib/store';

type Candidato = { profileimageurl?: string };

export function useFotoUsuario() {
  const { client, snapshot } = useMoodle();
  const userid = snapshot?.site.userid;
  const dada = snapshot?.site.userpictureurl;
  const [foto, setFoto] = useState<string | undefined>();
  useEffect(() => {
    if (!client) return;
    let activo = true;
    (async () => {
      let url = dada ? urlFoto(client, dada) : undefined;
      if (!url && userid) {
        try {
          const us = await client.call<Candidato[]>('core_user_get_users_by_field', {
            field: 'id',
            values: [String(userid)],
          });
          url = urlFoto(client, Array.isArray(us) ? us[0]?.profileimageurl : undefined);
        } catch {
          /* sin permiso: se quedan las iniciales */
        }
      }
      if (activo) setFoto(url);
    })();
    return () => {
      activo = false;
    };
  }, [client, userid, dada]);
  return foto;
}

export function AvatarUsuario({
  size,
  iniciales,
  fontSize,
  fondo = '#1E1E24',
  borde = '#2B2B34',
  color = '#A4A4B2',
}: {
  size: number;
  iniciales: string;
  fontSize: number;
  fondo?: string;
  borde?: string;
  color?: string;
}) {
  const foto = useFotoUsuario();
  const [rota, setRota] = useState(false);
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: fondo,
        borderWidth: 1,
        borderColor: borde,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}>
      {foto && !rota ? (
        <Image
          source={{ uri: foto }}
          style={{ width: size, height: size }}
          onError={() => setRota(true)}
          accessibilityIgnoresInvertColors
        />
      ) : (
        <T s={fontSize} w={600} c={color}>
          {iniciales}
        </T>
      )}
    </View>
  );
}
