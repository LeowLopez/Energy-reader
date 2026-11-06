# ExtraiConta

Aplicação web para ler faturas de energia e revisar os dados extraídos. PDFs,
resultados e configurações são processados localmente no navegador e não são
enviados a um servidor.

## Requisitos

- Node.js 18 ou superior
- npm

## Desenvolvimento

```bash
npm ci
npm run dev
```

Abra o endereço local informado pelo Vite.

## Testes e build

```bash
npm test
npm run build
```

O build de produção é gerado em `dist/`. O deploy no GitHub Pages é feito pelo
workflow [pages.yml](./.github/workflows/pages.yml) a cada push para `main`.
Para a primeira publicação, configure **Settings > Pages > GitHub Actions** no
repositório.

## Leitura de faturas

- PDFs com texto selecionável são lidos diretamente no navegador.
- Páginas digitalizadas usam OCR em português e inglês. Na primeira utilização,
  é necessário carregar o mecanismo e os modelos; a tela **Configuração**
  permite preparar o OCR para uso offline.
- As medições são identificadas pelo número do medidor, pela grandeza
  (`ENRG ATV`, `DEMANDA` ou `ENRG RTV`) e pelo posto horário. O leitor ignora os
  três números de registro e usa o valor seguinte. Consumo fora de ponta soma
  as linhas correspondentes; os demais campos usam a primeira correspondência.
- Demandas contratadas são extraídas dos valores identificados na fatura.
- Campos ausentes permanecem sem valor. Confira as linhas de origem e revise
  valores e separadores decimais antes de copiar.

O número do medidor pode ser alterado em **Configuração**. Preferências e
regras ficam no armazenamento local do navegador; use **Exportar regras** para
fazer backup ou transferi-las para outro dispositivo.

## Instalação e privacidade

A aplicação pode ser instalada pelo Edge ou Chrome quando aberta pela página
publicada em HTTPS. O navegador verifica atualizações do service worker quando
há conexão, por exemplo ao abrir o app ou visitar o site, e baixa a nova versão
em segundo plano. Seguindo o ciclo padrão do navegador, a versão nova é ativada
depois que as janelas abertas do app antigo forem fechadas. Sem internet, o app
usa a última versão armazenada em cache e verifica atualizações quando voltar a
ficar online. Para leitura de PDFs digitalizados offline, acesse a aplicação e
prepare o OCR online antes de desconectar. Instalação PWA e cache offline não
estão disponíveis ao abrir os arquivos diretamente via `file://`.

Faturas variam de formato, e a leitura automática não garante resultados
universais. PDFs protegidos, danificados ou de baixa qualidade podem não ser
processados corretamente.

Consulte o [tutorial](./tutorial.html) para mais instruções.
