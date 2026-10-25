import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { requisitarWms } from '@/lib/wms/cliente';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;
    const body = await req.json();
    const dados = await requisitarWms('/wms/kanban/reordenar', { metodo: 'POST', corpo: body });
    return NextResponse.json(dados);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Erro ao reordenar';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
