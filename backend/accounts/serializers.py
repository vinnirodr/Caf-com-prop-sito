"""Serializers de autenticação: cadastro, login (por e-mail) e perfil."""
from django.contrib.auth import authenticate, get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from rest_framework_simplejwt.tokens import RefreshToken

from .models import Profile

User = get_user_model()


def tokens_para(user):
    """Gera o par de tokens (access + refresh) para um usuário."""
    refresh = RefreshToken.for_user(user)
    return {"access": str(refresh.access_token), "refresh": str(refresh)}


class UserSerializer(serializers.ModelSerializer):
    nome = serializers.CharField(source="first_name")
    sobrenome = serializers.CharField(source="last_name")
    telefone = serializers.CharField(source="perfil.telefone", default="", read_only=True)
    data_nascimento = serializers.DateField(
        source="perfil.data_nascimento", read_only=True, allow_null=True
    )
    notificacoes_ativas = serializers.BooleanField(
        source="perfil.notificacoes_ativas", read_only=True
    )

    class Meta:
        model = User
        fields = ["id", "nome", "sobrenome", "email", "telefone", "data_nascimento", "notificacoes_ativas"]


class AtualizarPerfilSerializer(serializers.Serializer):
    """Edição dos dados básicos do usuário logado (não mexe no e-mail/senha)."""

    nome = serializers.CharField(source="first_name", max_length=150, required=False)
    sobrenome = serializers.CharField(
        source="last_name", max_length=150, required=False, allow_blank=True
    )
    telefone = serializers.CharField(max_length=20, required=False, allow_blank=True)
    data_nascimento = serializers.DateField(required=False, allow_null=True)

    def update(self, instance, validated_data):
        campos_user = []
        if "first_name" in validated_data:
            instance.first_name = validated_data["first_name"].strip()
            campos_user.append("first_name")
        if "last_name" in validated_data:
            instance.last_name = validated_data["last_name"].strip()
            campos_user.append("last_name")
        if campos_user:
            instance.save(update_fields=campos_user)

        perfil = instance.perfil
        campos_perfil = []
        if "telefone" in validated_data:
            perfil.telefone = validated_data["telefone"]
            campos_perfil.append("telefone")
        if "data_nascimento" in validated_data:
            perfil.data_nascimento = validated_data["data_nascimento"]
            campos_perfil.append("data_nascimento")
        if campos_perfil:
            perfil.save(update_fields=campos_perfil)
        return instance


class TrocarSenhaSerializer(serializers.Serializer):
    senha_atual = serializers.CharField(write_only=True)
    nova_senha = serializers.CharField(write_only=True, min_length=8)

    def validate_senha_atual(self, value):
        if not self.context["request"].user.check_password(value):
            raise serializers.ValidationError("Senha atual incorreta.")
        return value

    def validate_nova_senha(self, value):
        validate_password(value, user=self.context["request"].user)
        return value

    def save(self, **kwargs):
        user = self.context["request"].user
        user.set_password(self.validated_data["nova_senha"])
        user.save(update_fields=["password"])
        return user


class RegisterSerializer(serializers.Serializer):
    nome = serializers.CharField(max_length=150)
    sobrenome = serializers.CharField(max_length=150, allow_blank=True, required=False)
    # Limitado a 150 porque o e-mail também é usado como `username` do Django
    # (max 150). Evita um 500 no banco com e-mails muito longos — devolve 400.
    email = serializers.EmailField(max_length=150)
    confirmar_email = serializers.EmailField(max_length=150)
    telefone = serializers.CharField(max_length=20, allow_blank=True, required=False)
    data_nascimento = serializers.DateField(required=False, allow_null=True)
    senha = serializers.CharField(write_only=True, min_length=8)
    confirmar_senha = serializers.CharField(write_only=True)
    aceite_termos = serializers.BooleanField()

    def validate_email(self, value):
        value = value.strip().lower()
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("Já existe uma conta com este e-mail.")
        return value

    def validate_aceite_termos(self, value):
        if not value:
            raise serializers.ValidationError(
                "É preciso aceitar os Termos de uso e a Política de privacidade."
            )
        return value

    def validate(self, attrs):
        if attrs["email"].strip().lower() != attrs["confirmar_email"].strip().lower():
            raise serializers.ValidationError({"confirmar_email": "Os e-mails não conferem."})
        if attrs["senha"] != attrs["confirmar_senha"]:
            raise serializers.ValidationError({"confirmar_senha": "As senhas não conferem."})
        validate_password(attrs["senha"])
        return attrs

    def create(self, validated_data):
        email = validated_data["email"].strip().lower()
        user = User(
            username=email,
            email=email,
            first_name=validated_data["nome"].strip(),
            last_name=validated_data.get("sobrenome", "").strip(),
        )
        user.set_password(validated_data["senha"])
        user.save()  # o signal cria o Profile

        perfil = user.perfil
        perfil.telefone = validated_data.get("telefone", "")
        perfil.data_nascimento = validated_data.get("data_nascimento")
        perfil.save()
        return user


class PushTokenSerializer(serializers.Serializer):
    push_token = serializers.CharField(max_length=200)
    notificacoes_ativas = serializers.BooleanField(required=False, default=True)


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    senha = serializers.CharField(write_only=True)

    def validate(self, attrs):
        email = attrs["email"].strip().lower()
        invalido = serializers.ValidationError("E-mail ou senha incorretos.")

        match = User.objects.filter(email__iexact=email).order_by("id").first()
        if match is None:
            raise invalido
        user = authenticate(username=match.username, password=attrs["senha"])
        if user is None:
            raise invalido
        if not user.is_active:
            raise serializers.ValidationError("Esta conta está inativa.")
        attrs["user"] = user
        return attrs
