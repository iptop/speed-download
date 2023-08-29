import { exec } from 'child_process';

function runBat(cmd) {
    return new Promise((resovle,reject)=>{
        exec(cmd, (error, stdout, stderr) => {
            console.log(error)
            if(error){
                return resovle(error)
            }
            if(stderr){
                return  resovle(stderr)
            }
            return resovle()
        });
    })
}

let interfaceName = '以太网'

await runBat(`netsh interface ip set dns name="${interfaceName}" static 114.114.114.114`)
await runBat(`netsh interface ip add dns name="${interfaceName}" static 8.8.8.8`)

for (let i=200;i<=250;i++){
    await runBat(`netsh interface ip add address name="${interfaceName}" 192.168.202.${i} 255.255.252.0 gateway=192.168.200.1`)
}

