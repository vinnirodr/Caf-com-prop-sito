/**
 * API de autenticação. Conversa com /api/auth/ do backend e cuida do
 * refresh do token de acesso quando ele expira.
 */
import { API_URL } from './config';
import {
  getTokens,
  saveTokens,
  saveAccessToken,
  clearTokens,
  type Tokens,
} from '@/lib/storage';

export type Usuario = {
  id: number;
  nome: string;
  sobrenome: string;
  email: string;
  telefone: string;
  data_nascimento: string | null;
  notificacoes_ativas: boolean;
  premium: boolean;
  premium_ate?: string | null;
};

export type RegistroPayload = {
  nome: string;
  sobrenome: string;
  email: string;
  confirmar_email: string;
  telefone: string;
  data_nascimento: string | null;
  senha: string;
  confirmar_senha: string;
  aceite_termos: boolean;
};

/** Erro de API que carrega os erros de validação por campo (do DRF). */
export class ApiError extends Error {
  status: number;
  fields: Record<string, string[]>;
  constructor(status: number, fields: Record<string, string[]>, message: string) {
    super(message);
    this.status = status;
    this.fields = fields;
  }
}

/** Extrai a primeira mensagem amigável de uma resposta de erro do DRF. */
function primeiraMensagem(data: any): string {
  if (!data) return 'Algo não deu certo. Tente de novo.';
  if (typeof data.detail === 'string') return data.detail;
  for (const v of Object.values(data)) {
    if (Array.isArray(v) && v.length) return String(v[0]);
    if (typeof v === 'string') return v;
  }
  return 'Algo não deu certo. Tente de novo.';
}

const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const disparar = () =>
    fetch(`${API_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body),
    });

  // O backend (Render free) hiberna; a 1ª requisição pode falhar (rede) ou voltar
  // 502/503/504 enquanto acorda. Tentamos até 3x com uma pausinha, antes de desistir.
  let res: Response | null = null;
  for (let tentativa = 0; tentativa < 3; tentativa++) {
    try {
      res = await disparar();
    } catch {
      res = null; // erro de rede — provável cold start
    }
    const acordando = !res || res.status === 502 || res.status === 503 || res.status === 504;
    if (!acordando) break;
    if (tentativa < 2) await espera(3000);
  }
  if (!res) {
    throw new ApiError(0, {}, 'Sem conexão com o servidor. Tente de novo em instantes.');
  }
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(res.status, (data as any) ?? {}, primeiraMensagem(data));
  }
  return data as T;
}

type AuthResposta = { access: string; refresh: string; user: Usuario };

export async function login(email: string, senha: string): Promise<AuthResposta> {
  const data = await postJson<AuthResposta>('/auth/login/', { email, senha });
  await saveTokens({ access: data.access, refresh: data.refresh });
  return data;
}

export async function registrar(payload: RegistroPayload): Promise<AuthResposta> {
  const data = await postJson<AuthResposta>('/auth/registro/', payload);
  await saveTokens({ access: data.access, refresh: data.refresh });
  return data;
}

export async function esqueciSenha(email: string): Promise<void> {
  await postJson<{ detail: string }>('/auth/esqueci-senha/', { email });
}

export async function redefinirSenha(
  email: string,
  codigo: string,
  nova_senha: string
): Promise<void> {
  await postJson<{ detail: string }>('/auth/redefinir-senha/', { email, codigo, nova_senha });
}

export async function loginGoogle(idToken: string): Promise<Usuario> {
  const data = await postJson<AuthResposta>('/auth/google/', { id_token: idToken });
  await saveTokens({ access: data.access, refresh: data.refresh });
  return data.user;
}

/** Tenta renovar o access token usando o refresh. Retorna o novo access ou null. */
async function tentarRefresh(tokens: Tokens): Promise<string | null> {
  try {
    const res = await fetch(`${API_URL}/auth/refresh/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh: tokens.refresh }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { access: string };
    await saveAccessToken(data.access);
    return data.access;
  } catch {
    return null;
  }
}

/**
 * Fetch autenticado: injeta o Bearer e, em 401, tenta o refresh uma vez.
 * Se o refresh falhar, limpa os tokens (sessão expirada) e lança erro.
 */
export async function authFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const tokens = await getTokens();
  if (!tokens) throw new ApiError(401, {}, 'Sem sessão.');

  const comAuth = (access: string): RequestInit => ({
    ...options,
    headers: { ...(options.headers ?? {}), Authorization: `Bearer ${access}`, Accept: 'application/json' },
  });

  let res = await fetch(`${API_URL}${path}`, comAuth(tokens.access));
  if (res.status === 401) {
    const novo = await tentarRefresh(tokens);
    if (!novo) {
      await clearTokens();
      throw new ApiError(401, {}, 'Sessão expirada.');
    }
    res = await fetch(`${API_URL}${path}`, comAuth(novo));
  }
  return res;
}

export async function buscarEu(): Promise<Usuario> {
  const res = await authFetch('/auth/eu/');
  if (!res.ok) throw new ApiError(res.status, {}, 'Não foi possível carregar a conta.');
  return (await res.json()) as Usuario;
}

export async function sair(): Promise<void> {
  await clearTokens();
}

export type PerfilPatch = Partial<
  Pick<Usuario, 'nome' | 'sobrenome' | 'telefone' | 'data_nascimento'>
>;

/** Lê o JSON e lança ApiError com a mensagem do backend quando !ok. */
async function lerOuErro<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, (data as any) ?? {}, primeiraMensagem(data));
  return data as T;
}

export async function atualizarPerfil(patch: PerfilPatch): Promise<Usuario> {
  const res = await authFetch('/auth/eu/', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  });
  return lerOuErro<Usuario>(res);
}

export async function trocarSenha(senha_atual: string, nova_senha: string): Promise<void> {
  const res = await authFetch('/auth/trocar-senha/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ senha_atual, nova_senha }),
  });
  await lerOuErro<unknown>(res);
}

export async function trocarEmail(novo_email: string, senha_atual: string): Promise<Usuario> {
  const res = await authFetch('/auth/trocar-email/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ novo_email, senha_atual }),
  });
  return lerOuErro<Usuario>(res);
}

export async function excluirConta(senha: string): Promise<void> {
  const res = await authFetch('/auth/excluir-conta/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ senha }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new ApiError(res.status, (data as any) ?? {}, primeiraMensagem(data));
  }
}
