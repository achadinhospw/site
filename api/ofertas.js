// Vercel Function: lê a vitrine pública (somente leitura) do Supabase.
// A URL e a chave publicável ficam nas variáveis de ambiente do Vercel, nunca no repositório.
const CATEGORIAS = new Set([
  'notebooks', 'celulares', 'relogios', 'tablets',
  'roupas-femininas', 'roupas-masculinas', 'roupas-infantis',
]);
const LOJAS = new Set(['shopee', 'mercado_livre', 'amazon']);
const ORDENS = {
  'custo-beneficio': 'score.desc,economia.desc',
  'qualidade': 'nota.desc.nullslast,vendas.desc.nullslast',
  'menor-preco': 'preco.asc',
  'maior-desconto': 'desconto.desc.nullslast',
  'maior-economia': 'economia.desc',
};
const CAMPOS = 'id,plataforma,titulo,imagem,preco,preco_original,desconto,economia,frete_gratis,nota,vendas,link,categoria,atualizado_em';

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 && n < 1e6 ? n : null;
}

module.exports = async (req, res) => {
  const base = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!base || !key) {
    res.status(503).json({ erro: 'configuracao_pendente' });
    return;
  }

  const q = req.query || {};
  const params = new URLSearchParams();
  params.set('select', CAMPOS);

  const cat = String(q.categoria || '');
  if (CATEGORIAS.has(cat)) params.set('categoria', `eq.${cat}`);
  else params.set('categoria', 'not.is.null');

  const loja = String(q.loja || '');
  if (LOJAS.has(loja)) params.set('plataforma', `eq.${loja}`);

  const min = num(q.min);
  const max = num(q.max);
  if (min !== null && max !== null) params.set('and', `(preco.gte.${min},preco.lte.${max})`);
  else if (min !== null) params.set('preco', `gte.${min}`);
  else if (max !== null) params.set('preco', `lte.${max}`);

  const busca = String(q.busca || '').replace(/[^\p{L}\p{N} \-]/gu, '').trim().slice(0, 60);
  if (busca) params.set('titulo', `ilike.*${busca}*`);

  params.set('order', ORDENS[String(q.ordem)] || ORDENS['custo-beneficio']);
  params.set('limit', '48');

  try {
    const r = await fetch(`${base}/rest/v1/site_vitrine?${params}`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    });
    if (!r.ok) throw new Error(String(r.status));
    const dados = await r.json();
    res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=300');
    res.status(200).json({ ofertas: dados });
  } catch (e) {
    res.status(502).json({ erro: 'indisponivel' });
  }
};
