# Como publicar o app Novaki na Vercel

## Passo 1 — Criar um repositório no GitHub (uma vez só)
1. Acesse github.com e crie uma conta gratuita, se ainda não tiver
2. Clique em "New repository", dê um nome (ex: `novaki-agendamento`) e crie
3. Na página do repositório vazio, clique em "uploading an existing file"
4. Arraste TODOS os arquivos e pastas desse projeto (mantendo a estrutura de pastas `src/` e `api/`) e clique em "Commit changes"

## Passo 2 — Conectar na Vercel
1. Acesse vercel.com e crie uma conta gratuita (pode entrar direto com o GitHub)
2. Clique em "Add New" → "Project"
3. Selecione o repositório `novaki-agendamento` que você criou
4. Clique em "Deploy" (não precisa mudar nenhuma configuração)

## Passo 3 — Criar o banco de dados (para os agendamentos ficarem salvos de verdade)
1. Dentro do projeto na Vercel, vá na aba "Storage"
2. Clique em "Create Database" → escolha "KV"
3. Depois de criado, clique em "Connect Project" e selecione seu projeto
4. Isso conecta tudo automaticamente — não precisa copiar nenhuma senha

## Passo 4 (opcional) — Ativar o envio automático pro Google Agenda
Se você já configurou as credenciais do Google (Client ID, Client Secret, Refresh Token):
1. Vá em "Settings" → "Environment Variables" no projeto da Vercel
2. Adicione: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN`, `GOOGLE_CALENDAR_ID` (use `primary`)
3. Volte na aba "Deployments" e clique nos "..." do último deploy → "Redeploy"
4. Abra o arquivo `src/App.jsx`, procure por `BACKEND_CALENDAR_URL` e coloque a URL do seu projeto seguida de `/api/create-event` (ex: `https://novaki-agendamento.vercel.app/api/create-event`)
5. Suba esse arquivo atualizado no GitHub — a Vercel republica sozinha

## Pronto!
Depois do Passo 3, sua URL (algo como `https://novaki-agendamento.vercel.app`) já é
o link definitivo do app — funciona para qualquer pessoa, sem precisar de conta na Claude
nem na Vercel. Toda vez que você quiser mudar algo, é só me pedir aqui no chat e eu atualizo
os arquivos; depois é só subir de novo no GitHub.
