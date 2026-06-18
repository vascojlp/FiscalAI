const router = require('express').Router();
const { pool } = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');

const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

router.use(requireAuth);

// ── Visitas ────────────────────────────────────────────────────────────────

router.get('/', wrap(async (req, res) => {
  const { obra_id } = req.query;
  if (!obra_id) return res.status(400).json({ error: 'obra_id obrigatório' });
  const { rows } = await pool.query(
    `SELECT v.*, u.username AS created_by_name,
       (SELECT COUNT(*) FROM fotos f WHERE f.visita_id = v.id) AS total_fotos,
       (SELECT COUNT(*) FROM nao_conformidades nc WHERE nc.visita_id = v.id) AS total_ncs
     FROM visitas v LEFT JOIN users u ON u.id = v.created_by
     WHERE v.obra_id = $1 ORDER BY v.data DESC, v.numero_visita DESC`,
    [obra_id]
  );
  res.json(rows);
}));

router.get('/:id', wrap(async (req, res) => {
  const { rows: vRows } = await pool.query(
    `SELECT v.*, o.nome AS obra_nome, o.localizacao, o.tipo, o.dono_da_obra, o.empreiteiro, o.contrato
     FROM visitas v JOIN obras o ON o.id = v.obra_id WHERE v.id = $1`,
    [req.params.id]
  );
  if (!vRows[0]) return res.status(404).json({ error: 'Visita não encontrada' });

  const { rows: fotos } = await pool.query(
    "SELECT id, area, nota, media_type, ordem FROM fotos WHERE visita_id=$1 ORDER BY ordem",
    [req.params.id]
  );
  const { rows: ncs } = await pool.query(
    "SELECT * FROM nao_conformidades WHERE visita_id=$1 ORDER BY created_at",
    [req.params.id]
  );
  res.json({ ...vRows[0], fotos, ncs });
}));

router.post('/', requireRole('admin', 'writer'), wrap(async (req, res) => {
  const { obra_id, data, numero_visita, fiscal, condicoes, temp, humidade, vento, uv } = req.body;
  if (!obra_id) return res.status(400).json({ error: 'obra_id obrigatório' });
  const tempValue = temp !== undefined && temp !== '' ? parseInt(temp, 10) : null;
  const humidadeValue = humidade !== undefined && humidade !== '' ? parseInt(humidade, 10) : null;
  const ventoValue = vento !== undefined && vento !== '' ? parseInt(vento, 10) : null;
  const uvValue = uv !== undefined && uv !== '' ? parseInt(uv, 10) : null;
  const { rows } = await pool.query(
    "INSERT INTO visitas (obra_id,data,numero_visita,fiscal,condicoes,temp,humidade,vento,uv,created_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *",
    [obra_id, data || new Date().toISOString().split('T')[0], numero_visita || 1, fiscal, condicoes || 'Sol ☀️', tempValue, humidadeValue, ventoValue, uvValue, req.user.id]
  );
  res.status(201).json(rows[0]);
}));

