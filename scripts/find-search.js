const fs = require('fs')
const s = fs.readFileSync('src/app/(dashboard)/wms/pedidos/page.tsx', 'utf8')
const idx = s.indexOf('Search')
if (idx >= 0) {
  console.log(s.substring(idx-100, idx+200))
}
