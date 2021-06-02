export function getMimeType(url: string){
  return new Promise((resolve, reject)=>{
    const xhttp = new XMLHttpRequest()
    xhttp.timeout = 5000
    xhttp.open('GET', url)
    xhttp.onreadystatechange = function () {
      if (this.readyState === this.LOADING) {
        const type = this.getResponseHeader("Content-Type")
        this.abort()
        resolve(type)
      }
    }
    xhttp.send()
  })
}
