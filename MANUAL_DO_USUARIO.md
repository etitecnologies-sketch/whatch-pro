# Whatch Pro OS - Manual do Usuário (v1.4)

Bem-vindo ao **Whatch Pro OS**, sua plataforma completa de gestão empresarial e operacional. Este manual foi desenvolvido para ajudar você a dominar todas as funcionalidades do sistema e extrair o máximo de produtividade do seu negócio.

---

## 1. Dashboard (Painel Geral)
O coração do sistema. Aqui você tem uma visão panorâmica e em tempo real da saúde da sua empresa.
- **Métricas Chave**: Visualize faturamento, novos clientes e projetos ativos.
- **Gráficos de Desempenho**: Acompanhe o crescimento mensal através de gráficos dinâmicos.
- **Status Rápido**: Identifique rapidamente quantos projetos estão em andamento ou pendentes.

## 2. Clientes
Gerencie sua base de clientes com facilidade e organização.
- **Cadastro Completo**: Armazene dados como CNPJ/CPF, e-mail, telefone e endereço.
- **Histórico de Interações**: Visualize todos os projetos e orçamentos vinculados a cada cliente.
- **Integração Asaas**: Sincronização automática para cobranças e faturamento.

## 3. Estoque e Itens
Controle total sobre seus produtos, custos e rentabilidade.
- **Gestão de Custos**: Insira o preço de custo de cada item.
- **Margem de Lucro**: Defina a porcentagem de lucro desejada e o sistema calculará o preço final automaticamente.
- **Impostos**: Configure as alíquotas de impostos por produto.
- **Alertas de Estoque**: O sistema avisa quando um item está com "Estoque Baixo" ou "Esgotado".

## 4. Orçamentos (Novo!)
Crie propostas comerciais profissionais em segundos.
- **Dinâmica e Sincronia**: Selecione clientes e produtos diretamente do seu banco de dados.
- **Cálculo Automático**: O sistema soma os itens, aplica os valores e gera o total geral.
- **Validade e Notas**: Defina prazos de validade e adicione observações personalizadas para o cliente.
- **Status de Negociação**: Acompanhe se o orçamento está como Rascunho, Enviado, Aprovado ou Recusado.

## 5. PDV (Frente de Caixa)
Tela de venda rápida para **Supermercado** e negócios com atendimento de balcão.
- **Busca/Bipagem**: digite o nome/SKU ou use leitor (código de barras via campo de busca).
- **Quantidade rápida**: no campo de busca use `3x123` (quantidade x SKU) e pressione Enter.
- **Carrinho**: ajuste quantidades, remova itens e finalize a venda.
- **Pagamento**: Pix, Crédito, Débito ou Dinheiro (com cálculo de troco).
- **Histórico**: acesse o histórico de vendas, visualize itens e faça estorno quando necessário.
- **Impressão**: imprima o cupom no checkout e faça segunda via no histórico.
- **Logo do cliente no PDV**: se quiser mostrar a logo do cliente, configure em **Configurações → SEFAZ → Logo (URL)** e ative o botão **Logo** no PDV.

### 5.1 Atalhos do PDV (Teclado)
- **F2**: focar na busca
- **F4**: limpar cupom (carrinho + cliente + recebido)
- **F6**: abrir/fechar histórico
- **F7**: pagamento Pix
- **F8**: pagamento Dinheiro
- **F9 / Enter**: finalizar venda
- **F10**: pagamento Crédito
- **F11**: pagamento Débito
- **↑ / ↓**: selecionar item do carrinho
- **+ / -**: aumentar/diminuir quantidade do item selecionado
- **Delete**: remover item selecionado
- **Esc**: sair do histórico

### 5.2 Estorno de Venda
No **Histórico de Vendas (PDV)** você pode estornar uma venda.
- O estorno **devolve o estoque** dos itens da venda.
- O sistema registra um **movimento de estoque** de estorno e cria um lançamento financeiro em **Estornos**.

