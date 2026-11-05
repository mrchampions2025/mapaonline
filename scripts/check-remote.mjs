// Comprobación de lectura y permisos. No crea usuarios ni envía correos.
import assert from 'node:assert/strict'
import { createClient } from '@supabase/supabase-js'
process.loadEnvFile('.env.local')
const client=createClient(process.env.VITE_SUPABASE_URL,process.env.VITE_SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:false}})
const {data,error}=await client.rpc('atlas_districts')
assert.equal(error,null);assert.equal(data.length,4)
assert.equal(data.reduce((n,d)=>n+Number(d.capacity),0),4096)
const privateRead=await client.from('residents').select('owner_id').limit(1)
assert.ok(privateRead.error,'Los propietarios nunca deben ser legibles anónimamente')
const reserve=await client.rpc('reserve_parcel',{p_nick:'prueba_no_autorizada',p_avatar:0})
assert.ok(reserve.error,'Un visitante no puede reservar')
console.log('Supabase remoto: cuatro barrios, 4096 plazas, propietarios privados y reserva anónima denegada.')
