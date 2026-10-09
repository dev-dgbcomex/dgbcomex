import type { GrupoFaturamento, OrientacaoPdf } from './types'
import { formatarData, formatarMetragem, formatarPeso, formatarValor } from './utils'

export async function loadImage(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => {
      const proxy = '/api/proxy-image?url=' + encodeURIComponent(url)
      const img2 = new Image()
      img2.crossOrigin = 'anonymous'
      img2.onload = () => resolve(img2)
      img2.onerror = () => resolve(null)
      img2.src = proxy
    }
    img.src = url
  })
}

export async function carregarEmpresa(): Promise<{ empresa: Record<string, any> | null; logoImg: HTMLImageElement | null }> {
  try {
    const res = await fetch('/api/admin/config/empresa')
    const list = await res.json()
    const empresa = list.find((e: any) => e.isDefault) || list[0]
    let logoImg: HTMLImageElement | null = null
    if (empresa?.logoUrl) logoImg = await loadImage(empresa.logoUrl)
    return { empresa, logoImg }
  } catch {
    return { empresa: null, logoImg: null }
  }
}

export async function criarDocPdf(orient: OrientacaoPdf) {
  const { default: jsPDF } = await import('jspdf')
  await import('jspdf-autotable')
  const doc = new jsPDF(orient)
  const pageWidth = doc.internal.pageSize.getWidth()
  const isLandscape = orient === 'landscape'
  return { doc, isLandscape, pageWidth }
}

