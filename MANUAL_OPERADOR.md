# Whatch Pro OS - Manual do Operador (v1.4)

Manual focado no uso diario (Caixa, Estoquista e Operador). Para configuracoes, usuarios e integracoes use o **Manual do Administrador**.

---

## Sumario
- [1. Acesso rapido](#1-acesso-rapido)
- [2. Clientes](#2-clientes)
- [3. Estoque e Produtos](#3-estoque-e-produtos)
- [4. PDV (Frente de Caixa)](#4-pdv-frente-de-caixa)
  - [4.1 Fluxo de venda (passo a passo)](#41-fluxo-de-venda-passo-a-passo)
  - [4.2 Atalhos (teclado)](#42-atalhos-teclado)
  - [4.3 Impressao e segunda via](#43-impressao-e-segunda-via)
  - [4.4 Estorno de venda](#44-estorno-de-venda)
- [5. Rotinas por segmento](#5-rotinas-por-segmento)
  - [5.1 Supermercado (Caixa)](#51-supermercado-caixa)
  - [5.2 Supermercado (Estoquista)](#52-supermercado-estoquista)
  - [5.3 Oficina (Tecnico/Atendente)](#53-oficina-tecnicoatendente)
- [6. Problemas comuns (FAQ)](#6-problemas-comuns-faq)

---

## 1. Acesso rapido
- Acesse o sistema e faca login com seu e-mail e senha.
- Se aparecer mensagem de sessao expirada, faca login novamente.
- Se voce nao consegue ver um modulo, seu usuario pode nao ter permissao.

## 2. Clientes
Uso tipico:
- Cadastrar cliente: Nome, documento (CPF/CNPJ), telefone e endereco (opcional).
- Buscar cliente: use a barra de busca por nome ou documento.

Exemplo:
- Nome: Joao da Silva
- CPF: 123.456.789-00
- Telefone: (11) 99999-9999

## 3. Estoque e Produtos
Regras basicas:
- Produto com estoque 0 nao aparece para venda no PDV.
- Sempre que possivel preencha o SKU/codigo (ajuda na bipagem).

Passo a passo (cadastro de produto):
- Abra Estoque/Produtos.
- Clique em Novo Produto.
- Preencha nome, SKU (codigo), preco e quantidade em estoque.

Exemplo:
- Nome: Arroz Tipo 1 5kg
- SKU: 7890001112223
- Preco: 29,90
- Estoque: 50

## 4. PDV (Frente de Caixa)
Tela de venda rapida para supermercado e atendimento de balcao.

### 4.1 Fluxo de venda (passo a passo)
- Abra PDV.
- (Opcional) Selecione o cliente.
- No campo de busca:
  - Digite o SKU e pressione Enter, ou
  - Digite parte do nome e clique no produto na lista.
- Ajuste quantidades no carrinho (botoes + e -).
- Selecione a forma de pagamento.
- Finalize a venda (botao Finalizar Venda, Enter ou F9).

Dica (quantidade rapida):
- No campo de busca digite `3x7890001112223` e pressione Enter.

### 4.2 Atalhos (teclado)
- F2: focar na busca
- F4: limpar cupom (carrinho + cliente + recebido)
- F6: abrir/fechar historico
- F7: pagamento Pix
- F8: pagamento Dinheiro
- F10: pagamento Credito
- F11: pagamento Debito
- Enter ou F9: finalizar venda
- ↑ / ↓: selecionar item do carrinho
- + / -: aumentar/diminuir quantidade do item selecionado
- Delete: remover item selecionado
- Esc: sair do historico

### 4.3 Impressao e segunda via
- Auto: use o botao **Auto** para imprimir automaticamente ao finalizar.
- Segunda via: no **Historico**, clique em **Imprimir** na venda desejada.
Observacao: se o navegador bloquear popup, permita popups para o site.

### 4.4 Estorno de venda
No historico voce pode estornar uma venda.
O estorno:
- Marca a venda como estornada
- Devolve o estoque dos itens
- Registra movimento de estoque
- Gera um lancamento financeiro em Estornos

## 5. Rotinas por segmento

### 5.1 Supermercado (Caixa)
Objetivo: vender rapido e emitir cupom.
- Abra PDV.
- Bipe 3 itens (SKU + Enter).
- Ajuste 1 item para quantidade 2.
- Selecione Dinheiro (F8), preencha recebido e confira troco.
- Finalize (Enter/F9).
- Imprima cupom (Auto ou botao imprimir no historico).

### 5.2 Supermercado (Estoquista)
Objetivo: manter estoque correto.
- Cadastre produtos com SKU e preco.
- Ajuste estoque quando chegar mercadoria.
- Confira itens com estoque baixo e reponha.

### 5.3 Oficina (Tecnico/Atendente)
Objetivo: registrar atendimento e pecas.
- Cadastre cliente.
- Cadastre pecas (produtos) com estoque.
- Abra OS/Chamado (quando habilitado no seu segmento).
- Vincule pecas usadas e confirme a baixa de estoque.
- Gere orcamento/valor do servico e encaminhe ao cliente.

## 6. Problemas comuns (FAQ)
- Produto nao aparece no PDV:
  - Verifique se o estoque esta maior que 0.
  - Verifique se o produto foi cadastrado corretamente.
- Nao consigo imprimir:
  - Libere popups no navegador e tente novamente.
- Nao vejo uma tela no menu:
  - Peca ao Admin para habilitar o modulo/permissao do seu usuario.

