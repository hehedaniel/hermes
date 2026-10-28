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
  iaConfig: 'ia_config_v1',
  /** SecureStore solo admite letras, números, ".", "-" y "_" en las claves */
  iaClave: (proveedor: string) => `ia_clave_${proveedor}`,
  iaPlantillas: 'ia_plantillas_v1',
  iaChatEleccion: (entregaKey: string) => `ia_chat_eleccion_v1_${entregaKey}`,
  faltas: 'faltas_v1',
  faltasLimite: 'faltas_limite_v1',
  syncReg: 'sync_reg_v1',
  syncCtx: 'sync_ctx_v1',
  syncUltima: 'sync_ultima_v1',
  iaChat: (entregaKey: string) => `ia_chat_v1_${entregaKey}`,
} as const;
