"""
Modelos de conteúdo do Café com Propósito.
Cada Capítulo segue o molde de 8 partes do livro.
"""
from django.db import models


class Chapter(models.Model):
    class Acesso(models.TextChoices):
        FREE = "free", "Gratuito"
        PREMIUM = "premium", "Premium (assinantes)"

    numero = models.PositiveIntegerField("número", unique=True, db_index=True)
    titulo = models.CharField("título", max_length=200)

    versiculo_texto = models.TextField("versículo-chave (texto)")
    versiculo_ref = models.CharField("referência do versículo", max_length=120, blank=True)

    reflexao = models.TextField(
        "reflexão", help_text="Cada linha em branco separa um parágrafo."
    )
    oracao = models.TextField("oração")
    aplicacao = models.TextField("aplicação prática")
    frase_guardar = models.TextField("frase para guardar no coração")
    referencias = models.TextField(
        "referências bíblicas complementares",
        blank=True,
        help_text="Uma referência por linha.",
    )

    audio = models.FileField(
        "áudio (narração)",
        upload_to="audios/",
        blank=True,
        null=True,
        help_text="Suba o MP3 da narração. Enquanto estiver vazio, o app não mostra o botão Ouvir.",
    )
    imagem = models.ImageField(
        "imagem/ilustração", upload_to="imagens/", blank=True, null=True
    )

    audio_acesso = models.CharField(
        "acesso ao áudio",
        max_length=10,
        choices=Acesso.choices,
        default=Acesso.PREMIUM,
        help_text="Capítulos 1 e 2 = Gratuito. Do 3 em diante = Premium. (A leitura é sempre livre.)",
    )
    publicado = models.BooleanField(
        "publicado", default=True, help_text="Desmarque para esconder do app."
    )

    criado_em = models.DateTimeField("criado em", auto_now_add=True)
    atualizado_em = models.DateTimeField("atualizado em", auto_now=True)

    class Meta:
        verbose_name = "capítulo"
        verbose_name_plural = "capítulos"
        ordering = ["numero"]

    def __str__(self):
        return f"Capítulo {self.numero} — {self.titulo}"

    @property
    def tem_audio(self):
        return bool(self.audio)


class SpecialPage(models.Model):
    """Páginas de abertura/encerramento (apresentação, contracapa, etc.)."""

    titulo = models.CharField("título", max_length=200)
    subtitulo = models.CharField("subtítulo", max_length=200, blank=True, default="")
    conteudo = models.TextField("conteúdo")
    audio = models.FileField(
        "áudio (narração)", upload_to="paginas/", null=True, blank=True
    )
    ordem = models.PositiveIntegerField("ordem", default=0)
    publicado = models.BooleanField("publicado", default=True)

    criado_em = models.DateTimeField("criado em", auto_now_add=True)
    atualizado_em = models.DateTimeField("atualizado em", auto_now=True)

    class Meta:
        verbose_name = "página especial"
        verbose_name_plural = "páginas especiais"
        ordering = ["ordem", "id"]

    def __str__(self):
        return self.titulo


class LembreteTexto(models.Model):
    """
    Frase de lembrete diário de leitura. A autora cadastra várias; o app baixa a
    lista e vai variando a mensagem a cada dia (o horário é escolhido pelo usuário
    e o agendamento acontece localmente no aparelho).
    """

    texto = models.CharField(
        "texto do lembrete",
        max_length=200,
        help_text="Mensagem curta e acolhedora (ex.: 'Reserve um tempo com Deus hoje ☕').",
    )
    ativo = models.BooleanField(
        "ativo", default=True, help_text="Desmarque para tirar esta frase do rodízio."
    )
    ordem = models.PositiveIntegerField("ordem", default=0)
    criado_em = models.DateTimeField("criado em", auto_now_add=True)

    class Meta:
        verbose_name = "texto de lembrete"
        verbose_name_plural = "textos de lembrete"
        ordering = ["ordem", "id"]

    def __str__(self):
        return self.texto


