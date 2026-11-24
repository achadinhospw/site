(function () {
  const raiz = document.getElementById('vitrine');
  if (!raiz) return;
  const lista = document.getElementById('lista');
  const status = document.getElementById('status');
  const form = document.getElementById('filtros');
  const NICHOS = {
    'notebooks': ['Notebooks', 'Os melhores notebooks em oferta, ranqueados por custo-benefício, qualidade e preço.'],
    'celulares': ['Celulares', 'Celulares e smartphones com desconto conferido no histórico de preço.'],
    'relogios': ['Relógios e smartwatches', 'Smartwatches e relógios com desconto de verdade.'],
    'tablets': ['Tablets', 'Tablets em oferta para estudo, trabalho e diversão.'],
    'roupas-femininas': ['Roupas femininas', 'Vestidos, blusas, conjuntos e mais, com desconto conferido.'],
    'roupas-masculinas': ['Roupas masculinas', 'Camisetas, bermudas, calças e mais, com desconto conferido.'],
    'roupas-infantis': ['Roupas infantis', 'Roupas para crianças e bebês com desconto conferido.'],
  };
  const slug = location.pathname.replace(/^\/+|\/+$/g, '');
  const categoriaFixa = NICHOS[slug] ? slug : '';
  if (categoriaFixa) {
    const [nome, desc] = NICHOS[categoriaFixa];
    document.title = `${nome} em oferta · AchadinhosPW`;
    document.querySelector('h1').textContent = nome;
    document.querySelector('.lead').textContent = desc;
    const md = document.querySelector('meta[name=description]');
    if (md) md.setAttribute('content', desc);
  }
  document.querySelectorAll('.cats a').forEach((a) => {
    const alvo = a.getAttribute('href').replace(/^\/+|\/+$/g, '');
    a.classList.toggle('ativo', alvo === categoriaFixa);
  });

  const brl = (v) => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const loja = { shopee: 'Shopee', mercado_livre: 'Mercado Livre', amazon: 'Amazon' };

  function card(o) {
    const el = document.createElement('article');
    el.className = 'oferta';

    const img = document.createElement('img');
    img.src = o.imagem || '/logo-pw.png';
    img.alt = o.titulo;
    img.loading = 'lazy';
    img.referrerPolicy = 'no-referrer';
    el.appendChild(img);

    if (o.desconto) {
      const b = document.createElement('span');
      b.className = 'selo';
      b.textContent = `-${o.desconto}%`;
      el.appendChild(b);
    }

    const corpo = document.createElement('div');
    corpo.className = 'corpo';

    const tag = document.createElement('span');
    tag.className = 'loja';
    tag.textContent = loja[o.plataforma] || o.plataforma;
    corpo.appendChild(tag);

    const h = document.createElement('h3');
    h.textContent = o.titulo;
    corpo.appendChild(h);

    if (o.preco_original && Number(o.preco_original) > Number(o.preco)) {
      const de = document.createElement('s');
      de.textContent = brl(o.preco_original);
      corpo.appendChild(de);
    }
    const por = document.createElement('strong');
    por.className = 'preco';
    por.textContent = brl(o.preco);
    corpo.appendChild(por);

    const meta = document.createElement('p');
    meta.className = 'meta';
    const partes = [];
    if (o.nota) partes.push(`★ ${Number(o.nota).toFixed(1)}`);
    if (o.vendas) partes.push(`${Number(o.vendas).toLocaleString('pt-BR')} vendidos`);
    if (o.frete_gratis) partes.push('frete grátis');
    meta.textContent = partes.join(' · ');
    corpo.appendChild(meta);

    const a = document.createElement('a');
    a.className = 'botao';
    a.href = o.link;
    a.target = '_blank';
    a.rel = 'sponsored nofollow noopener noreferrer';
    a.textContent = 'Ver oferta';
    corpo.appendChild(a);

    el.appendChild(corpo);
    return el;
  }

  async function carregar() {
    const p = new URLSearchParams(new FormData(form));
    if (categoriaFixa) p.set('categoria', categoriaFixa);
    for (const [k, v] of [...p]) if (!v) p.delete(k);
    status.textContent = 'Carregando ofertas…';
    lista.replaceChildren();
    try {
      const r = await fetch(`/api/ofertas?${p}`);
      const { ofertas } = await r.json();
      if (!ofertas || !ofertas.length) {
        status.textContent = categoriaFixa
          ? 'Ainda não temos ofertas conferidas nesta categoria. Novas ofertas entram todos os dias.'
          : 'Nenhuma oferta encontrada com esses filtros.';
        return;
      }
      status.textContent = `${ofertas.length} ofertas conferidas`;
      ofertas.forEach((o) => lista.appendChild(card(o)));
    } catch (e) {
      status.textContent = 'Não foi possível carregar as ofertas agora. Tente de novo em instantes.';
    }
  }

  form.addEventListener('change', carregar);
  form.addEventListener('submit', (e) => { e.preventDefault(); carregar(); });
  carregar();
})();
