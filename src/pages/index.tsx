import React, { useEffect } from 'react';
import { createStyles, Container, Text, Button, Group, useMantineTheme, Image, Avatar, Box, Checkbox, CheckboxGroup, Divider, Center } from '@mantine/core';
import MainLayout from '@/components/Layout';
import { useTranslation } from 'react-i18next';
import { useStore } from '../store';
import { useLocalObservable, observer } from 'mobx-react-lite';
import { SiweMessage } from 'siwe';
import { trpc } from '@/lib/trpc';
import { useRouter } from 'next/router';
import { PromiseState } from '../store/standard/PromiseState';

const BREAKPOINT = '@media (max-width: 755px)';

const useStyles = createStyles((theme) => ({
  wrapper: {
    position: 'relative',
    boxSizing: 'border-box',
    backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[8] : theme.white
  },

  inner: {
    position: 'relative',
    paddingTop: 200,
    paddingBottom: 120,

    [BREAKPOINT]: {
      paddingBottom: 80,
      paddingTop: 80
    }
  },

  title: {
    fontFamily: `Greycliff CF, ${theme.fontFamily}`,
    fontSize: 62,
    fontWeight: 900,
    lineHeight: 1.1,
    margin: 0,
    padding: 0,
    color: theme.colorScheme === 'dark' ? theme.white : theme.black,

    [BREAKPOINT]: {
      fontSize: 42,
      lineHeight: 1.2
    }
  },

  description: {
    marginTop: theme.spacing.xl,
    fontSize: 24,

    [BREAKPOINT]: {
      fontSize: 18
    }
  },

  controls: {
    marginTop: theme.spacing.xl * 2,

    [BREAKPOINT]: {
      marginTop: theme.spacing.xl
    }
  },

  control: {
    height: 54,
    paddingLeft: 38,
    paddingRight: 38,

    [BREAKPOINT]: {
      height: 54,
      paddingLeft: 18,
      paddingRight: 18,
      flex: 1
    }
  },

  githubControl: {
    borderWidth: 2,
    borderColor: theme.colorScheme === 'dark' ? 'transparent' : theme.colors.dark[9],
    backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[5] : 'transparent',

    '&:hover': {
      backgroundColor: `${theme.colorScheme === 'dark' ? theme.colors.dark[6] : theme.colors.gray[0]} !important`
    }
  }
}));

export const IndexPage = observer(() => {
  const { user, god } = useStore();
  const { classes, cx } = useStyles();
  const { t } = useTranslation();
  const utils = trpc.useContext();
  const router = useRouter();

  const store = useLocalObservable(() => ({
    async signMessage() {
      const address = god.currentNetwork.account;
      const message = await utils.client.query('auth.sign-message', { address });
      const signature = await god.currentNetwork.signMessage(message);
      await utils.client.mutation('auth.verify', {
        message,
        signature,
        data: {
          client_id: String(router.query.clientId),
          providers: store.providers
        }
      });
    },
    providers: ['Metapebble'] as string[],
    app: new PromiseState({
      async function() {
        console.log(router.query);
        if (!router.query.clientId) {
          throw new Error('Client ID missing');
        }
        const client = await utils.client.query('auth.app', { clientId: String(router.query.clientId) });
        return client;
      }
    }),
    get status() {
      return {
        disabled: store.providers.length == 0
      };
    }
  }));

  useEffect(() => {
    store.app.call();
  }, []);

  return (
    <MainLayout>
      <div className={classes.wrapper}>
        <Container size={700} className={classes.inner}>
          <Center>
            <Avatar src={store.app.value?.logo} />
            <Text ml="sm" size="lg">
              {store.app.value?.name}
            </Text>
          </Center>
          <Divider my="lg" />
          <CheckboxGroup value={store.providers} orientation="vertical" label="Select provider" description="This is anonymous" onChange={(e) => (store.providers = e)} required>
            <Checkbox value="Metapebble" label="Metapebble" />
            <Checkbox value="other" label="..." />
          </CheckboxGroup>
          <Group className={classes.controls}>
            <Button size="xl" disabled={store.status.disabled} className={classes.control} variant="gradient" gradient={{ from: 'blue', to: 'cyan' }} onClick={() => store.signMessage()}>
              {t('authorize')}
            </Button>
          </Group>
        </Container>
      </div>
    </MainLayout>
  );
});
export default IndexPage;
