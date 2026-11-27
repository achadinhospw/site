// Vercel Function: busca produtos por termo/modelo para os artigos do Blog.
// 1) Se SHOPEE_APP_ID e SHOPEE_SECRET estiverem nas variáveis da Vercel, consulta a API oficial
//    de Afiliados da Shopee (productOfferV2) trazendo qualquer modelo — não só promoções extremas —
//    já com link de afiliado oficial e ordenação por custo-benefício, menor preço ou qualidade.
// 2) Caso contrário (fallback automático), consulta a vitrine do Supabase por termo/categoria.
const crypto = require('crypto');

const SHOPEE_GRAPHQL_URL = 'https://open-api.affiliate.shopee.com.br/graphql';

const CATEGORIAS = new Set([
  'notebooks', 'celulares', 'relogios', 'tablets',
  'roupas-femininas', 'roupas-masculinas', 'roupas-infantis',
]);

const ORDENS_SUPABASE = {
  'custo-beneficio': 'score.desc,economia.desc',
  'qualidade': 'nota.desc.nullslast,vendas.desc.nullslast',
  'menor-preco': 'preco.asc',
};

const CAMPOS_SUPABASE =
  'id,plataforma,titulo,imagem,preco,preco_original,desconto,economia,frete_gratis,nota,vendas,link,categoria,atualizado_em';

function num(v) {
  if (v === undefined || v === null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 && n < 1e6 ? n : null;
}

function limparTexto(s) {
  return String(s || '')
    .replace(/[^\p{L}\p{N} \-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80);
}

/**
 * Pontuação equilibrada de custo-benefício (nota + vendas + desconto + preço justo).
 */
function scoreCustoBeneficio(item) {
  const nota = Number(item.nota) || 0;
  const vendas = Number(item.vendas) || 0;
  const desconto = Number(item.desconto) || 0;
  const notaPts = nota > 0 ? Math.min(45, (nota / 5) * 45) : 15;
  const vendasPts = vendas > 0 ? Math.min(35, Math.log10(vendas + 1) * 10.5) : 0;
  const descPts = Math.min(20, desconto * 0.45);
  return notaPts + vendasPts + descPts;
}

function ordenarLista(itens, ordem) {
  const copia = itens.slice();
  if (ordem === 'menor-preco') {
    copia.sort((a, b) => (a.preco || 0) - (b.preco || 0));
  } else if (ordem === 'qualidade') {
    copia.sort((a, b) => {
      const diffNota = (b.nota || 0) - (a.nota || 0);
      if (Math.abs(diffNota) >= 0.05) return diffNota;
      return (b.vendas || 0) - (a.vendas || 0);
    });
  } else {
    copia.sort((a, b) => scoreCustoBeneficio(b) - scoreCustoBeneficio(a));
  }
  return copia;
}

async function buscarNaShopee({ keyword, ordem, min, max, limit }) {
  const appId = (process.env.SHOPEE_APP_ID || '').trim();
  const secret = (process.env.SHOPEE_SECRET || '').trim();
  if (!appId || !secret) return null;

  // sortType Shopee: 1 = Relevância, 2 = Mais vendidos, 4 = Menor preço
  const sortType = ordem === 'menor-preco' ? 4 : ordem === 'qualidade' ? 2 : 1;
  const fetchLimit = Math.min(50, Math.max(24, limit * 2));

  const query = `
    query getProductOffers($keyword: String, $sortType: Int, $page: Int, $limit: Int) {
      productOfferV2(keyword: $keyword, sortType: $sortType, page: $page, limit: $limit) {
        nodes {
          itemId
          productName
          price
          priceMin
          priceDiscountRate
          imageUrl
          productLink
          offerLink
          sales
          ratingStar
        }
      }
    }
  `;

  const variables = { keyword, sortType, page: 1, limit: fetchLimit };
  const timestamp = Math.floor(Date.now() / 1000);
  const payload = JSON.stringify({ query, variables });
  const signature = crypto
    .createHash('sha256')
    .update(`${appId}${timestamp}${payload}${secret}`)
    .digest('hex');

  const r = await fetch(SHOPEE_GRAPHQL_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `SHA256 Credential=${appId},Timestamp=${timestamp},Signature=${signature}`,
      Accept: 'application/json',
    },
    body: payload,
  });

  if (!r.ok) throw new Error(`shopee_http_${r.status}`);
  const json = await r.json();
  const nodes = (json && json.data && json.data.productOfferV2 && json.data.productOfferV2.nodes) || [];

  const normalizados = nodes
    .map((n) => {
      const preco = Number(n.priceMin || n.price || 0);
      const desconto = Number(n.priceDiscountRate || 0);
      const precoOriginal =
        desconto > 0 && desconto < 95 ? Math.round((preco / (1 - desconto / 100)) * 100) / 100 : null;
      return {
        id: String(n.itemId),
        plataforma: 'shopee',
        titulo: String(n.productName || '').trim(),
        imagem: n.imageUrl || '/logo-pw.png',
        preco,
        preco_original: precoOriginal,
        desconto: desconto > 0 ? Math.round(desconto) : null,
        frete_gratis: false,
        nota: n.ratingStar ? Number(n.ratingStar) : null,
        vendas: n.sales ? Number(n.sales) : 0,
        link: n.offerLink || n.productLink,
      };
    })
    .filter((o) => {
      if (!o.titulo || !o.link || !(o.preco > 0)) return false;
      if (min !== null && o.preco < min) return false;
      if (max !== null && o.preco > max) return false;
      return true;
    });

  return ordenarLista(normalizados, ordem).slice(0, limit);
}

