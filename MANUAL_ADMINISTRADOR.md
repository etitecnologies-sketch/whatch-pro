# Whatch Pro OS - Manual do Administrador (v1.4)

Manual para Admin Master e implantacao. Aqui ficam configuracoes, usuarios, permissoes, empresa, modulos e integracoes.

---

## Sumario
- [1. Visao geral](#1-visao-geral)
- [2. Estrutura de usuarios e empresas](#2-estrutura-de-usuarios-e-empresas)
  - [2.1 Papéis (Mestre, Admin Master, Sub-usuario)](#21-papéis-mestre-admin-master-sub-usuario)
  - [2.2 Criar uma empresa (Mestre)](#22-criar-uma-empresa-mestre)
  - [2.3 Configurar empresa e modulos](#23-configurar-empresa-e-modulos)
- [3. Usuarios e permissoes](#3-usuarios-e-permissoes)
  - [3.1 Criar sub-usuarios](#31-criar-sub-usuarios)
  - [3.2 Perfis recomendados](#32-perfis-recomendados)
- [4. Configuracoes](#4-configuracoes)
  - [4.1 Empresa](#41-empresa)
  - [4.2 Aparencia](#42-aparencia)
  - [4.3 SEFAZ (NFC-e/NF-e)](#43-sefaz-nfc-enf-e)
  - [4.4 Integracoes (Asaas)](#44-integracoes-asaas)
- [5. PDV (administracao)](#5-pdv-administracao)
  - [5.1 Logo do cliente no PDV](#51-logo-do-cliente-no-pdv)
  - [5.2 Estorno e controle](#52-estorno-e-controle)
- [6. Multiempresa e seguranca](#6-multiempresa-e-seguranca)
- [7. Checklist de implantacao](#7-checklist-de-implantacao)
- [8. FAQ do administrador](#8-faq-do-administrador)

---

## 1. Visao geral
O Whatch Pro OS e multiempresa: cada empresa (tenant) tem seus proprios dados e usuarios.
O menu e as rotinas seguem os modulos ativos do segmento (tipo de empresa).

## 2. Estrutura de usuarios e empresas

### 2.1 Papéis (Mestre, Admin Master, Sub-usuario)
- Mestre (mestre@whatchpro.com): cria empresas, cria Admin Master e administra permissoes.
- Admin Master (Empresa): administrador principal do tenant. Pode editar empresa e criar usuarios.
- Sub-usuario: opera somente o que tiver permissao.

### 2.2 Criar uma empresa (Mestre)
Passo a passo:
- Entre como Mestre.
- Abra Usuarios.
- Clique em Novo Usuario e crie um Admin Master escolhendo Nova Empresa.
- Preencha dados basicos da empresa e selecione o Tipo de Empresa (segmento).

Exemplo (Oficina):
- Nome: Oficina Rodrigues
- CNPJ: 12.345.678/0001-90
- Segmento: Oficina Automotiva

### 2.3 Configurar empresa e modulos
Passo a passo (Admin Master):
- Entre com o Admin Master da empresa.
- Abra Configuracoes → Empresa.
- Ajuste:
  - Tipo de Empresa (segmento)
  - Modulos ativos (features) conforme a operacao
  - Dados cadastrais (nome, documento, endereco, contato)

## 3. Usuarios e permissoes

### 3.1 Criar sub-usuarios
Passo a passo:
- Abra Usuarios.
- Clique em Novo Usuario.
- Selecione Sub-usuario.
- Selecione um perfil (quando disponivel) e ajuste as permissoes finas.
- Selecione a empresa (Admin Master) correta.

### 3.2 Perfis recomendados
- Caixa: PDV + Clientes
- Estoquista: Produtos/Estoque
- Financeiro: Financeiro/Relatorios
- Tecnico (Oficina): OS/Chamados + Estoque (se precisar)

## 4. Configuracoes

### 4.1 Empresa
- Admin Master edita a propria empresa em Configuracoes → Empresa.
- Mestre pode selecionar uma empresa e editar.
Sugestao:
- Sempre valide o segmento e os modulos apos a implantacao.

### 4.2 Aparencia
- Tema: claro/escuro.
- Cor de destaque: personalize a identidade visual.

### 4.3 SEFAZ (NFC-e/NF-e)
Use quando for emitir documentos fiscais.
- Configure os dados fiscais e certificados.
- Configure a Logo (URL) se quiser mostrar no PDV e em documentos.

### 4.4 Integracoes (Asaas)
Use para cobrancas e sincronizacao financeira, quando habilitado.
- Informe token/chaves conforme orientacao da implantacao.

## 5. PDV (administracao)

### 5.1 Logo do cliente no PDV
Para mostrar a logo no PDV:
- Configuracoes → SEFAZ → Logo (URL)
- No PDV, ative o botao Logo

### 5.2 Estorno e controle
- Estorno deve ser usado apenas com autorizacao do responsavel.
- Ao estornar, o sistema devolve estoque e gera lancamento financeiro em Estornos.

## 6. Multiempresa e seguranca
- Evite compartilhar conta Admin Master.
- Crie usuarios separados por funcao (Caixa, Estoquista, etc.).
- Cada empresa opera isoladamente: usuarios nao veem dados de outra empresa.

## 7. Checklist de implantacao
- Criar empresa e Admin Master.
- Configurar empresa e modulos.
- Cadastrar produtos com SKU e estoque inicial.
- Criar usuarios por funcao e validar bloqueios.
- Testar PDV: venda, troco, cupom e segunda via.
- Testar estorno e conferencias (estoque e financeiro).
- Configurar integracoes e SEFAZ apenas quando necessario.

## 8. FAQ do administrador
- Nao aparece empresa em Configuracoes → Empresa:
  - Confirme se o usuario e Mestre ou Admin Master do tenant.
- Usuario nao enxerga modulo:
  - Verifique permissoes e modulos ativos da empresa.
- Impressao nao abre:
  - Habilite popups no navegador (segunda via/impressao).

