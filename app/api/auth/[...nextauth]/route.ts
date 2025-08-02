import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const user = await prisma.user.findUnique({
          where: {
            email: credentials?.email,
          },
        });

        if (!credentials) {
          return null;
        }

        if (
          user &&
          credentials.email === user.email &&
          await bcrypt.compare(credentials.password, user.password)
        ) {
          // Convert id to string to match NextAuth User type
          return {
            ...user,
            id: user.id.toString(),
          };
        }

        return null;
      },
    }),
  ],
    session: {
    strategy: "jwt" as const,
  },
  callbacks: {
    // 1. JWT callback
    async jwt({ token, user }: { token: any; user?: any }) {
      // On the first sign-in, the 'user' object is available.
      // Persist the user ID and other properties to the token.
      if (user) {
        token.sub = user.id;
        // you can add any other properties you want to the token here
        // e.g., token.role = user.role;
      }
      return token;
    },

    // 2. Session callback
    async session({ session, token }: { session: any; token: any }) {
      // The session callback is called whenever a session is checked.
      // We assign the user ID from the token to the session object.
      if (session?.user) {
        session.user.id = token.sub; // sub is the user id
        // e.g., session.user.role = token.role;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
