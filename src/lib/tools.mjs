import path from 'path'
export function resovleFileName (pathname, output) {
  if (output) {
    return output
  }

  const fileName = path.basename(pathname)
  if (fileName) {
    return fileName
  }

  return (new Date()).getTime
}

export function excludeNetworkInterfaces (interfaceName) {
  const excludeList = ['ZeroTier', 'VirtualBox']
  for (const item of excludeList) {
    if (interfaceName.indexOf(item) != -1) {
      return true
    }
  }
  return false
}
