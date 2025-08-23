# InfoVault

A knowlede base assistant that let users chat about their document, generate note, and generate mindmap.

## ✨ Features

- **📁 Document Upload**: Support for PDF, TXT, with intelligent text extraction
- **💬 AI Chat Interface**: Interactive chat with your documents using advanced LLMs (OpenRouter/Google Generative AI)
- **📝 Smart Note Generation**: AI-powered note creation and summarization from uploaded documents
- **🧠 Mind Maps**: Visual mind map generation with using React Flow
- **🔍 Vector Search**: Semantic search through document content using ChromaDB embeddings
- **🔐 Authentication**: User authentication and session management with NextAuth
- **📱 Responsive Design**: Modern, mobile-friendly interface with dark/light mode support
- **📊 Vault Management**: Organize documents into separate vaults with individual chat histories

## 🖼️ Demo / Screenshots

Check this linkedIn post : [link]

## 🛠️ Tech Stack

- **Fullsatck:** Next.js (typescript)
- **ORM:** Prisma
- **Database:** Prisma Postgre
- **AI:** Langchain.js
- **Vector DB:** ChromaDB

## ⚙️ Setup

How to run this app locally

Clone the repo :

```bash
# Clone the repo
git clone https://github.com/RenoAji/info-vault

# Install NPM packages
npm install
```

Environment Variable.
.env file :

```bash
DATABASE_URL="YOUR DATABASE URL"
AUTH_SECRET="YOUR SECRET KEY"
NEXTAUTH_URL="http://localhost:3000" # Your app url
OPENROUTER_API_KEY="YOUR OPENROUTER API KEY"
OPENROUTER_MODEL="z-ai/glm-4.5-air:free" # Or any other model you choose
```

You can generate the secret key using :

```
openssl rand -base64 32
```

Start the development server :

```bash
npm run dev
```

Run the chroma vector database server :

```bash
npx chroma run
```

## Additional

### Scripts (check package.json) :

Check api limit (/script/check-limit.ts) :

```bash
npm run script:limit
```

Clear all embedding in the vector database (/script/clear.ts) :

```bash
npm run chroma:clear
```

Peek the embedding collection (/script/peek.ts) :

```bash
npm run chroma:peek
```

Delete the embedding in a specific vault (/script/delete.ts) :

```bash
npm run chroma:delete
```
