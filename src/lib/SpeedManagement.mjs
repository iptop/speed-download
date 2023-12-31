import cliProgress from 'cli-progress'
export class SpeedManagement {
  total = 0
  current = 0
  startTime = 0
  isEnd = false
  bar = null
  constructor ({ total }) {
    this.total = total
    this.bar = new cliProgress.SingleBar({ format: '{bar} | {percentage}% | Speed: {speed} | Eta:{eta}' }, cliProgress.Presets.shades_classic)
  }

  updateCurrent (newCurrent) {
    this.current = newCurrent
    this.updateSpeed()
  }

  updateSpeed () {
    const currentTime = (new Date()).getTime()
    const detTime = currentTime - this.startTime
    const det = this.current
    const speed = parseFloat(((det / detTime * 1000) / (1024 * 1024)).toFixed(2))
    this.bar.update(this.current, {
      speed: `${speed}MB/S`
    })
  }

  timer () {
    if (this.isEnd) {
      return
    }
    this.updateSpeed()
    setTimeout(() => this.timer(), 50)
  }

  start () {
    this.startTime = (new Date()).getTime()
    this.timer()
    this.bar.start(this.total, 0, { speed: 0 })
  }

  end () {
    this.isEnd = true
    this.bar.stop()
  }
}
