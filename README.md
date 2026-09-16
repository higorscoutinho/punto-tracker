# 🚗 Punto Tracker

Site simples para acompanhar o carnê de 36x do Fiat Punto Preto: progresso,
parcelas, comprovantes e um carrinho 3D — um ícone bem pequeno, parado,
que só se mexe (dá um "pulinho" pra frente) quando você marca uma parcela
como paga. Tudo em HTML/CSS/JS puro — sem build, sem servidor, dá pra
hospedar de graça no GitHub Pages.

## Como funciona

Só duas páginas:

- **Painel** (`index.html`) — progresso geral (com o carrinho-ícone ao lado
  da barra) e, atrás do botão "⚙️ Configurações", os dados do veículo, a
  geração das parcelas e a sincronização entre aparelhos.
- **Pagamentos** (`pagamentos.html`) — lista das 36 parcelas. Clique em
  "Marcar pago" pra quitar (fica pago na hora, sem confirmação extra) ou no
  ícone da câmera pra anexar/ver o comprovante.

Os dados ficam salvos no `localStorage` do navegador. Se você quiser acessar
do celular e do computador ao mesmo tempo, dá pra ligar uma sincronização
opcional que usa um **Gist privado do GitHub** como "banco de dados" pessoal
— sem precisar de servidor nenhum. Com a sincronização ligada, o site já
busca os dados mais recentes sozinho sempre que você volta pra aba (troca de
app no celular, destrava a tela, alt-tab no PC) — não precisa lembrar de
apertar "Sincronizar" toda vez.

## Publicando no GitHub Pages

1. Crie um repositório novo no GitHub (pode ser privado ou público — os
   dados do carnê **não** ficam no repositório, só o código do site).
2. Suba todos os arquivos desta pasta pra raiz do repositório (`index.html`,
   `pagamentos.html`, as pastas `css/` e `js/`).
3. No repositório, vá em **Settings → Pages**.
4. Em **Build and deployment**, escolha **Deploy from a branch**, selecione a
   branch `main` e a pasta `/ (root)`. Salve.
5. Em alguns minutos o GitHub mostra o link do site (algo como
   `https://seu-usuario.github.io/nome-do-repo/`).

Se preferir usar `git` pelo terminal:

```bash
cd punto-tracker
git init
git add .
git commit -m "Punto Tracker"
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/SEU-REPO.git
git push -u origin main
```

## Ativando a sincronização entre aparelhos (opcional)

Isso permite ver e marcar os pagamentos tanto no celular quanto no PC.

1. No site, abra **Painel → ⚙️ Configurações**.
2. Crie um **Personal access token (classic)** no GitHub:
   `Settings → Developer settings → Personal access tokens → Tokens (classic)
   → Generate new token (classic)`. Marque **apenas** o escopo `gist` e gere.
3. Cole o token em Ajustes e clique em **"Criar novo Gist"** no primeiro
   aparelho.
4. No segundo aparelho (ex: celular), abra o mesmo site, cole o **mesmo
   token** (ou gere outro) e o **ID do Gist** (aparece em Ajustes depois de
   criado) e clique em **"Conectar a este Gist"**.

Pronto — os dois aparelhos passam a ler/escrever no mesmo Gist.

**Sobre segurança:** o token fica salvo só no `localStorage` do navegador,
nunca é enviado a nenhum lugar além de `api.github.com`. Ele só tem
permissão de "gist" (não dá acesso aos seus repositórios). O Gist é criado
como **secreto** (não aparece em buscas, mas não é 100% privado — quem tiver
o link consegue ver). Evite compartilhar o ID do Gist.

**Sobre comprovantes:** cada comprovante (foto/PDF) é comprimido no
navegador antes de subir, mas ainda assim ocupa espaço no Gist. Se você
anexar muitas fotos grandes, a sincronização fica mais lenta — nada quebra,
só demora um pouco mais.

**Sem sincronização:** se preferir não configurar nada, o site funciona
normalmente, só que os dados ficam presos naquele navegador/aparelho. Dá pra
usar o botão **Exportar backup** em Ajustes de vez em quando pra não perder
nada.

## Customizando

- **Cores/estilo**: tudo centralizado em `css/style.css`, nas variáveis do
  `:root` (`--navy-900`, `--gold`, etc.).
- **O carrinho 3D**: é o modelo real do Fiat Punto
  (`assets/models/fiat-punto.glb`, modelo de bimboit34 no Sketchfab, licença
  CC-BY-4.0), repintado de preto no próprio arquivo, mostrado como um ícone
  pequeno e parado (rodas não giram, sem câmera girando ao redor) — ele só
  anima quando o progresso muda: dá um pulinho pra frente na "pista" curta
  dentro do próprio card, e solta uma chuvinha de confetes quando chega em
  100%. Se o modelo não carregar por algum motivo, `js/car3d.js` cai
  automaticamente num carrinho simples feito só de formas geométricas, pra
  nunca ficar com o ícone vazio. Dá pra ajustar esse comportamento mexendo
  nesse arquivo (função `createPuntoIcon`).
- **Créditos do modelo 3D**: "Fiat Punto 2.0" por bimboit34
  (https://sketchfab.com/bimboit34), licença Creative Commons
  Attribution (CC-BY-4.0). Se for publicar o site, vale manter esse crédito
  em algum canto (ex: neste README ou num rodapé).
- **Número de parcelas / valores**: tudo isso é configurado pela própria
  interface em Ajustes, não precisa editar código.

## Estrutura de arquivos

```
punto-tracker/
├── index.html           → Painel (dashboard + carro 3D + configurações)
├── pagamentos.html      → Lista de parcelas
├── css/
│   └── style.css
├── assets/
│   └── models/
│       └── fiat-punto.glb  → modelo 3D real, repintado de preto
└── js/
    ├── utils.js          → formatação, toasts, compressão de imagem
    ├── storage.js        → modelo de dados local
    ├── sync.js           → sincronização via GitHub Gist
    ├── car3d.js          → cena 3D do carro (Three.js)
    ├── painel.js
    ├── pagamentos.js
    └── vendor/
        ├── three.min.js    → Three.js embutido (sem depender de CDN)
        └── GLTFLoader.js   → carregador do modelo 3D
```
