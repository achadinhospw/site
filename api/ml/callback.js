// Retorno do login do Mercado Livre (OAuth).
// Fase atual: o app ainda está em aprovação. Esta rota só confirma que existe
// e NUNCA exibe, registra ou guarda o código recebido.
// A troca do código por token entra quando o App ID/Secret estiverem no Vercel.
module.exports = (req, res) => {
  const ok = typeof (req.query || {}).code === 'string';
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.status(200).send(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Mercado Livre · AchadinhosPW</title><link rel="stylesheet" href="/style.css"></head>
<body><div class="wrap"><header class="top"><img src="/logo-pw.png" alt="Logo PW"><a href="/">AchadinhosPW</a></header>
<h1>Conexão com o Mercado Livre</h1>
<p class="lead">${ok ? 'Autorização recebida. A conexão será concluída pelo sistema.' : 'Esta é a página de retorno da conexão com o Mercado Livre usada pelo AchadinhosPW.'}</p>
<p class="small">Uso somente leitura de dados públicos de produtos para curadoria de ofertas. <a href="/privacidade">Política de Privacidade</a></p>
</div></body></html>`);
};
