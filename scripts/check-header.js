const fs = require('fs')
const s = fs.readFileSync('src/app/(dashboard)/wms/pedidos/page.tsx', 'utf8')
const idx = s.indexOf('BotaoVoltar')
if (idx >= 0) {
  const start = Math.max(0, idx - 200)
  const end = Math.min(s.length, idx + 400)
  console.log(s.substring(start, end))
} else {
  console.log('not found')
}
