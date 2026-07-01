# 📋 Pasteboard

[4bin](https://4bin.vercel.app/).

Um painel minimalista de memória em texto, inspirado na experiência de uma máquina de escrever.

O Pasteboard foi concebido para ser um espaço simples, rápido e livre de distrações para registrar ideias, anotações, trechos de código, listas e textos curtos. Em vez de organizar documentos em pastas ou categorias, todas as anotações ficam disponíveis em uma barra lateral, priorizando velocidade de escrita e recuperação do conteúdo.

---

## Objetivos

* Interface limpa e minimalista.
* Escrita sem distrações.
* Salvamento automático.
* Histórico de anotações em uma única lista.
* Funcionamento em navegador, desktop e dispositivos móveis.

---

## Tecnologias

### Front-end

* Next.js
* React
* TypeScript
* TipTap

### Back-end

* Next.js Route Handlers
* Firebase Admin SDK
* Cloud Firestore

### Hospedagem

* Vercel

---

## Funcionalidades

### Editor

* Escrita em texto rico
* Negrito
* Itálico
* Sublinhado
* Marcador de texto
* Listas numeradas
* Listas não numeradas
* Lista de tarefas (checkbox)
* Títulos
* Recuo de listas
* Numeração opcional de linhas

### Organização

* Barra lateral com prévia das anotações
* Ordenação automática pela modificação mais recente
* Criação instantânea de novas anotações
* Exclusão de anotações
* Pastes vazias não são armazenadas

### Salvamento

* Salvamento automático com *debounce*
* Atualização automática no Firestore
* Exclusão automática quando uma anotação fica vazia

---

## Interface

O layout é composto por três áreas principais:

```
┌──────────────────────────────────────────────────────┐
│ Pasteboard                                           │
├───────────────┬──────────────────────────────────────┤
│               │                                      │
│ Sidebar       │           Editor                     │
│               │                                      │
│               │                                      │
│               │                                      │
├───────────────┼──────────────────────────────────────┤
│ XX pastes     │ XX linhas             Excluir        │
└───────────────┴──────────────────────────────────────┘
```

---

## Filosofia

O Pasteboard não pretende substituir editores completos como Microsoft Word, Google Docs ou Notion.

A proposta é oferecer um ambiente extremamente rápido para registrar informações, semelhante a abrir um bloco de notas físico.

O foco está em:

* velocidade;
* simplicidade;
* organização automática;
* baixa fricção durante a escrita.

---

## Estrutura do Projeto

```
src/
│
├── app/
│   ├── api/
│   └── page.tsx
│
├── components/
│   ├── editor/
│   ├── Pasteboard.tsx
│   └── Sidebar.tsx
│
├── lib/
│   └── firebaseAdmin.ts
│
└── types/
    └── paste.ts
```

---

## Modelo de Dados

Cada anotação é armazenada no Firestore como:

```ts
{
  contentHtml: string;
  preview: string;
  createdAt: number;
  updatedAt: number;
}
```

---

## Roadmap

### Editor

* [x] Salvamento automático
* [x] Sidebar
* [x] Exclusão
* [x] Toolbar
* [ ] Upload de arquivos
* [ ] Arrastar e soltar arquivos
* [ ] Colagem de imagens
* [ ] Atalhos de teclado completos
* [ ] Pesquisa entre pastes

### Interface

* [ ] Tema escuro
* [ ] Personalização de fontes
* [ ] Zoom do editor
* [ ] Modo foco
* [ ] Contador de palavras
* [ ] Estatísticas de escrita

### Organização

* [ ] Favoritos
* [ ] Fixar pastes
* [ ] Arquivamento
* [ ] Etiquetas
* [ ] Pesquisa em tempo real

---

## Licença

Projeto desenvolvido para fins de estudo, experimentação e uso pessoal.
