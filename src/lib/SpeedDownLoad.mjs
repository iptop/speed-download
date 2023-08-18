import axios, { isAxiosError } from 'axios'
import fs from 'fs/promises'
import { getAgent } from './agent.mjs'
import { SpeedManagement } from './SpeedManagement.mjs'
export class SpeedDownLoad {
  targetUrl = ''
  contentLength = 0
  completedLength = 0
  chunkSize = 1024 * 1024 * 4
  taskList = []
  saveFileHand = null
  threadNum = 50
  localAddressQueueLength = new Map()
  speedManagement = null
  constructor ({ targetUrl }) {
    this.targetUrl = targetUrl
  }

  async initSaveFile () {
    this.saveFileHand = await fs.open('1.mp4', 'w+')
  }

  async getLen () {
    const { status, headers } = await axios.head(this.targetUrl, { validateStatus: () => true })
    if (status != 200) {
      return false
    }
    const contentLength = parseInt(headers['content-length'])
    if (!(contentLength > 0)) {
      return false
    }
    this.contentLength = contentLength
    return true
  }

  getLocalAddress () {
    const array = Array.from(this.localAddressQueueLength)
    array.sort((a, b) => a[1] - b[1])
    return array[0][0]
  }

  async getChunk (startByte, endByte) {
    const localAddress = this.getLocalAddress()
    const laq = this.localAddressQueueLength
    laq.set(localAddress, laq.get(localAddress) + 1)
    const httpsAgent = getAgent(localAddress)

    const headers = {
      Range: `bytes=${startByte}-${endByte}`
    }

    try {
      const { status, data } = await axios.get(this.targetUrl, { httpsAgent, headers, responseType: 'arraybuffer', validateStatus: () => true })

      if (status != 206) {
        return [false]
      }
      if (data.length != endByte - startByte + 1) {
        return [false]
      }
      return [true, data]
    } catch (e) {
      if (isAxiosError(e)) {
        const code = e?.code
        if (code == 'EADDRNOTAVAIL') {
          console.log(code)
        }
        console.log(code)
      }
      return [false]
    } finally {
      laq.set(localAddress, laq.get(localAddress) - 1)
    }
  }

  initTaskList () {
    let startByte = 0
    let endByte = 0
    while (endByte + 1 < this.contentLength) {
      endByte = startByte + this.chunkSize - 1
      if (endByte > this.contentLength - 1) {
        endByte = this.contentLength - 1
      }
      const task = [startByte, endByte]
      this.taskList.push(task)
      startByte += this.chunkSize
    }
  }

  initLocalAddressQueue () {
    const arr = ['192.168.202.201', '192.168.202.202', '192.168.202.203', '192.168.202.204', '192.168.202.205', '192.168.202.206', '192.168.202.207', '192.168.202.208', '192.168.202.209',
      '192.168.202.95',
      '192.168.200.127']
    for (const item of arr) {
      this.localAddressQueueLength.set(item, 0)
    }
  }

  async downThread () {
    while (this.taskList.length > 0) {
      const task = this.taskList.shift()
      const [startByte, endByte] = task
      const [err, data] = await this.getChunk(startByte, endByte)
      if (!err) {
        console.log('分片下载错误')
        this.taskList.push(task)
        break
      }
      // console.log('写入文件');
      this.completedLength+= data.length
      this.speedManagement.updateCurrent(this.completedLength)
      await this.saveFileHand.write(data, 0, data.length, startByte)
    }
  }

  async runDownThread () {
    const threadList = []
    for (let i = 0; i < this.threadNum; i++) {
      threadList.push(this.downThread())
    }
    await Promise.all(threadList)
  }

  async start () {
    if (!await this.getLen()) {
      console.log('failed to get file size')
      return false
    }
    console.log('file size:', this.contentLength)
    this.initTaskList()
    this.initLocalAddressQueue()
    await this.initSaveFile()
    this.speedManagement = new SpeedManagement({ total: this.contentLength })
    this.speedManagement.start()
    await this.runDownThread()
    this.speedManagement.end()
    console.log('end')
  }
}
