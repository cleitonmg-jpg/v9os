# Documento de Requisitos: V9 Orçamentos & Ordens de Serviço

## 1. Perfil do Desenvolvedor
Especialista Full-stack com domínio em **React, Node.js e Python**, focado em segurança de dados e interfaces premium.

## 2. Decisão Tecnológica
Para esta aplicação web customizável, utilizaremos:
- **Frontend**: React + TypeScript + Tailwind CSS (Responsivo, Dark/Light Mode).
- **Backend**: Node.js com Express e Prisma ORM.
- **Relatórios**: Geração de PDFs nativa.
- **Automações**: Scripts Python para tarefas auxiliares (se necessário).

## 3. Escopo do Projeto

### 3.1. Gestão de Veículos (Carros/Motos)
- **Dados**: Placa, marca, modelo, ano, cor, chassi, quilometragem, etc.
- **Relacionamento**: Vinculado a um Cliente.

### 3.2. Gestão de Clientes
- **Dados**: Nome, CPF/CNPJ, telefone, e-mail, endereço completo.

### 3.3. Orçamentos e Ordens de Serviço (OS)
- **Fluxo**: Orçamento -> Aprovação -> Ordem de Serviço.
- **Dados Comuns**: Data, cliente, veículo, lista de itens (peças/serviços), valor total.
- **Específicos da OS**:
  - Defeitos relatados pelo cliente.
  - Serviços realizados e peças utilizadas (com quantidades e valores).
  - **Atribuição Técnica**: Cada item (peça ou serviço) deve estar vinculado ao técnico que o executou.
  - **Múltiplos Técnicos**: Suporte para vários técnicos trabalhando em um mesmo veículo em funções diferentes.
  - **Status**: Aberto, Em Andamento, Concluído, Cancelado.

### 3.4. Relatórios e Saídas
- Exportação de Orçamentos e Ordens de Serviço em **PDF** profissional.
- Detalhamento de valores finais, peças e mão de obra relacionada.

## 4. Interface e Experiência do Usuário (UI/UX)
- **Design**: Moderno, clean, cores suaves (Petróleo/Cinza), alto contraste para legibilidade.
- **Funcionalidades de Tela**: CRUD completo (Criação, Edição, Exclusão, Visualização) com ícones temáticos (automotivos).
- **Responsividade**: Total adaptabilidade para tablets e celulares.

## 5. Regras de Negócio e Segurança
- **Auditoria**: Cada operação (Criação, Exclusão, Alteração) deve registrar o `ID` do técnico responsável.
- **Notificações**: Sistema de aviso ao cliente via **WhatsApp ou E-mail** sobre o status do veículo (ex: "Carro Pronto").
- **Dados Iniciais (Seed)**:
  - Usuário: `user`
  - Senha: `user123`
- **Identificação da Empresa**: V9 INFORMATICA LTDA (Telefone: 37 4141 0341).

---
*Documento atualizado e melhorado para início do desenvolvimento.*


