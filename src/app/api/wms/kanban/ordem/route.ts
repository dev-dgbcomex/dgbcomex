import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { requisitarWms } from '@/lib/wms/cliente';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;
    const { searchParams } = req.nextUrl;
    const tipo = searchParams.get('tipo') || '';
    const colunas = searchParams.get('colunas') || '';
    const dados = await requisitarWms<Record<string, Record<string, number>>>(`/wms/kanban/ordem?tipo=${encodeURIComponent(tipo)}&colunas=${encodeURIComponent(colunas)}`);
    return NextResponse.json(dados);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Erro ao buscar ordem do kanban';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
