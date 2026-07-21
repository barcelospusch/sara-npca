# Estrutura do website

| /login (auth)                firebase-auth
| /(home)                  listagem dos candidatos registrados, no header estatísticas (total de registros, total q o usuário registrou, qts na preliminar, qts no provisório etc.)
| /registrar                   dá o código, auto-input de data, input de quadrante, input de set e input de PS
| /admin (verifica no auth)    painel de membros e estatisticas
    | /membros                 listagem de membros
        | /registrar           registrar novo membro
        | /{uid}               gerenciamento do membro (editar informacoes, desativar)
    | /candidatos              listagem de candidatos
        | /{codigo}            gerenciamento do candidato (selection dropdown para status "em análise", "preliminar", "provisório", "órbita definida")


body
    nav
    div
        header
        main
    footer