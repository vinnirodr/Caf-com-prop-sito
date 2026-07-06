import { API_URL } from './config';

async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`Erro ${res.status} ao acessar ${path}`);
  return (await res.json()) as T;
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
  conteudo: string;
  ordem: number;
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

export const getChapter = (numero: number) =>
  apiGet<Chapter>(`/capitulos/${numero}/`);

export const getSpecialPages = () =>
  apiGet<Paginated<SpecialPage>>('/paginas-especiais/');

export type LembreteTexto = { id: number; texto: string };

/** Frases de lembrete cadastradas pela autora (endpoint público, sem paginação). */
export const getLembretes = () => apiGet<LembreteTexto[]>('/lembretes/');
