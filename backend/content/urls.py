from django.urls import path

from . import views

urlpatterns = [
    path("capitulos/", views.ChapterList.as_view(), name="chapter-list"),
    path("capitulos/<int:numero>/", views.ChapterDetail.as_view(), name="chapter-detail"),
    path("paginas-especiais/", views.SpecialPageList.as_view(), name="specialpage-list"),
    path("lembretes/", views.LembreteList.as_view(), name="lembrete-list"),
    path("produtos/", views.ProdutoList.as_view(), name="produto-list"),
    path("banners/", views.BannerList.as_view(), name="banner-list"),
]
