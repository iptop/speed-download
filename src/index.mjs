import { SpeedDownLoad } from './lib/SpeedDownLoad.mjs'

const sd = new SpeedDownLoad({
  targetUrl: ''
})
await sd.start()
