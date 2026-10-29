const fs = require('fs')
const s = fs.readFileSync('src/app/(dashboard)/wms/pedidos/page.tsx', 'utf8')
const idx = s.indexOf('flex items-center justify-between')
if (idx >= 0) {
  const start = Math.max(0, idx - 100)
  const end = Math.min(s.length, idx + 600)
  console.log(s.substring(start, end))
} else {
  console.log('not found')
}
