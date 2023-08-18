import https from 'https'
import dns from 'dns'
import net from 'net'

export function getAgent (localAddress) {
  const httpsAgent = new https.Agent({})
  httpsAgent.originalCreateConnection = httpsAgent.createConnection
  httpsAgent.createConnection = (options, cb) => {
    options.lookup = async (hostname, opt, callback) => {
      dns.resolve(hostname, (err, addresses) => {
        const address = addresses[parseInt(Math.random() * addresses.length)]
        // console.log(address)
        if (err) {
          return callback(err)
        }

        const family = net.isIP(address)
        return callback(err, address, family)
      })
    }

    options.localAddress = localAddress
    const socket = httpsAgent.originalCreateConnection(options, cb)
    return socket
  }

  return httpsAgent
}
