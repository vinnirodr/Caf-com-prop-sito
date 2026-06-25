from django.urls import path

from . import views

urlpatterns = [
    path("favoritos/", views.FavoriteList.as_view(), name="favoritos"),
    path("favoritos/<int:numero>/", views.FavoriteDetail.as_view(), name="favorito-detalhe"),
    path("anotacoes/", views.NoteList.as_view(), name="anotacoes"),
    path("anotacoes/<int:pk>/", views.NoteDetail.as_view(), name="anotacao-detalhe"),
    path("progresso/", views.ProgressList.as_view(), name="progresso"),
    path("progresso/<int:numero>/", views.ProgressDetail.as_view(), name="progresso-detalhe"),
    path("resumo/", views.Resumo.as_view(), name="resumo"),
]
