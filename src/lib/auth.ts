import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { db } from "./db";
import { users } from "./db/schema";
import { eq } from "drizzle-orm";

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: "openid email profile https://www.googleapis.com/auth/gmail.modify https://www.googleapis.com/auth/gmail.send",
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
  ],
  callbacks: {
    async signIn({ account, profile }) {
      if (!account || !profile?.email) return false;

      // Upsert user with tokens
      const existingUser = await db
        .select()
        .from(users)
        .where(eq(users.email, profile.email))
        .limit(1);

      if (existingUser.length === 0) {
        await db.insert(users).values({
          email: profile.email,
          gmailAccessToken: account.access_token,
          gmailRefreshToken: account.refresh_token,
          tokenExpiresIn: account.expires_in as number,
          tokenRefreshedAt: new Date(),
        });
      } else {
        await db
          .update(users)
          .set({
            gmailAccessToken: account.access_token,
            gmailRefreshToken: account.refresh_token || existingUser[0].gmailRefreshToken,
            tokenExpiresIn: account.expires_in as number,
            tokenRefreshedAt: new Date(),
          })
          .where(eq(users.email, profile.email));
      }

      return true;
    },
    async session({ session }) {
      if (session.user?.email) {
        const dbUser = await db
          .select()
          .from(users)
          .where(eq(users.email, session.user.email))
          .limit(1);

        if (dbUser.length > 0) {
          session.user.id = dbUser[0].id;
        }
      }
      return session;
    },
  },
});
