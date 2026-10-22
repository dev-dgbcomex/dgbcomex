const {Pool}=require('pg');require('dotenv').config({path:'.env.local'});
const src=new Pool({connectionString:process.env.DATABASE_URL});
const dst=new Pool({connectionString:process.env.DATABASE_URL_LOCAL});
(async()=>{
  const schemas=['public','marts','auth','etl'];let ok=0,div=0,divs=[];
  for(const s of schemas){
    const{rows:t}=await src.query("select table_name from information_schema.tables where table_schema=$1 and table_type='BASE TABLE' order by table_name",[s]);
    for(const r of t){
      const q='select count(*)::int c from "'+s+'"."'+r.table_name+'"';
      let c1,c2;
      try{const a=await src.query(q);c1=a.rows[0].c;}catch(e){c1='E'}
      try{const b=await dst.query(q);c2=b.rows[0].c;}catch(e){c2='E'}
      if(c1===c2)ok++; else{div++;if(divs.length<12)divs.push(s+'.'+r.table_name+':'+c1+'/'+c2);}
    }
  }
  console.log('IGUAL:'+ok+' DIVERG:'+div);
  divs.forEach(x=>console.log(x));
  await src.end();await dst.end();
})();
