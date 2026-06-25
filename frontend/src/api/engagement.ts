/**
 * API de engajamento (favoritos, anotações, progresso, resumo).
 * Tudo autenticado — usa `authFetch` (Bearer + refresh em 401) de `api/auth`.
 */
import { authFetch, ApiError } from './auth';

export type Favorito = {
  capitulo: number;
  titulo: string;
  versiculo_ref: string;
  tem_audio: boolean;
  audio_acesso: 'free' | 'premium';
  criado_em: string;
};

export type Anotacao = {
  id: number;
  capitulo: number;
  capitulo_titulo: string;
  versiculo_ref: string;
  texto: string;
  criado_em: string;
  atualizado_em: string;
};

export type Progresso = {
  capitulo: number;
  titulo: string;
  versiculo_ref: string;
  lido: boolean;
  ouvido: boolean;
  posicao_audio_seg: number;
  ultimo_acesso: string;
};

export type Resumo = { total: number; lidos: number; favoritos: number; anotacoes: number };

async function json<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await authFetch(path, options);
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new ApiError(res.status, (data as any) ?? {}, 'Não foi possível concluir a ação.');
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

const body = (data: unknown): RequestInit => ({
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data),
});

// Favoritos
export const listarFavoritos = () => json<Favorito[]>('/favoritos/');
export const adicionarFavorito = (capitulo: number) =>
  json<Favorito>('/favoritos/', body({ capitulo }));
export const removerFavorito = (capitulo: number) =>
  json<void>(`/favoritos/${capitulo}/`, { method: 'DELETE' });

// Anotações
export const listarAnotacoes = (capitulo?: number) =>
  json<Anotacao[]>(`/anotacoes/${capitulo ? `?capitulo=${capitulo}` : ''}`);
export const criarAnotacao = (capitulo: number, texto: string) =>
  json<Anotacao>('/anotacoes/', body({ capitulo, texto }));
export const editarAnotacao = (id: number, texto: string) =>
  json<Anotacao>(`/anotacoes/${id}/`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ texto }) });
export const excluirAnotacao = (id: number) =>
  json<void>(`/anotacoes/${id}/`, { method: 'DELETE' });

// Progresso
export const listarProgresso = () => json<Progresso[]>('/progresso/');
export const marcarProgresso = (
  capitulo: number,
  dados: { lido?: boolean; ouvido?: boolean; posicao_audio_seg?: number }
) =>
  json<Progresso>(`/progresso/${capitulo}/`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dados),
  });

// Resumo (jornada)
export const obterResumo = () => json<Resumo>('/resumo/');
