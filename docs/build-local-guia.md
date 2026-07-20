# Guia — Gerar AAB/APK localmente e publicar na Play (build local + eas submit)

> **Para quem:** a sessão que for gerar o build numa máquina com mais CPU/RAM.
> **Por quê:** a cota de builds em nuvem do EAS (plano free) zera todo mês (renova
> ~dia 1º). Build **local** não consome cota e é ilimitado. `eas submit` (upload pra
> Play) também **não** consome cota.
> **Máquina de referência anterior:** Mac Intel (x86_64, 8 núcleos) — 1º build local
> levou ~1h só por causa da recompilação nativa (reanimated/worklets). Numa máquina
> mais forte / Apple Silicon, é bem mais rápido; e o 2º build em diante usa cache.

---

## 0. Pré-requisitos (instalar 1x na máquina nova)

### a) Node 20 + eas-cli
- Node **v20.20.2** (via nvm recomendado). eas-cli roda via `npx eas` (não precisa global).
- Login no EAS: `npx eas login` (conta **vinigreg**). Confirme: `npx eas whoami`.

### b) JDK 17 + Android SDK/NDK
No macOS com Homebrew (equivale ao que foi feito na máquina antiga):
```bash
brew install openjdk@17
brew install --cask android-commandlinetools

export JAVA_HOME="$(brew --prefix openjdk@17)/libexec/openjdk.jdk/Contents/Home"
export ANDROID_HOME="/usr/local/share/android-commandlinetools"   # Apple Silicon: /opt/homebrew/share/android-commandlinetools
export PATH="$ANDROID_HOME/platform-tools:$JAVA_HOME/bin:$PATH"

# aceitar licenças e instalar os componentes
SDKM="$ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager"
yes | "$SDKM" --licenses
"$SDKM" "platform-tools" "platforms;android-36" "build-tools;36.0.0"
```
- O **NDK** (`27.1.12297006`) é baixado automaticamente pelo Gradle no 1º build — não
  precisa instalar à mão, mas exige rede e ~2 GB.
- (Windows/Linux: instalar JDK 17, Android SDK cmdline-tools, e exportar `JAVA_HOME`/
  `ANDROID_HOME` equivalentes. O resto dos comandos é igual.)

### c) ⚠️ A credencial secreta do Play (NÃO está no git)
O `eas submit` usa a chave da conta de serviço do Google Play, que é **git-ignorada**
de propósito (segredo). Ela existe só nas máquinas onde foi colocada à mão:
- Caminho no repo: `frontend/credentials/play-publisher.json`
- Conta de serviço: `play-publisher@winged-ray-442120-v2.iam.gserviceaccount.com`
- **Como levar pra máquina nova:** copie o arquivo por um canal seguro (AirDrop, gerenciador
  de senhas, pendrive) e coloque em `frontend/credentials/play-publisher.json`. **NUNCA
  commitar.** (A pasta `credentials/` já está no `.gitignore`.)
- Se não tiver o arquivo: dá pra baixar de novo no Google Cloud → projeto
  `winged-ray-442120-v2` → IAM → Contas de serviço → `play-publisher` → Chaves →
  Adicionar chave → JSON. (A permissão no Play Console já está concedida.)
- A **Google Play Android Developer API** já foi ativada nesse projeto GCP (só ativar de
  novo se criar outro projeto).

---

## 1. Preparar o repo
```bash
cd "<repo>"
git checkout main && git fetch origin && git pull    # pega tudo que as duas sessões subiram
```
Confirme a `main` com o trabalho esperado (ver COORDENACAO.md). O `versionCode` é
**automático** (`appVersionSource: remote` no eas.json) — cada build incrementa sozinho.

## 2. Gerar o AAB (produção → Play) OU APK (teste avulso)
```bash
cd frontend
source ~/.nvm/nvm.sh && nvm use v20.20.2
export JAVA_HOME="$(brew --prefix openjdk@17)/libexec/openjdk.jdk/Contents/Home"
export ANDROID_HOME="/usr/local/share/android-commandlinetools"   # ajustar em Apple Silicon
export PATH="$ANDROID_HOME/platform-tools:$JAVA_HOME/bin:$PATH"

# AAB de produção (é o que vai pra Play):
npx eas build --local --profile production --platform android --output ./build-producao.aab

# (alternativa) APK pra instalar direto no celular, sem Play:
# npx eas build --local --profile preview --platform android --output ./build-preview.apk
```
- 1º build é o lento (baixa NDK + compila libs nativas). Os próximos usam cache.
- **Acompanhar:** Monitor de Atividade (CPU alta = compilando; zerou = acabou), ou
  `ls -lh frontend/build-producao.aab` (o arquivo aparece quando termina).
- Perfis (já configurados em `frontend/eas.json`): `production` = **app-bundle (.aab)**,
  `preview` = **apk**. Ambos já têm `EXPO_PUBLIC_API_BASE` (prod) e a chave pública do
  RevenueCat nas `env`.

## 3. Publicar no teste interno da Play (automático)
```bash
cd frontend
npx eas submit --platform android --path ./build-producao.aab
```
- Usa `submit.production.android` do eas.json: **track internal**, releaseStatus
  **completed** (já sai disponível pros testadores, sem rascunho).
- **Não consome cota de build.** Precisa só da credencial do passo 0c.
- Notas da versão: opcional — editar depois no Play Console se quiser.

## 4. (Opcional) Fluxo unificado, quando estiver na nuvem de novo
Quando a cota do EAS renovar (ou com plano pago), o fluxo vira **um comando**:
```bash
npx eas build --profile production --platform android --auto-submit
```
(build na nuvem + submit automático). Local + `eas submit` é o equivalente offline disso.

---

## Erros comuns
- **`Google Play Android Developer API has not been used...`** → ativar a API no projeto
  GCP `winged-ray-442120-v2` e esperar ~5 min. (Já ativada; só reincide em projeto novo.)
- **`build command failed` + "used its Android builds from the Free plan"** → é build em
  **nuvem** sem cota. Use `--local` (este guia) ou espere a renovação (~dia 1º).
- **`Unable to locate a Java Runtime`** → `JAVA_HOME` não exportado (passo 0b).
- **submit falha por falta da chave** → o `play-publisher.json` não está em
  `frontend/credentials/` (passo 0c).
- **versionCode duplicado na Play** → não deveria acontecer (auto-incrementa via remote);
  se acontecer, é build antigo — gere um novo.

## Checklist rápido
- [ ] `git pull` na main
- [ ] `frontend/credentials/play-publisher.json` presente
- [ ] `JAVA_HOME`/`ANDROID_HOME` exportados, Node 20
- [ ] `eas build --local ... --output ./build-producao.aab`
- [ ] `eas submit --platform android --path ./build-producao.aab`
- [ ] conferir no Play Console → Teste interno → nova versão publicada
