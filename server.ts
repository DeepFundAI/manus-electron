import { createServer } from 'http'
import { parse } from 'url'
import next from 'next'
import path from 'path'

const port = process.env.PORT || 5173

const app = next({ dev: false, dir: path.join(__dirname) })
const handle = app.getRequestHandler()
 
app.prepare().then(() => {
  createServer((req, res) => {
    const parsedUrl = parse(req.url!, true)
    handle(req, res, parsedUrl)
  }).listen(port)
 
  console.log(
      `> Server listening at http://localhost:${port} as production`
  )
})