class Produto(models.Model):
    """
    Item da loja do Café com Propósito (livro físico, xícaras, camisetas, etc.).
    A autora cadastra pelo admin; o app mostra como vitrine. A venda em si (link
    de compra) fica para depois — por ora o app exibe "Em breve".
    """

    class Categoria(models.TextChoices):
        LIVRO = "livro", "Livro"
        XICARA = "xicara", "Xícara"
        CAMISETA = "camiseta", "Camiseta"
        OUTRO = "outro", "Outro"

    nome = models.CharField("nome", max_length=120)
    descricao = models.TextField("descrição", blank=True)
    preco = models.DecimalField(
        "preço",
        max_digits=8,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Opcional. Deixe em branco para não mostrar o preço.",
    )
    categoria = models.CharField(
        "categoria", max_length=10, choices=Categoria.choices, default=Categoria.OUTRO
    )
    imagem = models.ImageField("imagem", upload_to="produtos/", blank=True, null=True)
    link_compra = models.URLField(
        "link de compra",
        blank=True,
        help_text="Opcional (para o futuro). Enquanto vazio, o app mostra 'Em breve'.",
    )
    destaque = models.BooleanField(
        "destaque",
        default=False,
        help_text="Marque para dar evidência (ex.: o livro físico no topo da loja).",
    )
    ordem = models.PositiveIntegerField("ordem", default=0)
    publicado = models.BooleanField(
        "publicado", default=True, help_text="Desmarque para esconder da loja."
    )

    criado_em = models.DateTimeField("criado em", auto_now_add=True)
    atualizado_em = models.DateTimeField("atualizado em", auto_now=True)

    class Meta:
        verbose_name = "produto"
        verbose_name_plural = "produtos"
        ordering = ["-destaque", "ordem", "id"]

    def __str__(self):
        return self.nome


class Banner(models.Model):
    """
    Banner da tela inicial. Se nenhum banner ativo existir, o app mostra um banner
    padrão ("Conheça a Loja"). A autora pode personalizar o texto e/ou subir uma
    imagem, além de escolher para onde o toque leva.
    """

    class Destino(models.TextChoices):
        LOJA = "loja", "Abrir a Loja"
        LINK = "link_externo", "Abrir um link externo"
        CAPITULO = "capitulo", "Abrir um capítulo"
        NENHUM = "nenhum", "Não clicável"

    titulo = models.CharField(
        "título", max_length=120, blank=True,
        help_text="Texto do banner quando não houver imagem (ex.: 'Conheça a Loja').",
    )
    subtitulo = models.CharField(
        "subtítulo", max_length=200, blank=True,
        help_text="Linha de apoio abaixo do título.",
    )
    imagem = models.ImageField(
        "imagem", upload_to="banners/", blank=True, null=True,
        help_text="Opcional. Se enviar uma arte, ela aparece no lugar do texto.",
    )

    destino = models.CharField(
        "destino do toque", max_length=15, choices=Destino.choices, default=Destino.LOJA,
    )
    link_externo = models.URLField(
        "link externo", blank=True,
        help_text="Usado quando o destino é 'link externo'.",
    )
    capitulo_numero = models.PositiveIntegerField(
        "número do capítulo", null=True, blank=True,
        help_text="Usado quando o destino é 'abrir um capítulo'.",
    )

    ativo = models.BooleanField(
        "ativo", default=True,
        help_text="O app mostra o primeiro banner ativo (pela ordem). Desmarque para esconder.",
    )
    ordem = models.PositiveIntegerField("ordem", default=0)

    criado_em = models.DateTimeField("criado em", auto_now_add=True)
    atualizado_em = models.DateTimeField("atualizado em", auto_now=True)

    class Meta:
        verbose_name = "banner"
        verbose_name_plural = "banners"
        ordering = ["ordem", "id"]

    def __str__(self):
        return self.titulo or f"Banner {self.pk}"


class MusicaFundo(models.Model):
    """Faixa de música de fundo para a leitura. A autora cadastra várias; o app
    lista as ativas e o usuário escolhe uma para tocar por baixo da leitura/narração."""

    titulo = models.CharField("título", max_length=120)
    arquivo = models.FileField("arquivo de áudio", upload_to="musicas/")
    ativa = models.BooleanField(
        "ativa", default=True, help_text="Desmarque para tirar esta faixa do app."
    )
    ordem = models.PositiveIntegerField("ordem", default=0)
    criado_em = models.DateTimeField("criado em", auto_now_add=True)

    class Meta:
        verbose_name = "música de fundo"
        verbose_name_plural = "músicas de fundo"
        ordering = ["ordem", "id"]

    def __str__(self):
        return self.titulo
