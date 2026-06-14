export const C = {
  navy:      '#1E3A5F',
  amber:     '#F59E0B',
  white:     '#FFFFFF',
  bg:        '#F8FAFC',
  card:      '#FFFFFF',
  border:    '#E2E8F0',
  slate:     '#94A3B8',
  text:      '#1E293B',
  muted:     '#64748B',
  green:     '#059669',
  greenBg:   '#F0FDF4',
  greenBdr:  '#BBF7D0',
  red:       '#DC2626',
  redBg:     '#FEF2F2',
  redBdr:    '#FECACA',
  orangeBg:  '#FFFBEB',
  orangeBdr: '#FDE68A',
  orange:    '#D97706',
};

export const AREAS = [
  'Estrutura', 'Alvenaria', 'Coberturas', 'Impermeabilizações',
  'Instalações Eléctricas', 'Instalações AVAC', 'Instalações Hidráulicas',
  'Acabamentos Interiores', 'Acabamentos Exteriores', 'Segurança', 'Geral',
];

export const TIPOS_OBRA = [
  'Edifício de Habitação', 'Edifício de Serviços', 'Equipamento Público',
  'Reabilitação Urbana', 'Infraestruturas', 'Industrial', 'Outro',
];

export const CONDICOES = ['Sol ☀️', 'Nublado ⛅', 'Chuva 🌧️', 'Vento 💨', 'Frio 🌡️'];
export const URGENCIAS = ['Alta', 'Média', 'Baixa'];
export const ESTADOS_NC = ['Aberta', 'Em Resolução', 'Fechada'];

export const urgenciaColor = (u) => ({
  Alta:  { bg: '#FEF2F2', border: '#FECACA', text: '#DC2626' },
  Média: { bg: '#FFFBEB', border: '#FDE68A', text: '#D97706' },
  Baixa: { bg: '#F0FDF4', border: '#BBF7D0', text: '#059669' },
}[u] || {});

export const estadoColor = (e) => ({
  'Aberta':        { bg: '#FEF2F2', text: '#DC2626' },
  'Em Resolução':  { bg: '#FFFBEB', text: '#D97706' },
  'Fechada':       { bg: '#F0FDF4', text: '#059669' },
}[e] || {});