router.put('/:id', requireRole('admin', 'writer'), wrap(async (req, res) => {
  const { data, numero_visita, fiscal, condicoes, observacoes, temp, humidade, vento, uv } = req.body;
  const tempValue = temp !== undefined && temp !== '' ? parseInt(temp, 10) : null;
  const humidadeValue = humidade !== undefined && humidade !== '' ? parseInt(humidade, 10) : null;
  const ventoValue = vento !== undefined && vento !== '' ? parseInt(vento, 10) : null;
  const uvValue = uv !== undefined && uv !== '' ? parseInt(uv, 10) : null;
  const { rows } = await pool.query(
    "UPDATE visitas SET data=$1,numero_visita=$2,fiscal=$3,condicoes=$4,temp=$5,humidade=$6,vento=$7,uv=$8,observacoes=$9,updated_at=NOW() WHERE id=$10 RETURNING *",
    [data, numero_visita, fiscal, condicoes, tempValue, humidadeValue, ventoValue, uvValue, observacoes, req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Visita não encontrada' });
  res.json(rows[0]);
}));

router.delete('/:id', requireRole('admin'), wrap(async (req, res) => {
  await pool.query("DELETE FROM visitas WHERE id=$1", [req.params.id]);
  res.json({ message: 'Visita eliminada' });
}));

// ── Geração de Relatório ───────────────────────────────────────────────────

router.post('/:id/generate', requireRole('admin', 'writer'), wrap(async (req, res) => {
  const { rows: vRows } = await pool.query(
    `SELECT v.*, o.nome AS obra_nome, o.localizacao, o.tipo, o.dono_da_obra, o.empreiteiro, o.contrato
     FROM visitas v JOIN obras o ON o.id = v.obra_id WHERE v.id = $1`,
    [req.params.id]
  );
  if (!vRows[0]) return res.status(404).json({ error: 'Visita não encontrada' });
  const v = vRows[0];

  const { rows: fotos } = await pool.query(
    "SELECT * FROM fotos WHERE visita_id=$1 ORDER BY ordem", [req.params.id]
  );
  const { rows: ncs } = await pool.query(
    "SELECT * FROM nao_conformidades WHERE visita_id=$1 ORDER BY created_at", [req.params.id]
  );

  const prompt = `Gera um relatório técnico completo e detalhado de fiscalização de obras em português europeu formal. Este é um documento oficial de fiscalização.

═══ DADOS DA OBRA ═══
Nome da Obra: ${v.obra_nome}
Localização: ${v.localizacao || 'N/D'}
Data da Visita: ${v.data}
N.º da Visita: ${v.numero_visita}
Tipo de Obra: ${v.tipo || 'N/D'}
Dono de Obra: ${v.dono_da_obra || 'N/D'}
Empreiteiro: ${v.empreiteiro || 'N/D'}
N.º de Contrato: ${v.contrato || 'N/D'}
Fiscal Responsável: ${v.fiscal || 'N/D'}
Condições Climatéricas: ${v.condicoes}

═══ OBSERVAÇÕES DE CAMPO ═══
${v.observacoes || '(sem observações registadas)'}

═══ NÃO-CONFORMIDADES (${ncs.length}) ═══
${ncs.length === 0
    ? 'Nenhuma não-conformidade registada.'
    : ncs.map((nc, i) =>
        `NC-${String(i + 1).padStart(2, '0')} | Área: ${nc.area} | Urgência: ${nc.urgencia} | Estado: ${nc.estado}\n  Descrição: ${nc.descricao || '(sem descrição)'}`
      ).join('\n\n')}

═══ REGISTO FOTOGRÁFICO (${fotos.length} foto${fotos.length !== 1 ? 's' : ''}) ═══
${fotos.length === 0
    ? 'Sem registo fotográfico.'
    : fotos.map((f, i) => `Foto ${i + 1}: Localização - "${f.area}" | Notas do Fiscal: "${f.nota || 'sem notas'}" | Data captura: ${f.created_at || 'N/D'}`).join('\n')}

INSTRUÇÕES CRÍTICAS PARA ANÁLISE:

1. ANÁLISE DETALHADA DO REGISTO FOTOGRÁFICO:
   - Analisa cada foto e descreve o que é visível (estado de acabamentos, quantidade de trabalhos, conformidade com desenhos)
   - Identifica possíveis problemas de qualidade, segurança ou conformidade nas imagens
   - Avalia o progresso dos trabalhos face ao tipo de obra

2. AVALIAÇÃO DE CONFORMIDADE E SEGURANÇA:
   - Conformidade com normas técnicas e legislação portuguesa de construção
   - Riscos de segurança no local (proteções, acessos, equipamentos, etc.)
   - Cumprimento de medidas de prevenção e proteção (EPP, sinalização, etc.)
   - Estado das instalações provisórias (estaleiros, armazenamentos)

3. ANÁLISE DE TRABALHOS EXECUTADOS:
   - Descrição técnica detalhada dos trabalhos realizados no período
   - Qualidade de execução observada
   - Materiais utilizados e sua conformidade
   - Sequência lógica de trabalhos vs cronograma previsto

4. IDENTIFICAÇÃO DE RISCOS E VIOLAÇÕES:
   - Violações de segurança observadas
   - Riscos potenciais para trabalhadores
   - Não-conformidades estruturais ou técnicas
   - Desvios ao projeto aprovado

5. MÉTRICAS E PROGRESSO:
   - Percentagem de conclusão estimada
   - Análise de cumprimento de cronograma
   - Avaliação do ritmo de trabalhos

Estrutura o relatório profissional com estas secções em markdown:

## 1. IDENTIFICAÇÃO DA VISITA
Resumo executivo com dados essenciais e classificação do estado geral (Bom/Aceitável/Insuficiente/Crítico).

## 2. ESTADO GERAL DA OBRA
Análise global do andamento, conformidade e qualidade observados. Inclui avaliação de progresso vs cronograma.

## 3. ANÁLISE DETALHADA DO REGISTO FOTOGRÁFICO
Para cada foto, descreve o conteúdo, avalia a conformidade e identifica problemas potenciais.

## 4. TRABALHOS EXECUTADOS E PROGRESSO
Descrição técnica detalhada dos trabalhos identificados. Análise de qualidade e conformidade de execução.

## 5. AVALIAÇÃO DE CONFORMIDADE E SEGURANÇA
- Conformidade com normas e regulamentos aplicáveis
- Riscos de segurança identificados (detalhado)
- Estado de proteções, equipamentos de segurança, sinalização
- Medidas corretivas necessárias

## 6. NÃO-CONFORMIDADES REGISTADAS
Lista detalhada com análise de impacto, prazo recomendado de resolução e responsável proposto.

## 7. OBSERVAÇÕES E RECOMENDAÇÕES TÉCNICAS
Recomendações específicas para melhorias, conformidade e eficiência.

## 8. PRÓXIMAS ACÇÕES E PENDENTES
Listagem clara de ações pendentes, prazos e responsáveis.

## 9. ASSINATURAS
Espaço para assinatura do fiscal.

Usa linguagem técnica formal portuguesa. Sê específico e detalhado nas análises. Identifica claramente riscos e não-conformidades.`;

  const requestOllama = async (text) => {
    const url = 'http://host.docker.internal:11434/api/generate';
    const maxAttempts = 3;
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: 'llama2', prompt: text, stream: false })
        });

        if (response.ok) return response;

        const retryStatus = [429, 502, 503, 504].includes(response.status);
        if (!retryStatus || attempt === maxAttempts - 1) return response;

        const delay = 500 * Math.pow(2, attempt);
        console.warn(`Ollama request failed with ${response.status}; retrying in ${delay}ms (attempt ${attempt + 1})`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } catch (err) {
        if (attempt === maxAttempts - 1) throw err;
        const delay = 500 * Math.pow(2, attempt);
        console.warn(`Ollama connection error; retrying in ${delay}ms (attempt ${attempt + 1}): ${err.message}`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    throw new Error('Falha inesperada na requisição Ollama');
  };

  const response = await requestOllama(prompt);

  const parseApiError = async (resp) => {
    const text = await resp.text().catch(() => '');
    try {
      const errJson = JSON.parse(text);
      return errJson.error || JSON.stringify(errJson);
    } catch {
      return text || `Erro desconhecido do Ollama (status ${resp.status})`;
    }
  };

  if (!response.ok) {
    const apiMessage = await parseApiError(response);
    return res.status(500).json({ error: 'Erro no Ollama: ' + apiMessage });
  }

  let data;
  const responseText = await response.text().catch(() => '');
  try {
    data = JSON.parse(responseText);
  } catch (parseError) {
    return res.status(500).json({ error: 'Erro a analisar resposta do Ollama: ' + (responseText || parseError.message) });
  }

  const relatorio = data.response || '';

  // Guardar na visita (sistema legado — mantido para compatibilidade)
  await pool.query(
    "UPDATE visitas SET relatorio=$1, relatorio_gerado_at=NOW(), updated_at=NOW() WHERE id=$2",
    [relatorio, req.params.id]
  );

  // ── Sincronizar com tabela relatorios ──────────────────────────────────────
  const titulo = `Relatório da Visita n.º ${v.numero_visita} — ${v.obra_nome}`;
  const existente = await pool.query(
    "SELECT id FROM relatorios WHERE visita_id=$1 ORDER BY created_at DESC LIMIT 1",
    [req.params.id]
  );
  if (existente.rows[0]) {
    await pool.query(
      `UPDATE relatorios SET conteudo=$1, titulo=$2, status='approved',
       versao=versao+1, edited_by=$3, updated_at=NOW() WHERE id=$4`,
      [relatorio, titulo, req.user.id, existente.rows[0].id]
    );
  } else {
    await pool.query(
      `INSERT INTO relatorios (visita_id, obra_id, titulo, conteudo, status, created_by, edited_by)
       VALUES ($1,$2,$3,$4,'approved',$5,$5)`,
      [req.params.id, v.obra_id, titulo, relatorio, req.user.id]
    );
  }

  res.json({ relatorio });
}));

