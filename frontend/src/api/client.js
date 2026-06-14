async function request(path, options = {}) {
  const token = localStorage.getItem('fiscalai_token');
  const res = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error(err.error || 'Erro desconhecido');
  }
  return res.json();
}

export const api = {
  // Auth
  login: (d)              => request('/api/auth/login', { method: 'POST', body: JSON.stringify(d) }),
  me: ()                  => request('/api/auth/me'),
  changePassword: (d)     => request('/api/auth/password', { method: 'PUT', body: JSON.stringify(d) }),

  // Users (admin)
  getUsers: ()            => request('/api/users'),
  createUser: (d)         => request('/api/users', { method: 'POST', body: JSON.stringify(d) }),
  updateUser: (id, d)     => request(`/api/users/${id}`, { method: 'PUT', body: JSON.stringify(d) }),
  deleteUser: (id)        => request(`/api/users/${id}`, { method: 'DELETE' }),

  // Obras
  getObras: ()            => request('/api/obras'),
  getObra: (id)           => request(`/api/obras/${id}`),
  createObra: (d)         => request('/api/obras', { method: 'POST', body: JSON.stringify(d) }),
  updateObra: (id, d)     => request(`/api/obras/${id}`, { method: 'PUT', body: JSON.stringify(d) }),
  deleteObra: (id)        => request(`/api/obras/${id}`, { method: 'DELETE' }),

  // Visitas
  getVisitas: (obraId)    => request(`/api/visitas?obra_id=${obraId}`),
  getVisita: (id)         => request(`/api/visitas/${id}`),
  createVisita: (d)       => request('/api/visitas', { method: 'POST', body: JSON.stringify(d) }),
  updateVisita: (id, d)   => request(`/api/visitas/${id}`, { method: 'PUT', body: JSON.stringify(d) }),
  deleteVisita: (id)      => request(`/api/visitas/${id}`, { method: 'DELETE' }),
  generateRelatorio: (id) => request(`/api/visitas/${id}/generate`, { method: 'POST' }),

  // Fotos
  addFoto: (vid, d)           => request(`/api/visitas/${vid}/fotos`, { method: 'POST', body: JSON.stringify(d) }),
  updateFoto: (vid, fid, d)   => request(`/api/visitas/${vid}/fotos/${fid}`, { method: 'PATCH', body: JSON.stringify(d) }),
  deleteFoto: (vid, fid)      => request(`/api/visitas/${vid}/fotos/${fid}`, { method: 'DELETE' }),
  fotoUrl: (vid, fid)         => `/api/visitas/${vid}/fotos/${fid}/imagem`,

  // NCs
  addNC: (vid, d)             => request(`/api/visitas/${vid}/ncs`, { method: 'POST', body: JSON.stringify(d) }),
  updateNC: (vid, nid, d)     => request(`/api/visitas/${vid}/ncs/${nid}`, { method: 'PUT', body: JSON.stringify(d) }),
  deleteNC: (vid, nid)        => request(`/api/visitas/${vid}/ncs/${nid}`, { method: 'DELETE' }),

  // Relatórios
  getRelatoriosPorObra: (obraId)  => request(`/api/relatorios/obra/${obraId}`),
  getRelatoriosPorVisita: (visitaId) => request(`/api/relatorios/visita/${visitaId}`),
  getRelatorio: (id)              => request(`/api/relatorios/${id}`),
  createRelatorio: (d)            => request('/api/relatorios', { method: 'POST', body: JSON.stringify(d) }),
  updateRelatorio: (id, d)        => request(`/api/relatorios/${id}`, { method: 'PUT', body: JSON.stringify(d) }),
  deleteRelatorio: (id)           => request(`/api/relatorios/${id}`, { method: 'DELETE' }),
  copyRelatorio: (id, d)          => request(`/api/relatorios/${id}/copy`, { method: 'POST', body: JSON.stringify(d) }),
  exportRelatorio: (id, format)   => `/api/relatorios/${id}/export/${format}`,
};
