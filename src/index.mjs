import { program } from 'commander'
import parse from 'url-parse'
import { SpeedDownLoad } from './lib/SpeedDownLoad.mjs'
import { resovleFileName } from './lib/tools.mjs'
async function main () {
  program
    .option('-O, --output <file>', 'Save the downloaded file to the specified filename')

  program.parse()

  const url = program.args[0]
  if (!url) {
    console.log('Please enter URL')
    return
  }

  const { protocol, pathname } = parse(url)

  if (!protocol.startsWith('http')) {
    console.log('URL error')
    return
  }

  const filename = resovleFileName(pathname, program.opts().output)

  const sd = new SpeedDownLoad({
    targetUrl: url,
    fileName: filename
  })
  await sd.start()
}

await main()
