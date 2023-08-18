import cliProgress from 'cli-progress'
export class SpeedManagement {
  total = 0
  current = 0
  newCurrent = 0
  updateTime = 0
  isEnd = false
  bar = null
  constructor ({ total }) {
    this.total = total
    this.bar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
  }
  updateCurrent (newCurrent) {
    this.newCurrent = newCurrent
    this.updateSpeed()
  }
  updateSpeed () {

    let currentTime = (new Date()).getTime()
    let detTime = currentTime - this.updateTime
    if(detTime< 1000){
      return
    }

    let det = this.newCurrent - this.current

    let speed = parseFloat(((det / detTime * 1000) / (1024 * 1024)).toFixed(2))

    //console.log(speed)

    this.updateTime = currentTime
    this.current = this.newCurrent
    this.bar.update(this.current);

  }
  timer (){
    if(this.isEnd){
      return
    }
    this.updateSpeed()
    setTimeout(()=>this.timer(),2000)
  }
  start () {
    this.updateTime = (new Date()).getTime()
    this.timer()
    this.bar.start(this.total, 0);
  }
  end () {
    this.isEnd = true
    this.bar.stop()
  }
}
