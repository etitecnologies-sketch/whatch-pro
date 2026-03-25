# 🇧🇷 Integração com Receita Federal - Guia Completo

## 📋 O que foi integrado

- ✅ **NF-e (Nota Fiscal Eletrônica)** - Modelo 55
- ✅ **NFC-e (Nota Fiscal Consumidor)** - Modelo 65
- ✅ **Cupom Fiscal**
- ✅ **SPED EFD** (Escrituração Fiscal Digital)
- ✅ **Integração com SEFAZ** (Receita Federal)
- ✅ **Integrador Híbrido** (Nuvemfiscal API)
- ✅ **Suporte a Certificado Digital** (e-CNPJ/e-CPF)

---

## 🔐 **Passo 1: Obter Certificado Digital (e-CNPJ)**

### O que você precisa:

1. **CNPJ ativo** e regularizado junto à Receita Federal
2. **Acesso ao Portal e-CNPJ** da ICP-Brasil

### Como obter:

#### **Opção A: Autoridades Certificadoras (Recomendado)**

Visite os sites das CAs para solicitar:

- 🔗 **Serasa Experian**: https://www.serasaexperian.com.br/pj/certificado-digital
- 🔗 **Certisign**: https://www.certisign.com.br/certificado-digital-cnpj
- 🔗 **BrCA**: https://www.brca.com.br/certificado-digital
- 🔗 **VALID**: https://www.valid.com.br/en/certificado-digital

**Documento necessário:**
- RG/CNH de quem assina (sócio/representante)
- CNPJ da empresa
- Autorização assinada pela empresa

**Validade:** 1 ano
**Formato:** `.pfx` ou `.p12`

#### **Opção B: Ambiente de Homologação (DEMO/Testes)**

Para **testar sem certificado real**, você pode:

1. Usar o **Certificado de Teste** disponível na Receita Federal
2. Baixar em: https://www1.nfe.fazenda.gov.br/e-sped/downloads

**Arquivo:** `AC_RAIZ_ICP_BRASIL_v5.crt` (certificado teste)

---

## 🚀 **Passo 2: Configurar SEFAZ no Whatch Pro**

### 2.1 Acesse as Configurações Fiscais

```
Configurações → Receita Federal → Configuração SEFAZ
```

### 2.2 Escolha o Tipo de Integração

#### **Opção 1: Híbrido (Recomendado para iniciar)** ⭐

Combina o melhor dos dois:
- ✅ Usa **Nuvemfiscal** como padrão (sem certificado local)
- ✅ Fallback para **SEFAZ direto** quando necessário

**Passo-a-passo:**

1. Vá em **Configurações → SEFAZ → Integração**
2. Selecione **"Híbrido"**
3. Adicione **API Key do Nuvemfiscal** (veja abaixo)
4. (Opcional) Carregue certificado para SEFAZ direto

#### **Opção 2: SEFAZ Direto** (Produção Real)

Conexão direta com a Receita Federal - mais controle.

**Pré-requisitos:**
- Certificado digital `.pfx` instalado
- Senha do certificado

---

## 🔑 **Passo 3: Obter API Key Nuvemfiscal** (Se usar Híbrido)

### Como funcionan:

**Nuvemfiscal** é um integrador autorizado que simplifica a integração com SEFAZ.

### Registre-se:

1. Acesse: https://nuvemfiscal.com.br/
2. Clique em **"Novo Usuário"**
3. Preencha dados da empresa
4. Confirme email
5. Faça login
6. Vá em **API** → **Tokens** → **Gerar Token**
7. Copie a **API Key**

### Planos:

| Plano | Limite | Preço |
|-------|--------|-------|
| **Free** | 50 NF-e/mês | Gratuito |
| **Professional** | 500 NF-e/mês | ~R$ 99/mês |
| **Enterprise** | Ilimitado | Consultar |

---

## 📝 **Passo 4: Carregar Certificado no Whatch Pro**

### 4.1 Acesse Configurações SEFAZ

```
Configurações → Receita Federal → Certificados
```

### 4.2 Faça Upload

1. Clique em **"Adicionar Certificado"**
2. Selecione arquivo `.pfx` ou `.p12`
3. Digite a **senha do certificado**
4. Clique em **"Carregar"**
5. Marque como **"Ativo"** (se usar SEFAZ direto)

### Segurança:

- A senha é **criptografada** no localStorage
- O certificado é armazenado em **Base64**
- Nunca é enviado sem seu consentimento

---

## 🏪 **Passo 5: Configurar Dados da Empresa**

### Ir para: `Configurações → Receita Federal → Meus Dados`

Preencha:

