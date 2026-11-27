(function () {
  // ── Links Oficiais da Comunidade (troque aqui quando tiver o convite do grupo) ──
  // Exemplo: const WHATSAPP_GROUP_URL = 'https://chat.whatsapp.com/SEU_CODIGO_AQUI';
  const WHATSAPP_GROUP_URL = '';
  const INSTAGRAM_URL = 'https://www.instagram.com/pwachadinhos/';

  // Conecta todos os botões de WhatsApp do site e do blog automaticamente
  document.querySelectorAll('[data-wa-link]').forEach((el) => {
    if (WHATSAPP_GROUP_URL) {
      el.setAttribute('href', WHATSAPP_GROUP_URL);
      el.setAttribute('target', '_blank');
      el.setAttribute('rel', 'noopener noreferrer');
    } else {
      el.setAttribute('href', INSTAGRAM_URL);
      el.setAttribute('target', '_blank');
      el.setAttribute('rel', 'noopener noreferrer');
      el.addEventListener('click', (e) => {
        const aviso = document.getElementById('wa-aviso');
        if (aviso) {
          e.preventDefault();
          aviso.hidden = false;
          aviso.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      });
    }
  });

  // ── Aparência e Paletas (salvas no navegador) ──
  const modeDark = document.getElementById('mode-dark');
  const palRadios = document.querySelectorAll('input[name="palette"]');
  const themePicker = document.querySelector('.theme-picker');

  try {
    if (modeDark && localStorage.getItem('pw-dark') === '0') modeDark.checked = false;
    const savedPal = localStorage.getItem('pw-palette');
    if (savedPal) {
      const target = document.getElementById(savedPal);
      if (target) target.checked = true;
    }
  } catch (_) {}

  if (modeDark) {
    modeDark.addEventListener('change', () => {
      try { localStorage.setItem('pw-dark', modeDark.checked ? '1' : '0'); } catch (_) {}
    });
  }
  palRadios.forEach((r) => {
    r.addEventListener('change', () => {
      if (r.checked) {
        try { localStorage.setItem('pw-palette', r.id); } catch (_) {}
      }
    });
  });

  if (themePicker) {
    document.addEventListener('click', (e) => {
      if (themePicker.open && !themePicker.contains(e.target)) themePicker.open = false;
    });
  }

  // ── Helpers compartilhados de Card de Oferta ──
  const brl = (v) => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const lojaNome = { shopee: 'Shopee', mercado_livre: 'Mercado Livre', amazon: 'Amazon' };

  function criarCardOferta(o) {
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
    tag.textContent = lojaNome[o.plataforma] || o.plataforma || 'Oferta';
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

  // ── 1) Vitrine Principal (#vitrine) ──
  const raiz = document.getElementById('vitrine');
  if (raiz) {
    const lista = document.getElementById('lista');
    const status = document.getElementById('status');
    const form = document.getElementById('filtros');
    const btnLupa = document.getElementById('btn-lupa');
    const painelFiltros = document.getElementById('painel-filtros');
    const btnFechar = document.getElementById('btn-fechar-filtros');
    const btnLimpar = document.getElementById('btn-limpar-filtros');
    const campoBusca = form ? form.querySelector('input[name="busca"]') : null;

    function setPainelAberto(aberto) {
      if (!painelFiltros || !btnLupa) return;
      painelFiltros.hidden = !aberto;
      btnLupa.setAttribute('aria-expanded', aberto ? 'true' : 'false');
      if (aberto && campoBusca) campoBusca.focus();
    }

    function atualizarIndicadorFiltro() {
      if (!btnLupa || !form) return;
      const fd = new FormData(form);
      const ativo =
        Boolean((fd.get('busca') || '').toString().trim()) ||
        Boolean(fd.get('loja')) ||
        Boolean(fd.get('min')) ||
        Boolean(fd.get('max')) ||
        fd.get('ordem') !== 'custo-beneficio';
      btnLupa.classList.toggle('tem-filtro', ativo);
    }

    if (btnLupa && painelFiltros) {
      btnLupa.addEventListener('click', () => setPainelAberto(painelFiltros.hidden));
    }
    if (btnFechar) {
      btnFechar.addEventListener('click', () => setPainelAberto(false));
    }
    if (btnLimpar && form) {
      btnLimpar.addEventListener('click', () => {
        form.reset();
        atualizarIndicadorFiltro();
        carregar();
      });
    }
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && painelFiltros && !painelFiltros.hidden) {
        setPainelAberto(false);
      }
    });

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
      document.title = `${nome} em oferta · PW Achadinhos`;
      const h1 = document.querySelector('h1');
      const lead = document.querySelector('.lead');
      if (h1) h1.textContent = nome;
      if (lead) lead.textContent = desc;
      const md = document.querySelector('meta[name=description]');
      if (md) md.setAttribute('content', desc);
    }
    document.querySelectorAll('.cats a').forEach((a) => {
      const alvo = a.getAttribute('href').replace(/^\/+|\/+$/g, '');
      a.classList.toggle('ativo', alvo === categoriaFixa);
    });

    let debounceTimer = null;

    async function carregar() {
      atualizarIndicadorFiltro();
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
        ofertas.forEach((o) => lista.appendChild(criarCardOferta(o)));
      } catch (e) {
        status.textContent = 'Não foi possível carregar as ofertas agora. Tente de novo em instantes.';
      }
    }

    form.addEventListener('change', carregar);
    if (campoBusca) {
      campoBusca.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(carregar, 350);
      });
    }
    form.addEventListener('submit', (e) => { e.preventDefault(); carregar(); });
    carregar();
  }

  // ── 2) Vitrines Interativas dos Artigos do Blog ([data-blog-vitrine]) ──
  document.querySelectorAll('[data-blog-vitrine]').forEach((sec) => {
    const lista = sec.querySelector('[data-blog-lista]');
    const status = sec.querySelector('[data-blog-status]');
    const chips = sec.querySelectorAll('[data-modelo-q]');
    const tabsOrdem = sec.querySelectorAll('[data-ordem]');
    const buscaInput = sec.querySelector('[data-blog-busca]');

    let termoAtual = sec.getAttribute('data-q') || '';
    const categoria = sec.getAttribute('data-categoria') || '';
    const min = sec.getAttribute('data-min') || '';
    const max = sec.getAttribute('data-max') || '';
    let ordemAtual = 'custo-beneficio';
    let timer = null;

    const rotuloOrdem = {
      'custo-beneficio': 'melhor custo-benefício',
      'menor-preco': 'menor preço',
      'qualidade': 'melhor qualidade',
    };

    async function carregarBlog() {
      if (!lista || !status) return;
      const p = new URLSearchParams();
      if (termoAtual) p.set('q', termoAtual);
      if (categoria) p.set('categoria', categoria);
      if (min) p.set('min', min);
      if (max) p.set('max', max);
      p.set('ordem', ordemAtual);
      p.set('limit', '12');

      status.textContent = `Buscando opções em ${rotuloOrdem[ordemAtual]}…`;
      lista.replaceChildren();

      try {
        const r = await fetch(`/api/buscar?${p}`);
        const data = await r.json();
        const ofertas = data.ofertas || [];
        if (!ofertas.length) {
          status.textContent = 'Nenhum modelo encontrado para esse filtro agora. Tente outro modelo acima ou confira a vitrine completa.';
          return;
        }
        const origem = data.fonte === 'shopee' ? 'Shopee ao vivo' : 'vitrine PW';
        status.textContent = `${ofertas.length} opções (${origem}) · ordenado por ${rotuloOrdem[ordemAtual]}`;
        ofertas.forEach((o) => lista.appendChild(criarCardOferta(o)));
      } catch (_) {
        status.textContent = 'Não foi possível carregar os produtos agora. Tente novamente em instantes.';
      }
    }

    chips.forEach((btn) => {
      btn.addEventListener('click', () => {
        chips.forEach((c) => c.classList.remove('ativo'));
        btn.classList.add('ativo');
        termoAtual = btn.getAttribute('data-modelo-q') || '';
        if (buscaInput) buscaInput.value = '';
        carregarBlog();
      });
    });

    tabsOrdem.forEach((btn) => {
      btn.addEventListener('click', () => {
        tabsOrdem.forEach((t) => t.classList.remove('ativo'));
        btn.classList.add('ativo');
        ordemAtual = btn.getAttribute('data-ordem') || 'custo-beneficio';
        carregarBlog();
      });
    });

    if (buscaInput) {
      buscaInput.addEventListener('input', () => {
        clearTimeout(timer);
        timer = setTimeout(() => {
          const val = buscaInput.value.trim();
          if (val) {
            chips.forEach((c) => c.classList.remove('ativo'));
            termoAtual = val;
          } else {
            termoAtual = sec.getAttribute('data-q') || '';
            if (chips[0]) chips[0].classList.add('ativo');
          }
          carregarBlog();
        }, 400);
      });
    }

    carregarBlog();
  });
})();
