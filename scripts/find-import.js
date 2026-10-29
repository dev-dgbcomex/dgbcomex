const fs = require('fs')
const s = fs.readFileSync('src/app/(dashboard)/wms/pedidos/page.tsx', 'utf8')
const idx = s.indexOf('mostrarImportarApi')
if (idx >= 0) {
  console.log(s.substring(idx-50, idx+200))
} else {
  console.log('not found')
}
