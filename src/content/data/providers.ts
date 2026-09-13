import type { Provider } from '../../domain/model/provider';

/**
 * Representative providers for the MVP slice. Each Provider cites the
 * SourceDefinition its channel/contact detail is drawn from (`sourceId`),
 * keeping provenance intact down to the concrete phone number or URL a
 * user would act on.
 *
 * F5 remediation (Project Overseer review of WU004/C004): the CM Évora
 * water provider now cites the current process/channel sheet
 * (source.cm-evora-ficha-servico-celebracao-contrato) rather than the
 * superseded 2018 PDF, and its channels were extended to match that
 * sheet's confirmed "Canais de Interação" (Presencial, Serviços Online,
 * Correio Eletrónico, Telefone); Correio Postal is also listed there but
 * is omitted here since no concrete postal address for this specific
 * request is asserted, avoiding an unsupported claim.
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
    sourceId: 'source.cm-evora-ficha-servico-celebracao-contrato',
    channels: [
      {
        id: 'channel.cm-evora-aguas-online',
        type: 'online',
        label: 'Balcão Online - Águas e Saneamento',
        url: 'https://formularios.cm-evora.pt/BalcaoOnline/',
      },
      {
        id: 'channel.cm-evora-aguas-phone',
        type: 'phone',
        label: 'Câmara Municipal de Évora - Atendimento geral',
      },
      {
        id: 'channel.cm-evora-aguas-email',
        type: 'email',
        label: 'Câmara Municipal de Évora - Correio eletrónico',
      },
      {
        id: 'channel.cm-evora-aguas-in-person',
        type: 'inPerson',
        label: 'Câmara Municipal de Évora, Praça do Sertório',
      },
    ],
  },
];