## 5. Usuários e Permissões
Segurança e hierarquia para sua equipe.
- **Admin vs Sub-usuário**: Administradores podem criar sua própria equipe.
- **Tipo de Empresa (Segmento)**: No cadastro de uma nova empresa, o sistema ativa automaticamente os módulos adequados ao seu negócio (Supermercado, Oficina, Provedor etc.).
- **Perfis Prontos**: Ao criar um sub-usuário, selecione um perfil (ex.: Caixa, Vendas, Financeiro, Técnico de Campo). O sistema já aplica as permissões padrão do segmento.
- **Ajuste Fino**: Após escolher um perfil, o Admin pode ajustar as permissões manualmente para casos especiais.
- **Ambientes Isolados**: Cada empresa opera em seu próprio ambiente. Usuários de uma empresa não veem nem acessam dados de outra.

### 5.1 Papéis e Responsabilidades
- **Mestre (mestre@whatchpro.com)**: cria empresas, cria o Admin Master e pode redefinir senhas e permissões, sem acessar rotinas e dados operacionais das empresas.
- **Admin (Empresa)**: administra usuários e tem controle total dos módulos ativos da empresa.
- **Sub-usuário**: acessa apenas os módulos/permissões liberados.

### 5.2 Tipos de Empresa (Segmentos)
- **Supermercado**: foca em PDV, estoque e financeiro.
- **Borracharia**: foca em chamados/OS, estoque e orçamentos.
- **Oficina Automotiva**: foca em chamados/OS, estoque, orçamentos e projetos (quando aplicável).
- **Empresa de Vendas**: foca em CRM, orçamentos, financeiro e Planos.
- **Provedor de Internet**: foca em Clientes, Planos, Contratos, Tickets/Chamados e Almoxarifado.
- **Todos os Segmentos**: ativa todos os módulos do sistema.

### 5.3 Cadastro de Empresa (Mestre)
O cadastro de uma nova empresa é feito pelo usuário **mestre@whatchpro.com** no módulo **Usuários** criando um **Admin Master**.

Campos de empresa disponíveis para preenchimento:
- **Nome da Empresa**
- **Razão Social** (opcional)
- **CNPJ/CPF**
- **Inscrição Estadual** (opcional)
- **Telefone** (opcional)
- **E-mail** (opcional)
- **CEP** (opcional)
- **UF** (opcional)
- **Endereço, Número, Complemento, Bairro, Cidade** (opcionais)

Ao selecionar o **Tipo de Empresa (Segmento)**, o sistema define automaticamente os **módulos ativos** para aquela empresa.

### 5.4 Edição de Empresa (Configurações)
- **Admin Master** pode editar os dados cadastrais da própria empresa em **Configurações → Empresa**.
- **Mestre** pode selecionar uma empresa e editar os dados cadastrais em **Configurações → Empresa**.

## 6. Configurações e Aparência
Deixe o sistema com a cara do seu negócio.
- **Tema Escuro/Claro**: Escolha o modo que for mais confortável para seus olhos.
- **Cores de Destaque**: Personalize a cor principal do sistema para combinar com sua identidade visual.
- **Integrações**: Configure tokens de API (Asaas, NuvemFiscal) para automatizar processos financeiros e fiscais.

---

## Novidades da Versão 1.4.1
- **Segmentos de Empresa**: cadastro de empresa por tipo (Supermercado, Oficina, Provedor, Vendas ou Todos).
- **Módulos por Empresa (Features)**: o menu e as rotinas seguem os módulos ativados para aquela empresa.
- **Perfis de Usuário**: templates prontos para criação rápida de subusuários (com ajuste fino).
- **Mestre sem Rotina**: o usuário mestre fica restrito a usuários/configurações e não acessa dados operacionais.
- **Cadastro Completo de Empresa**: formulário com dados cadastrais no momento da criação da empresa.

---
*Whatch Pro OS - Tecnologia para quem busca excelência operacional.*
