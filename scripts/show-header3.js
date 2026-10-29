const fs = require('fs')
const s = fs.readFileSync('src/app/(dashboard)/wms/pedidos/page.tsx', 'utf8')
const idx = s.indexOf('flex flex-col lg:flex-row')
if (idx >= 0) {
  console.log(s.substring(idx-150, idx+150))
}
