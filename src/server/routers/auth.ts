import { TRPCError } from '@trpc/server';
import { utils } from 'ethers';
import { createRouter } from 'server/createRouter';
import { generateNonce, ErrorTypes, SiweMessage } from 'siwe';
import * as z from 'zod';

const getSigninMessage = (address) => `Sign in with Ethereum to the app. \naddress:${address}`;

export const AuthRouter = createRouter()
  .query('app', {
    input: z.object({
      clientId: z.string()
    }),
    async resolve({ ctx, input }) {
      const client = ctx.prisma.clients.findFirst({ where: { client_id: input.clientId }, select: { name: true, logo: true } });
      return client;
    }
  })
  .query('user-client', {
    resolve() {}
  })
  .query('nonce', {
    async resolve({ ctx }) {
      return generateNonce();
    }
  })
  .query('sign-message', {
    input: z.object({
      address: z.string()
    }),
    async resolve({ ctx, input }) {
      return getSigninMessage(input.address);
    }
  })
  .mutation('verify', {
    input: z.object({
      message: z.string(),
      signature: z.string(),
      data: z.object({
        client_id: z.string(),
        providers: z.array(z.string())
      })
    }),
    async resolve({ ctx, input }) {
      const validated = utils.verifyMessage(input.message, input.signature);
      if (!validated) {
        throw new TRPCError({ code: 'BAD_REQUEST' });
      }
      const {
        data: { client_id, providers }
      } = input;
      if (providers.length) {
        await ctx.prisma.user_client.upsert({
          create: { client_id, providers, user_id: validated },
          update: { providers: { set: providers } },
          where: { user_id_client_id: { user_id: validated, client_id } }
        });
      }

      return true;
    }
  });
