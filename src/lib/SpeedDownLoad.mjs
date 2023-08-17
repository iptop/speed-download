import axios from 'axios'
import fs from 'fs/promises'
export class SpeedDownLoad {
  targetUrl = ''
  contentLength = 0
  chunkSize = 1024 * 1024
  taskList = []
  saveFileHand = null
  threadNum = 10
  constructor ({ targetUrl }) {
    this.targetUrl = targetUrl
  }

  async initSaveFile (){
    this.saveFileHand = await fs.open('1.mp4','w+')
  }

  async getLen () {
    const { status, headers } = await axios.head(this.targetUrl , { validateStatus: () => true})
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

  async getChunk (startByte, endByte) {
    const headers = {
      Range: `bytes=${startByte}-${endByte}`
    }
    const { status, data } = await axios.get(this.targetUrl, { headers, responseType: 'arraybuffer' ,  validateStatus: () => true,})
    if (status != 206) {
      return [false]
    }
    if (data.length != endByte - startByte + 1) {
      return [false]
    }
    return [true, data]
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

  async downThread () {
    while (this.taskList.length>0){
      let task = this.taskList.shift()
      let [startByte, endByte] = task
      let [err, data] =  await this.getChunk(startByte, endByte)
      if(!err){
        console.log('分片下载错误')
        break
      }
      console.log('写入文件');
      await this.saveFileHand.write(data , 0 , data.length ,startByte)
    }
  }

  async runDownThread () {
    let threadList = []
    for (let i =0;i<this.threadNum;i++){
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
    await this.initSaveFile()
    await this.runDownThread()
    console.log('end')
    /*for (const [startByte, endByte] of this.taskList) {
      let [err, data] =  await this.getChunk(startByte, endByte)
      if(!err){
        break
      }
      console.log('写入文件');
      await this.saveFileHand.write(data , 0 , data.length ,startByte)
    }*/


  }
}
