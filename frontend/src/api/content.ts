import { API_URL, API_BASE } from './config';

async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`Erro ${res.status} ao acessar ${path}`);
  return (await res.json()) as T;
}

/** Converte um caminho de mídia (relativo em dev, absoluto no R2) em URL absoluta. */
export function mediaUrl(path: string | null): string | null {
  if (!path) return null;
  return path.startsWith('http') ? path : `${API_BASE}${path}`;
}

export type Paginated<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

export type ChapterListItem = {
  numero: number;
  titulo: string;
  versiculo_ref: string;
  audio_acesso: 'free' | 'premium';
  tem_audio: boolean;
};

export type Chapter = ChapterListItem & {
  versiculo_texto: string;
  reflexao: string;
  oracao: string;
  aplicacao: string;
  frase_guardar: string;
  referencias: string;
  referencias_lista: string[];
  audio: string | null;
  imagem: string | null;
};

export type SpecialPage = {
  id: number;
  titulo: string;
  subtitulo: string;
  conteudo: string;
  ordem: number;
  audio: string | null;
};

/** Busca todos os capítulos publicados, seguindo a paginação da API. */
export async function getAllChapters(): Promise<ChapterListItem[]> {
  const all: ChapterListItem[] = [];
  let page = 1;
  // segurança: no máximo 10 páginas (250 capítulos)
  for (let i = 0; i < 10; i++) {
    const data = await apiGet<Paginated<ChapterListItem>>(`/capitulos/?page=${page}`);
    all.push(...data.results);
    if (!data.next) break;
    page += 1;
  }
  return all;
}

/** Total de capítulos publicados (o livro cresce com o tempo — nada de número fixo). */
export async function getTotalCapitulos(): Promise<number> {
  const data = await apiGet<Paginated<ChapterListItem>>('/capitulos/?page=1');
  return data.count;
}

export const getChapter = (numero: number) =>
  apiGet<Chapter>(`/capitulos/${numero}/`);

export const getSpecialPages = () =>
  apiGet<Paginated<SpecialPage>>('/paginas-especiais/');

export type LembreteTexto = { id: number; texto: string };

/** Frases de lembrete cadastradas pela autora (endpoint público, sem paginação). */
export const getLembretes = () => apiGet<LembreteTexto[]>('/lembretes/');

export type ProdutoCategoria = 'livro' | 'xicara' | 'camiseta' | 'outro';

export type Produto = {
  id: number;
  nome: string;
  descricao: string;
  /** Preço vem como string do DRF (DecimalField) ou null quando não informado. */
  preco: string | null;
  categoria: ProdutoCategoria;
  imagem: string | null;
  link_compra: string;
  destaque: boolean;
};

/** Produtos da loja (endpoint público, sem paginação; já ordenados por destaque). */
export const getProdutos = () => apiGet<Produto[]>('/produtos/');

export type BannerDestino = 'loja' | 'link_externo' | 'capitulo' | 'nenhum';

export type Banner = {
  id: number;
  titulo: string;
  subtitulo: string;
  imagem: string | null;
  destino: BannerDestino;
  link_externo: string;
  capitulo_numero: number | null;
};

/** Banners ativos da tela inicial (o app usa o primeiro). */
export const getBanners = () => apiGet<Banner[]>('/banners/');

export type MusicaFundo = {
  id: number;
  titulo: string;
  url: string | null;
  ordem: number;
};

/** Faixas de música de fundo cadastradas pela autora (endpoint público). */
export const getMusicasFundo = () =>
  apiGet<Paginated<MusicaFundo>>('/musicas-fundo/');
