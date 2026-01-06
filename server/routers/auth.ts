import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { users } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import { sdk } from "../_core/sdk";
import { getSessionCookieOptions } from "../_core/cookies";
import { COOKIE_NAME } from "@shared/const";
import { TRPCError } from "@trpc/server";

export const authRouter = router({
    me: publicProcedure.query(opts => opts.ctx.user),

    register: publicProcedure
        .input(z.object({
            name: z.string().min(2),
            email: z.string().email(),
            password: z.string().min(8)
        }))
        .mutation(async ({ ctx, input }) => {
            const db = await getDb();
            if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

            // Check if user already exists
            const existingUsers = await db.select().from(users).where(eq(users.email, input.email)).limit(1);
            if (existingUsers.length > 0) {
                throw new TRPCError({ code: "CONFLICT", message: "User with this email already exists" });
            }

            // Hash password
            const hashedPassword = await bcrypt.hash(input.password, 10);

            // Create user with a generated openId for compatibility with existing session logic
            const openId = `user-${nanoid(10)}`;

            await db.insert(users).values({
                name: input.name,
                email: input.email,
                password: hashedPassword,
                openId: openId,
                loginMethod: "simple",
                role: "user",
            });

            return { success: true };
        }),

    login: publicProcedure
        .input(z.object({ email: z.string().email(), password: z.string() }))
        .mutation(async ({ ctx, input }) => {
            const db = await getDb();
            if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

            // Find user
            const result = await db.select().from(users).where(eq(users.email, input.email)).limit(1);
            const user = result[0];

            if (!user || !user.password) {
                throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid credentials" });
            }

            // Verify password
            const isPasswordValid = await bcrypt.compare(input.password, user.password);
            if (!isPasswordValid) {
                throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid credentials" });
            }

            // Create session token
            const sessionToken = await sdk.createSessionToken(user.openId!, { name: user.name || user.email });

            const cookieOptions = getSessionCookieOptions(ctx.req);
            ctx.res.cookie(COOKIE_NAME, sessionToken, cookieOptions);

            // Update last signed in
            await db.update(users).set({ lastSignedIn: new Date() }).where(eq(users.id, user.id));

            return { success: true };
        }),

    logout: publicProcedure.mutation(({ ctx }) => {
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
        return {
            success: true,
        } as const;
    }),
});