```
Informações da Empresa:
├─ CNPJ: 00.000.000/0000-00
├─ Razão Social: Empresa LTDA
├─ Nome Fantasia: Meu Negócio
├─ Inscrição Estadual: 000.000.000.000
├─ Município: São Paulo
├─ UF: SP
└─ CEP: 01234-567

Configurações Fiscais:
├─ Modelo NF-e: 55 (NF-e Padrão)
├─ Série: 001
├─ Próximo Número: 1
├─ Natureza Atividade: 00 (Comércio)
├─ Tipo Escrituração: COMPLETA
└─ Ambiente: Homologação (para testes)

Dados de Contato:
├─ Email: fiscal@empresa.com.br
├─ Telefone: (11) 99999-9999
└─ Limite NF-e/Mês: 500
```

---

## 💰 **Passo 6: Usar na Prática**

### Para Emitir NF-e:

Vá em **Financeiro** → Clique em transação → **"Emitir NF-e"**

O sistema vai:

1. ✅ Validar configuração SEFAZ
2. ✅ Gerar chave de acesso (44 dígitos)
3. ✅ Criar XML fiscal (padrão Receita Federal)
4. ✅ Assinar digitalmente (se SEFAZ direto)
5. ✅ Enviar para SEFAZ//Nuvemfiscal
6. ✅ Receber protocolo de autorização
7. ✅ Gerar PDF (DANFE)
8. ✅ Armazenar na base de dados

---

## 🧪 **Ambiente de Homologação (TESTES)**

Recomendamos **sempre começar em HOMOLOGAÇÃO**:

```
Configurações → Receita Federal → Ambiente
Selecione: "Homologação"
```

### URLs de Teste:

- **SEFAZ Teste**: `https://nfe.sefaz.pe.gov.br/webservices/` (Pernambuco teste)
- **Nuvemfiscal Sandbox**: `https://api.sandbox.nuvemfiscal.com.br/v1`

### O que testar:

1. Emitir NF-e teste
2. Cancelar NF-e teste
3. Consultar protocolo
4. Gerar PDF

**Importante:** Documentos em homologação não têm valor fiscal!

---

## 📊 **Acompanhamento e Relatórios**

### Visualizar NF-es Emitidas:

```
Documentos → Todas as NF-es → [Filter/Search]
```

Você vê:
- ✅ Status (Pendente, Autorizado, Rejeitado)
- ✅ Chave de acesso
- ✅ Protocolo SEFAZ
- ✅ Data de autorização
- ✅ Opção de descarregar XML/PDF

### SPED EFD:

```
Documentos → SPED → Gerar SPED (mensal)
```

Sistema gera arquivo `.txt` com:
- Blocos 0, C, D, E, H, 9
- Totalizações corretas
- Pronto para enviar à Receita Federal

---

## ⚠️ **Troubleshooting**

### "Certificado inválido"

**Solução:**
- Verifique format `.pfx` ou `.p12`
- Confirme a senha
- Teste com ferramenta: https://certificado.nfe.fazenda.gov.br

### "Erro de conexão com SEFAZ"

**Solução:**
- Verifique se está em **Homologação** (se testando)
- Confirme conectividade internet
- Teste URL: `https://nfe.sefaz.pe.gov.br/webservices/NFeStatusServico4?wsdl`

### "API Key Nuvemfiscal inválida"

**Solução:**
- Regenere token em: https://nuvemfiscal.com.br/api/tokens
- Verifique se plano está ativo
- Teste com CURL: `curl -H "Authorization: Bearer SEU_TOKEN" https://api.sandbox.nuvemfiscal.com.br/v1/account/limite`

### "Chave de acesso duplicada"

**Solução:**
- Sistema gera automaticamente chaves ÚNICAS
- Se erro persistir, contate Nuvemfiscal/SEFAZ

---

## 📞 **Suporte**

### Receita Federal:
- 🌐 https://www1.nfe.fazenda.gov.br/
- 📧 nfe.forum@fazenda.gov.br
- ☎️ 0800 978 15 15

### Nuvemfiscal:
- 🌐 https://nuvemfiscal.com.br/suporte
- 📧 suporte@nuvemfiscal.com.br
- 💬 Chat em tempo real

### Whatch Pro:
- 📧 support@whatchpro.com
- 🐛 Issues: https://github.com/seu-repo/issues

---

## 🎓 **Próximos Passos**

1. ✅ Configurar SEFAZ (este guia)
2. ⏳ Emitir NF-e de teste
3. ⏳ Validar XMLs gerados
4. ⏳ Integrar com sistema contábil
5. ⏳ Treinar equipe
6. ⏳ Migrar para Produção

---

**Documentação Receita Federal:** 
- NF-e v4.0: https://www1.nfe.fazenda.gov.br/portal/webconteudo.ashx?id=3
- SPED EFD: https://www1.nfe.fazenda.gov.br/e-sped/

**Última atualização:** Março 2026
