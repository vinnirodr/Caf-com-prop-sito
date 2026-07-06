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
    conteudo = models.TextField("conteúdo")
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
