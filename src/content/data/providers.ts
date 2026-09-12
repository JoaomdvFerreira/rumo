import type { Provider } from '../../domain/model/provider';

/**
 * Representative providers for the MVP slice. Each Provider cites the
 * SourceDefinition its channel/contact detail is drawn from (`sourceId`),
 * keeping provenance intact down to the concrete phone number or URL a
 * user would act on.
 */
export const providers: Provider[] = [
  {
    id: 'provider.autenticacao-gov-cartao-cidadao',
    name: 'Autenticação.gov / Cartão de Cidadão (IRN)',
    jurisdiction: 'PT',
    sourceId: 'source.autenticacao-gov-alteracao-morada',
    channels: [
      {
        id: 'channel.autenticacao-gov-cartao-cidadao-online',
        type: 'online',
        label: 'Alterar a morada do Cartão de Cidadão',
        url: 'https://www.autenticacao.gov.pt/cartao-cidadao/alteracao-morada',
      },
    ],
  },
  {
    id: 'provider.portal-das-financas',
    name: 'Portal das Finanças (Autoridade Tributária e Aduaneira)',
    jurisdiction: 'PT',
    sourceId: 'source.portaldasfinancas-morada',
    channels: [
      {
        id: 'channel.portal-das-financas-online',
        type: 'online',
        label: 'Portal das Finanças - Dados cadastrais > Morada',
        url: 'https://www.portaldasfinancas.gov.pt',
      },
    ],
  },
  {
    id: 'provider.cm-evora-aguas',
    name: 'Câmara Municipal de Évora - Águas',
    jurisdiction: 'PT-Évora',
    sourceId: 'source.cm-evora-informacao-contratacao-agua',
    channels: [
      {
        id: 'channel.cm-evora-aguas-online',
        type: 'online',
        label: 'Contratos e Informações Gerais (Águas)',
        url: 'https://www.cm-evora.pt/en/municipe/areas-de-acao/aguas/contratos-e-informacoes-gerais/',
      },
      {
        id: 'channel.cm-evora-aguas-phone',
        type: 'phone',
        label: 'Câmara Municipal de Évora - Atendimento geral',
      },
      {
        id: 'channel.cm-evora-aguas-in-person',
        type: 'inPerson',
        label: 'Câmara Municipal de Évora, Praça do Sertório',
      },
    ],
  },
];
