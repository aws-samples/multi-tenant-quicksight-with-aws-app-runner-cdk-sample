import * as express from 'express'
import { IpFilter } from 'express-ipfilter'

const app = express()

app.get('/status', (req, res) => {
  res.status(200).send('ok')
})

const ips = process.env.ALLOW_IP_RANGE as string
app.use(IpFilter([ips], { mode: 'allow', trustProxy: true }))
app.use(express.json())
app.use(express.static('public'))

const namespace = require('./controller/namespace')
const user = require('./controller/user')
const dashboard = require('./controller/dashboard')

app.param(['namespaceId', 'userId'], (req, res, next, id) => {
  if (/^[a-zA-Z0-9._-]+$/.test(id)) {
    next()
  } else {
    next(new Error('invalid arguments'))
  }
})

app.get('/namespaces', namespace.listNamespaces)
app.post('/namespaces', namespace.addNamespace)
app.delete('/namespaces/:namespaceId', namespace.deleteNamespace)

app.get('/namespaces/:namespaceId/users', user.listUsers)
app.post('/namespaces/:namespaceId/users', user.addUser)
app.delete('/namespaces/:namespaceId/users/:userId', user.deleteUser)

app.get('/namespaces/:namespaceId/users/:userId/dashboard', dashboard.embedUrl)

app.listen(8080)
