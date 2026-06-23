# Café com Propósito — Backend & Painel Administrativo

Backend em **Django + Django REST Framework** que serve o conteúdo para o app
(React Native) e oferece um **painel administrativo** para a autora gerenciar
capítulos, áudios, imagens e textos — sem precisar de programador.

## O que já está pronto

- **Modelos de dados:** capítulos (molde de 8 partes), páginas especiais,
  anotações, favoritos e progresso de leitura/escuta.
- **Painel admin em português**, pensado para uso não-técnico (upload de áudio
  e imagem, marcar publicado, definir acesso free/premium do áudio).
- **API REST** para o app consumir o conteúdo.
- **Importador da planilha** (`import_planilha`) que carrega os 75 capítulos +
  páginas especiais de uma vez.

## Como rodar (desenvolvimento)

```bash
# 1. Crie e ative um ambiente virtual
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

# 2. Instale as dependências
pip install -r requirements.txt

# 3. Configure o ambiente
cp .env.example .env            # ajuste se quiser

# 4. Crie o banco
python manage.py migrate

# 5. Importe os 75 capítulos da planilha
python manage.py import_planilha caminho/para/Cafe-com-Proposito-CONTEUDO-75-capitulos.xlsx

# 6. Crie o usuário administrador (o login da autora)
python manage.py createsuperuser

# 7. Rode o servidor
python manage.py runserver
```

- Painel admin: <http://localhost:8000/admin/>
- API: <http://localhost:8000/api/capitulos/>

## O painel da autora

Em `/admin/`, na seção **Conteúdo → Capítulos**, a autora pode:

- editar qualquer parte de um capítulo;
- **subir o MP3** da narração (coluna "áudio") — enquanto vazio, o app não
  mostra o botão "Ouvir";
- subir uma imagem/ilustração;
- definir **acesso ao áudio** (Gratuito para os Capítulos 1 e 2, Premium para o
  restante);
- publicar/despublicar.

Para reimportar a planilha atualizando o que já existe:

```bash
python manage.py import_planilha planilha.xlsx --substituir
```

## API (consumida pelo app)

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/capitulos/` | Lista de capítulos publicados |
| GET | `/api/capitulos/<numero>/` | Capítulo completo (8 partes) |
| GET | `/api/paginas-especiais/` | Páginas de abertura/encerramento |

## Próximos passos (a desenvolver)

1. **Autenticação do app** (cadastro, login Google/Apple, recuperação de senha)
   via `dj-rest-auth` + `django-allauth` + JWT.
2. **Endpoints de usuário:** anotações, favoritos e progresso (modelos já criados).
3. **Armazenamento em nuvem** dos áudios/imagens (Cloudflare R2 ou Backblaze B2)
   via `django-storages`.
4. **Deploy** no Render/Railway (Postgres + `DATABASE_URL` + `gunicorn`).
5. **Fase 2:** validação de assinatura (RevenueCat) e regra de áudio premium.

## Estrutura

```
cafe_backend/
├── manage.py
├── requirements.txt
├── .env.example
├── cafe_backend/          # configurações do projeto
├── content/              # capítulos + páginas especiais + API + importador
│   └── management/commands/import_planilha.py
└── engagement/           # anotações, favoritos, progresso
```
