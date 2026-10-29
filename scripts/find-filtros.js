const fs = require('fs')
const s = fs.readFileSync('src/app/(dashboard)/wms/pedidos/page.tsx', 'utf8')
const idx = s.indexOf('Busca por pedido')
if (idx >= 0) {
  console.log(s.substring(idx-200, idx+100))
}