async function buscarNoSupabase({ keyword, categoria, ordem, min, max, limit }) {
  const base = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!base || !key) return [];

  const consultar = async (comTermo) => {
    const params = new URLSearchParams();
    params.set('select', CAMPOS_SUPABASE);
    if (CATEGORIAS.has(categoria)) params.set('categoria', `eq.${categoria}`);
    else params.set('categoria', 'not.is.null');

    if (min !== null && max !== null) params.set('and', `(preco.gte.${min},preco.lte.${max})`);
    else if (min !== null) params.set('preco', `gte.${min}`);
    else if (max !== null) params.set('preco', `lte.${max}`);

    if (comTermo && keyword) {
      const primeira = keyword.split(' ').filter((w) => w.length >= 3)[0] || keyword;
      params.set('titulo', `ilike.*${primeira}*`);
    }

    params.set('order', ORDENS_SUPABASE[ordem] || ORDENS_SUPABASE['custo-beneficio']);
    params.set('limit', String(limit));

    const r = await fetch(`${base}/rest/v1/site_vitrine?${params}`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    });
    if (!r.ok) throw new Error(`supabase_http_${r.status}`);
    return r.json();
  };

  let dados = await consultar(true);
  if ((!dados || dados.length < 3) && CATEGORIAS.has(categoria)) {
    dados = await consultar(false);
  }
  return Array.isArray(dados) ? dados : [];
}

module.exports = async (req, res) => {
  const q = req.query || {};
  const keyword = limparTexto(q.q || q.busca || '');
  const categoria = String(q.categoria || '');
  const ordem = ['custo-beneficio', 'menor-preco', 'qualidade'].includes(String(q.ordem))
    ? String(q.ordem)
    : 'custo-beneficio';
  const min = num(q.min);
  const max = num(q.max);
  const limit = Math.min(24, Math.max(4, Number(q.limit) || 12));

  if (!keyword && !CATEGORIAS.has(categoria)) {
    res.status(400).json({ erro: 'parametro_obrigatorio' });
    return;
  }

  try {
    let fonte = 'shopee';
    let ofertas = null;

    if (keyword) {
      try {
        ofertas = await buscarNaShopee({ keyword, ordem, min, max, limit });
      } catch (_) {
        ofertas = null;
      }
    }

    if (!ofertas || ofertas.length === 0) {
      fonte = 'vitrine';
      ofertas = await buscarNoSupabase({ keyword, categoria, ordem, min, max, limit });
    }

    res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate=900');
    res.status(200).json({ fonte, ordem, ofertas });
  } catch (e) {
    res.status(502).json({ erro: 'indisponivel', ofertas: [] });
  }
};
