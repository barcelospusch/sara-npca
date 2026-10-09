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

## Organização do código

- `src/app/`: rotas e componentes de página do Next.js.
- `src/components/`: componentes compartilhados entre páginas.
- `src/lib/firebase/`: operações de dados organizadas por domínio, separadas da interface.
- `src/firebase.js`: inicialização compartilhada dos serviços Firebase.

## Configuração local

Copie `.env.example` para `.env.local` e preencha as variáveis com a configuração do app Web do Firebase. Defina `NEXT_PUBLIC_FIREBASE_DATABASE_URL` com a URL exata do Realtime Database exibida no Firebase Console (por exemplo, `https://<projeto>-default-rtdb.<região>.firebasedatabase.app`). O Next.js carrega `.env.local` automaticamente durante o desenvolvimento e o build.

As variáveis `NEXT_PUBLIC_FIREBASE_*` são incorporadas ao bundle do navegador e, portanto, são públicas. Não coloque senhas ou chaves privadas nelas. A URL correta do banco não concede acesso por si só: o Realtime Database continua aplicando suas regras de acesso. `.env.local` está ignorado pelo Git; mantenha `.env.example` sem valores reais no repositório.

### Segurança antes de publicar/deployar

O código do cliente e as variáveis `NEXT_PUBLIC_*` são públicos. A checagem de administrador feita pela interface serve apenas para navegação e não protege os dados contra chamadas diretas ao Firebase. Antes de conectar dados reais ou disponibilizar o sistema, configure e teste Firebase Security Rules para cada caminho e operação, limitando leituras e gravações por identidade e função. Nunca use regras abertas como `".read": true` ou `".write": true` em produção. Para operações administrativas que não possam ser protegidas adequadamente por regras, mova-as para um backend confiável com verificação de ID token e privilégios no servidor.

Na implementação atual, excluir um membro remove o perfil de `usuarios/{uid}`, mas não exclui a conta do Firebase Authentication; editar o e-mail altera o perfil no Realtime Database, não o e-mail de autenticação. Para sincronizar essas operações com Authentication, implemente-as em um backend confiável usando Firebase Admin SDK.

`"private": true` no `package.json` impede publicação acidental no npm; isso não impede que o código-fonte seja hospedado em um repositório GitHub público.