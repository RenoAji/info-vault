# InfoVault

A knowlede base assistant that let users chat about their document, generate note, and generate mindmap.

## ✨ Features

- **📁 Document Upload**: Support for PDF, TXT, with intelligent text extraction
- **💬 AI Chat Interface**: Interactive chat with your documents using LLM
- **📝 Smart Note Generation**: AI-powered note creation and summarization from uploaded documents
- **🧠 Mind Maps**: Visual mind map generation with using React Flow
- **🔐 Authentication**: User authentication and session management with NextAuth
- **📱 Responsive Design**: Modern, mobile-friendly interface with dark/light mode support
- **📊 Vault Management**: Organize documents into separate vaults with individual chat histories

## 🖼️ Demo / Screenshots

Check this linkedIn post : [[link](https://www.linkedin.com/posts/septareno-nugroho-aji-4743992b3_di-libur-semester-kemarin-saya-mengisi-liburan-activity-7366497458316599297-1QVA?utm_source=share&utm_medium=member_desktop&rcm=ACoAAEtXbFgBdJIhp_XLo9Xr66iV8q9R8-7HNAA)]

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

### Future Improvements

- The current code uses naive RAG techniques. Implement more advanced RAG techniques for better document understanding.
- Add support for more document formats (docx, pptx, etc).
- The current document loader is basic and still has limitations. Implement a more advanced document loader for better text extraction and understanding.
