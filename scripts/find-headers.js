const fs = require('fs')
const s = fs.readFileSync('src/app/(dashboard)/wms/pedidos/page.tsx', 'utf8')
const re = /justify-between/g
let m, c=0
while((m=re.exec(s)) && c<5){
  console.log(c + ': ' + m.index)
  c++
}
