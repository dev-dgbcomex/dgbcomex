const fs = require('fs')
const s = fs.readFileSync('src/app/(dashboard)/wms/pedidos/page.tsx', 'utf8')
const idx = s.indexOf('flex flex-col')
if (idx >= 0) {
  console.log(s.substring(idx-80, idx+250))
}
