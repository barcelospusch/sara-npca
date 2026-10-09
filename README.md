# SARA-NPCA

Sistema de Administração e Registro de Asteroides do Núcleo de Pesquisa e Caça de Asteroides (NPCA). A aplicação permite registrar candidatos, acompanhar análises e gerar relatórios a partir dos dados armazenados no Firebase.

## Funcionalidades

- Login por e-mail e senha, com recuperação de senha.
- Cadastro e gerenciamento de membros por administradores.
- Registro de candidatos com observador associado pelo UID da conta.
- Códigos `NPC####` para registros com objetos em movimento e `XYZ####` para MPCs sem objetos em movimento. Os registros XYZ são identificados pelo quadrante `0` e exibidos como “MPC vazio” na listagem.
- Edição de PS e status da análise, além de filtros por observador, período, set, PS, status e tipo de MPC.
- Painel administrativo com estatísticas e exportação de relatórios em PDF.

> O status ativo/inativo do membro é uma informação administrativa. Atualmente, ele não desativa a conta no Firebase Authentication nem impede o login.

## Páginas

| Rota | Acesso e finalidade |
| --- | --- |
| `/login` | Login e recuperação de senha. |
| `/` | Listagem, filtros e consulta dos candidatos; administradores também podem editar ou excluir registros. |
| `/registrar` | Cadastro de candidato e associação ao observador autenticado. |
| `/membros` | Cadastro e gerenciamento de observadores e administradores; acesso administrativo. |
| `/painel` | Estatísticas e gráficos; acesso administrativo. |
| `/exportar` | Geração de relatório PDF, com filtros por observador, período e tipo de MPC. |

## Dados principais

O Realtime Database usa estes caminhos:

- `usuarios/{uid}`: perfil, nome, e-mail e papel (`admin`). O campo `active` registra o status ativo/inativo.
- `candidatos/{id}`: dados do candidato, incluindo `code`, `quadrant`, `observerUid`, `ps`, `status` e `mpcReport`. Registros comuns usam o código NPC como chave; registros XYZ usam uma chave interna única.
- `config`: contadores independentes para as sequências NPC (`lastCodeNumber` e `tempCodeNumber`) e XYZ (`lastXyzCodeNumber` e `tempXyzCodeNumber`).

Os nomes dos observadores na interface são obtidos pelo UID salvo em cada candidato e pelo perfil em `usuarios/{uid}`.

## Tecnologias

- Next.js e React.
- Firebase Authentication e Realtime Database.
- jsPDF e jsPDF AutoTable para relatórios PDF.
- Phosphor Icons para ícones da interface.

## Configuração local

Copie `.env.example` para `.env.local` e preencha as variáveis com a configuração do app Web do Firebase. O Next.js carrega `.env.local` automaticamente durante o desenvolvimento e o build.

As variáveis `NEXT_PUBLIC_FIREBASE_*` são incorporadas ao bundle do navegador e, portanto, são públicas. Não coloque senhas ou chaves privadas nelas. Proteja os dados com as Firebase Security Rules e as restrições apropriadas no Firebase Console. `.env.local` está ignorado pelo Git; mantenha `.env.example` sem valores reais no repositório.