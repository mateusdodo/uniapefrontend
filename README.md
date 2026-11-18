# UniApê — Frontend

## Rodar localmente
1. `npm install`
2. `cp .env.example .env` e cole sua chave anon do Supabase nas duas linhas de chave.
3. Deixe o backend rodando em http://localhost:3000 (pasta uniape-backend: `npm run dev`).
4. Em outro terminal: `npm run dev` e abra o endereço mostrado (geralmente http://localhost:8080).

Sem `UNIAPE_API_URL`, o site funciona sozinho direto no Supabase.

## Subir ao GitHub
```bash
git init && git add . && git commit -m "UniApê frontend"
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/uniapefrontend.git
git push -u origin main
```
