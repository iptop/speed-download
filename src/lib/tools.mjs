import path from 'path'
export function resovleFileName (pathname, output) {
    if(output){
        return output
    }

    let fileName = path.basename(pathname)
    if(fileName){
        return fileName
    }

    return (new Date()).getTime

}