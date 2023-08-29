import axios, { isAxiosError } from 'axios'
import os from 'os'
import fs from 'fs/promises'
import { getAgent } from './agent.mjs'
import { SpeedManagement } from './SpeedManagement.mjs'
export class SpeedDownLoad {
  targetUrl = ''
  fileName = ''
  contentLength = 0
  completedLength = 0
  chunkSize = 1024 * 1024 * 4
  taskList = []
  saveFileHand = null
  threadNum = 50
  localAddressQueueLength = new Map()
  speedManagement = null
  constructor ({ targetUrl, fileName }) {
    this.targetUrl = targetUrl
    this.fileName = fileName
  }

  async initSaveFile () {
    this.saveFileHand = await fs.open(this.fileName, 'w+')
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
          this.localAddressQueueLength.delete(localAddress)
        }
        if (code == 'ENETUNREACH') {
          this.localAddressQueueLength.delete(localAddress)
        }
        // console.log(code)
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
    const networkInterfaces = os.networkInterfaces()
    for (const interfaceName in networkInterfaces) {
      const interfaceDetails = networkInterfaces[interfaceName]
      for (const detail of interfaceDetails) {
        if (detail.family === 'IPv6') {
          continue
        }
        if (detail.address == '127.0.0.1') {
          continue
        }
        this.localAddressQueueLength.set(detail.address, 0)
      }
    }
  }

  async downThread () {
    while (this.taskList.length > 0) {
      const task = this.taskList.shift()
      const [startByte, endByte] = task
      const [err, data] = await this.getChunk(startByte, endByte)
      if (!err) {
        this.taskList.push(task)
        continue
      }
      this.completedLength += data.length
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
