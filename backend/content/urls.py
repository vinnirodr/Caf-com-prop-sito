from django.urls import path

from . import views

urlpatterns = [
    path("capitulos/", views.ChapterList.as_view(), name="chapter-list"),
    path("capitulos/<int:numero>/", views.ChapterDetail.as_view(), name="chapter-detail"),
    path("paginas-especiais/", views.SpecialPageList.as_view(), name="specialpage-list"),
    path("lembretes/", views.LembreteList.as_view(), name="lembrete-list"),
]
