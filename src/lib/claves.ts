/** Dónde guarda la app cada cosa (AsyncStorage / SecureStore). Compartido con el segundo plano. */
export const CLAVES = {
  token: 'moodle_token',
  url: 'moodle_url',
  snapshot: 'snapshot_v1',
  novedades: 'novedades_v1',
  base: 'novedades_base_v1',
  avisos: 'avisos_v1',
  permisoPedido: 'avisos_permiso_pedido',
  contenido: (cursoId: number) => `contents_v1_${cursoId}`,
} as const;
