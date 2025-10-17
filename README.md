# 🧪 Teste de Carga via Console do Navegador

Este script permite realizar **testes de carga simples** diretamente pelo **console do navegador**, sem precisar de ferramentas externas.  
Ele dispara várias requisições HTTP em paralelo para a página atual, mede tempos de resposta e exibe estatísticas no console.

---

## 🚀 Como usar

### 1️⃣ Abra a página que deseja testar

- Vá até o site ou rota que você quer medir o desempenho (precisa estar autenticado se for um endpoint protegido).

### 2️⃣ Abra o Console do Navegador

- Atalho:
  - **Windows/Linux:** `Ctrl + Shift + J`
  - **macOS:** `Cmd + Option + J`

### 3️⃣ Cole o código completo

Cole o script abaixo no console e pressione **Enter**:

```js
(async () => {
  // --- Script completo aqui ---
})();
```

> 💡 Dica: Certifique-se de copiar todo o código de forma completa, sem cortes.

---

## ⚙️ Configurações principais

No topo do script, você pode ajustar os seguintes parâmetros:

```js
const totalRequests = 80; // total de requisições a enviar
const concurrency = 10; // número de requisições simultâneas
const waitBetweenMs = 0; // atraso entre requisições sequenciais (ms)
const readBody = false; // true: lê o corpo; false: só verifica o status
const timeoutMs = 20000; // tempo máximo de espera (ms)
```

- `totalRequests`: define quantas requisições no total serão feitas.
- `concurrency`: quantas delas rodam **ao mesmo tempo**.
- `readBody`: se `true`, lê a resposta completa (mais lento, útil para validar conteúdo).
- `timeoutMs`: cancela a requisição se demorar demais.

---

## 🔑 Autenticação automática

O script tenta **detectar automaticamente tokens** de autenticação:

- Busca em:
  - `localStorage`
  - `sessionStorage`
  - `cookies`
  - `meta tags`
  - variáveis globais (`window.__USER__`, `window.Auth`, etc.)

Se encontrar algo que pareça um **JWT ou token de acesso**, ele o usa automaticamente no header:

```
Authorization: Bearer <token>
```

> Caso nenhum token seja encontrado, o teste segue sem autenticação.

---

## 📊 Resultado e estatísticas

Ao finalizar, o console exibirá:

### ✅ Resumo principal

Uma tabela parecida com isto:

```
--- RESULTADO ---
┌───────────────┬────────────┐
│ url           │ Endereço   │
│ totalRequests │ 80         │
│ succeeded     │ 80         │
│ failed        │ 0          │
│ totalTimeMs   │ 4521       │
│ avgMs         │ 56         │
│ minMs         │ 34         │
│ maxMs         │ 182        │
│ concurrency   │ 10         │
└───────────────┴────────────┘
```

### 📋 Detalhes individuais

Também é mostrado um array com os primeiros resultados:

```
Detalhes (primeiros 200 registros): [ { seq: 1, workerId: 1, status: 200, time: 58, ok: true, ... }, ... ]
```

---

## 🔍 Inspecionar dados manualmente

Após a execução, os resultados ficam disponíveis em variáveis globais:

```js
window.__f5_test_summary; // resumo geral
window.__f5_test_results; // todos os resultados individuais
```

Você pode, por exemplo:

```js
console.table(window.__f5_test_results);
```

ou exportar:

```js
copy(JSON.stringify(window.__f5_test_results, null, 2));
```

---

## 💡 Dicas de uso

- Ideal para **testes rápidos de performance de API ou frontend** autenticado.
- Execute em **ambiente de staging ou homologação**, **nunca** em produção.
- Ajuste `concurrency` e `totalRequests` conforme a capacidade do servidor.
- Se a API exigir login, **faça login primeiro** antes de rodar o script.

---

## ⚠️ Aviso

Este script é apenas para **testes controlados**.
# requisition-test
# requisition-test