export async function renderGrupoPdf(doc: any, grupo: GrupoFaturamento, isLandscape: boolean, pageWidth: number, empresa: Record<string, any> | null, logoImg: HTMLImageElement | null) {
  const margin = 8
  let y = margin
  if (empresa) {
    const headerH = isLandscape ? 30 : 28
    doc.setFillColor(7, 63, 184)
    doc.rect(0, 0, pageWidth, headerH, 'F')
    if (logoImg) {
      const maxW = isLandscape ? 35 : 30
      const maxH = isLandscape ? 18 : 15
      const scale = Math.min(maxW / logoImg.width, maxH / logoImg.height, 1)
      doc.addImage(logoImg, 'PNG', margin, y + 2, logoImg.width * scale, logoImg.height * scale)
    }
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(isLandscape ? 12 : 11).setFont('helvetica', 'bold')
    doc.text(empresa.nome || '', isLandscape ? 48 : 42, y + 4)
    doc.setFontSize(isLandscape ? 8 : 7.5).setFont('helvetica', 'normal')
    let yOff = y + 8
    if (empresa.documento) { doc.text('CNPJ: ' + empresa.documento, isLandscape ? 48 : 42, yOff); yOff += 3.5 }
    if (empresa.endereco) { doc.text(empresa.endereco, isLandscape ? 48 : 42, yOff); yOff += 3.5 }
    if (empresa.cidade || empresa.uf) { doc.text([empresa.cidade, empresa.uf].filter(Boolean).join('/'), isLandscape ? 48 : 42, yOff) }
    doc.setTextColor(0, 0, 0)
    y = headerH + 6
  } else {
    y = isLandscape ? 18 : 16
  }

  doc.setFillColor(7, 63, 184)
  doc.roundedRect(margin, y - 4, pageWidth - margin * 2, 11, 2, 2, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(isLandscape ? 12 : 11).setFont('helvetica', 'bold')
  doc.text('FATURAMENTO - NF ' + grupo.empresa + '-' + grupo.nr_nota, margin + 3, y + 4.5)
  doc.setTextColor(0, 0, 0)

  y += 10
  const fsTit = isLandscape ? 7.5 : 7
  const fsVal = isLandscape ? 7 : 6.5
  doc.setFontSize(fsTit).setFont('helvetica', 'bold')
  doc.text('CLIENTE', margin + 2, y)
  doc.setFont('helvetica', 'normal').setFontSize(fsVal)
  doc.text(grupo.cliente + ' - ' + grupo.nome_cliente, margin + 2, y + 4)
  doc.setFont('helvetica', 'bold').setFontSize(fsTit)
  doc.text('REPRESENTANTE', margin + 2, y + 9)
  doc.setFont('helvetica', 'normal').setFontSize(fsVal)
  doc.text(grupo.representante + (grupo.representante_codigo ? ' (' + grupo.representante_codigo + ')' : ''), margin + 2, y + 13)
  doc.setFont('helvetica', 'bold').setFontSize(fsTit)
  doc.text('DADOS', pageWidth - margin - 70, y)
  doc.setFont('helvetica', 'normal').setFontSize(fsVal)
  doc.text('Data: ' + formatarData(grupo.data_nota), pageWidth - margin - 70, y + 4)
  if (grupo.romaneio) doc.text('Romaneio: ' + grupo.romaneio, pageWidth - margin - 70, y + 8)
  doc.text('Itens: ' + grupo.totalItens, pageWidth - margin - 70, y + 12)
  y += 20

  const cabecalho = isLandscape
    ? ['Pedido', 'Item', 'Produto', 'Romaneio', 'Metros', 'Vlr. unit.', 'Vlr. total', 'Acres/Desc', 'Peso']
    : ['Pedido', 'Item', 'Produto', 'Metros', 'Vlr. total', 'Peso']
  const corpo = grupo.itens.map((item) =>
    isLandscape
      ? [
          item.pedido,
          String(item.item),
          item.cod_produto,
          item.romaneio,
          formatarMetragem(item.metros),
          formatarValor(item.vr_unitario),
          formatarValor(item.vr_total),
          formatarValor(item.acres_desc),
          formatarPeso(item.peso),
        ]
      : [
          item.pedido,
          String(item.item),
          item.cod_produto,
          formatarMetragem(item.metros),
          formatarValor(item.vr_total),
          formatarPeso(item.peso),
        ]
  )
  const totais = isLandscape
    ? ['', '', 'TOTAL', '', formatarMetragem(grupo.totalMetros), '', formatarValor(grupo.totalVrTotal), formatarValor(grupo.totalAcresDesc), formatarPeso(grupo.totalPeso)]
    : ['', '', 'TOTAL', formatarMetragem(grupo.totalMetros), formatarValor(grupo.totalVrTotal), formatarPeso(grupo.totalPeso)]

  doc.autoTable({
    startY: y,
    head: [cabecalho],
    body: [...corpo, totais],
    styles: { fontSize: isLandscape ? 7 : 6.5, cellPadding: 1.5 },
    headStyles: { fillColor: [226, 232, 240], textColor: [15, 23, 42], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    didParseCell: (data: { section: string; row: { index: number } }) =>
      data.row.index === corpo.length ? { styles: { fontStyle: 'bold' } } : {},
    margin: { left: margin, right: margin },
  })
}

export async function gerarPdfGrupo(grupo: GrupoFaturamento, orient: OrientacaoPdf): Promise<void> {
  const { doc, isLandscape, pageWidth } = await criarDocPdf(orient)
  const { empresa, logoImg } = await carregarEmpresa()
  await renderGrupoPdf(doc, grupo, isLandscape, pageWidth, empresa, logoImg)
  doc.save('faturamento_nf_' + grupo.empresa + '_' + grupo.nr_nota + '.pdf')
}

export async function gerarPdfConsolidado(grupos: GrupoFaturamento[], chaves: string[], orient: OrientacaoPdf): Promise<void> {
  const { doc, isLandscape, pageWidth } = await criarDocPdf(orient)
  const { empresa, logoImg } = await carregarEmpresa()
  const distintas = [...new Set(chaves)]
  let paginas = 0
  for (const chave of distintas) {
    const grupo = grupos.find((g) => g.chave_nf === chave)
    if (!grupo) continue
    if (paginas > 0) doc.addPage()
    await renderGrupoPdf(doc, grupo, isLandscape, pageWidth, empresa, logoImg)
    paginas++
  }
  const carimbo = new Date().toLocaleString('pt-BR')
  const margem = 8
  const altura = doc.internal.pageSize.getHeight()
  const largura = doc.internal.pageSize.getWidth()
  const totalPaginas = doc.getNumberOfPages()
  for (let p = 1; p <= totalPaginas; p++) {
    doc.setPage(p)
    doc.setFontSize(7)
    doc.setTextColor(120, 120, 120)
    doc.text('Gerado em ' + carimbo, margem, altura - 6)
    doc.text('Pagina ' + p + '/' + totalPaginas, largura - margem, altura - 6, { align: 'right' })
  }
  doc.setTextColor(0, 0, 0)
  doc.save(
    distintas.length === 1 && grupos.find((g) => g.chave_nf === distintas[0])
      ? 'faturamento_nf_' + grupos.find((g) => g.chave_nf === distintas[0])!.empresa + '_' + grupos.find((g) => g.chave_nf === distintas[0])!.nr_nota + '.pdf'
      : 'faturamento_notas_consolidado.pdf'
  )
}