// ── Fotos ──────────────────────────────────────────────────────────────────

router.get('/:id/fotos', wrap(async (req, res) => {
  const { rows } = await pool.query(
    "SELECT id, area, nota, media_type, ordem, created_at FROM fotos WHERE visita_id=$1 ORDER BY ordem",
    [req.params.id]
  );
  res.json(rows);
}));

// Retorna imagem como base64 (para preview)
router.get('/:id/fotos/:fotoId/imagem', wrap(async (req, res) => {
  const { rows } = await pool.query(
    "SELECT imagem_data, media_type FROM fotos WHERE id=$1 AND visita_id=$2",
    [req.params.fotoId, req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Foto não encontrada' });
  const buf = Buffer.from(rows[0].imagem_data, 'base64');
  res.set('Content-Type', rows[0].media_type || 'image/jpeg');
  res.send(buf);
}));

router.post('/:id/fotos', requireRole('admin', 'writer'), wrap(async (req, res) => {
  const { area, nota, imagem_data, media_type, ordem } = req.body;
  if (!imagem_data) return res.status(400).json({ error: 'imagem_data obrigatória' });
  const { rows } = await pool.query(
    "INSERT INTO fotos (visita_id,area,nota,imagem_data,media_type,ordem) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id,area,nota,media_type,ordem,created_at",
    [req.params.id, area || 'Geral', nota, imagem_data, media_type || 'image/jpeg', ordem || 0]
  );
  res.status(201).json(rows[0]);
}));

router.patch('/:id/fotos/:fotoId', requireRole('admin', 'writer'), wrap(async (req, res) => {
  const { area, nota } = req.body;
  const { rows } = await pool.query(
    "UPDATE fotos SET area=$1, nota=$2 WHERE id=$3 AND visita_id=$4 RETURNING id,area,nota,media_type,ordem",
    [area, nota, req.params.fotoId, req.params.id]
  );
  res.json(rows[0]);
}));

router.delete('/:id/fotos/:fotoId', requireRole('admin', 'writer'), wrap(async (req, res) => {
  await pool.query("DELETE FROM fotos WHERE id=$1 AND visita_id=$2", [req.params.fotoId, req.params.id]);
  res.json({ message: 'Foto eliminada' });
}));

// ── Não-Conformidades ──────────────────────────────────────────────────────

router.get('/:id/ncs', wrap(async (req, res) => {
  const { rows } = await pool.query(
    "SELECT * FROM nao_conformidades WHERE visita_id=$1 ORDER BY created_at", [req.params.id]
  );
  res.json(rows);
}));

router.post('/:id/ncs', requireRole('admin', 'writer'), wrap(async (req, res) => {
  const { area, descricao, urgencia } = req.body;
  const { rows } = await pool.query(
    "INSERT INTO nao_conformidades (visita_id,area,descricao,urgencia) VALUES ($1,$2,$3,$4) RETURNING *",
    [req.params.id, area || 'Geral', descricao, urgencia || 'Média']
  );
  res.status(201).json(rows[0]);
}));

router.put('/:id/ncs/:ncId', requireRole('admin', 'writer'), wrap(async (req, res) => {
  const { area, descricao, urgencia, estado } = req.body;
  const { rows } = await pool.query(
    "UPDATE nao_conformidades SET area=$1,descricao=$2,urgencia=$3,estado=$4,updated_at=NOW() WHERE id=$5 AND visita_id=$6 RETURNING *",
    [area, descricao, urgencia, estado, req.params.ncId, req.params.id]
  );
  res.json(rows[0]);
}));

router.delete('/:id/ncs/:ncId', requireRole('admin', 'writer'), wrap(async (req, res) => {
  await pool.query("DELETE FROM nao_conformidades WHERE id=$1 AND visita_id=$2", [req.params.ncId, req.params.id]);
  res.json({ message: 'NC eliminada' });
}));

module.exports = router;